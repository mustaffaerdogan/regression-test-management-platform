import { Buffer } from 'buffer';

const SYSTEM_PROMPT = `
You are a senior QA analyst. Check the provided Jira task description and title.
Extract or infer the User Story and Acceptance Criteria.
Return ONLY strict JSON with the following format:
{
  "userStory": "string",
  "acceptanceCriteria": ["string", "string"]
}
If you cannot find a user story, provide a general summary of the task based on its title and description.
If you cannot find acceptance criteria, return an empty array or extract any logical constraints as criteria.
Output must be strictly JSON, no markdown formatting outside of JSON.
`;

const extractJson = (raw: string): string => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('LLM response is not valid JSON');
  }
  return raw.slice(start, end + 1);
};

export const fetchAndExtractJiraData = async (jiraUrl: string) => {
  let urlObj: URL;
  try {
    urlObj = new URL(jiraUrl);
  } catch (e) {
    throw new Error('Invalid Jira URL format');
  }

  const baseUrl = urlObj.origin;
  const pathParts = urlObj.pathname.split('/');
  const issueKeyIndex = pathParts.findIndex((p) => p === 'browse');
  let issueKey = '';
  
  if (issueKeyIndex !== -1 && pathParts.length > issueKeyIndex + 1) {
    issueKey = pathParts[issueKeyIndex + 1] || '';
  } else {
    const match = jiraUrl.match(/([A-Z]+-\d+)/i);
    if (match) {
      issueKey = match[1] || '';
    } else {
      throw new Error('Invalid Jira URL format. Could not extract issue key.');
    }
  }

  const email = process.env.JIRA_EMAIL || '';
  const apiToken = process.env.JIRA_API_TOKEN || '';

  const apiUrl = `${baseUrl}/rest/api/2/issue/${issueKey}`;
  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };

  if (email && apiToken) {
    headers['Authorization'] = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;
  }

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
     if (response.status === 401 || response.status === 403) {
        throw new Error('Jira authentication failed or task is private. Please configure JIRA_EMAIL and JIRA_API_TOKEN in .env');
     }
     if (response.status === 404) {
        throw new Error('Jira task not found. Make sure the link is correct.');
     }
     throw new Error(`Failed to fetch from Jira: ${response.statusText}`);
  }

  const issueData = await response.json() as { fields?: { description?: string; summary?: string } };
  const description = issueData.fields?.description ?? '';
  const summary = issueData.fields?.summary ?? '';

  const fullText = `Title: ${summary}\n\nDescription:\n${description}`;

  // Parse using OpenAI
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const openAiBaseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  const payload = {
    model,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: fullText }
    ]
  };

  let openAiResponse;
  try {
    openAiResponse = await fetch(`${openAiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw new Error('Failed to connect to OpenAI API');
  }

  if (!openAiResponse.ok) {
    throw new Error('Failed to extract data using OpenAI');
  }

  const openAiData = await openAiResponse.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = openAiData.choices?.[0]?.message?.content ?? '';
  
  let parsed: { userStory?: string; acceptanceCriteria?: string[] } = {};
  try {
    parsed = JSON.parse(extractJson(content));
  } catch (e) {
    throw new Error('Failed to parse AI response into JSON');
  }

  return {
    userStory: parsed.userStory ?? '',
    acceptanceCriteria: parsed.acceptanceCriteria ?? [],
  };
};
