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

export const getJiraAuthHeaders = () => {
  const email = process.env.JIRA_EMAIL || '';
  const apiToken = process.env.JIRA_API_TOKEN || '';
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  if (email && apiToken) {
    headers['Authorization'] = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;
  }
  return headers;
};

export const getJiraBaseUrl = (jiraUrl?: string) => {
  if (jiraUrl) {
    try {
      const urlObj = new URL(jiraUrl);
      return urlObj.origin;
    } catch (e) {
      // ignore
    }
  }
  return process.env.JIRA_BASE_URL || '';
};

export const fetchAndExtractJiraData = async (jiraUrl: string) => {
  const baseUrl = getJiraBaseUrl(jiraUrl);
  const urlObj = new URL(jiraUrl);
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

  const apiUrl = `${baseUrl}/rest/api/2/issue/${issueKey}`;
  const headers = getJiraAuthHeaders();

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

export const createJiraIssue = async (params: {
  projectKey: string;
  summary: string;
  description: string;
  assigneeId?: string | undefined;
  issueType?: string;
  priorityId?: string | undefined;
}) => {
  const baseUrl = getJiraBaseUrl();
  const email = process.env.JIRA_EMAIL;
  if (!baseUrl) throw new Error('JIRA_BASE_URL is not configured');

  let finalAssigneeId = params.assigneeId;

  // If no assigneeId provided, try to find the accountId for the JIRA_EMAIL
  if (!finalAssigneeId && email) {
    try {
      const searchUrl = `${baseUrl}/rest/api/2/user/search?query=${encodeURIComponent(email)}`;
      const searchRes = await fetch(searchUrl, { headers: getJiraAuthHeaders() });
      if (searchRes.ok) {
        const users = await searchRes.json() as Array<{ accountId: string; emailAddress?: string }>;
        const found = users.find(u => u.emailAddress === email) || users[0];
        if (found) {
          finalAssigneeId = found.accountId;
        }
      }
    } catch (err) {
      console.error('Failed to resolve default assignee:', err);
    }
  }

  const apiUrl = `${baseUrl}/rest/api/2/issue`;
  const headers = getJiraAuthHeaders();

  const body = {
    fields: {
      project: {
        key: params.projectKey,
      },
      summary: params.summary,
      description: params.description,
      issuetype: {
        name: params.issueType || 'Task',
      },
      ...(finalAssigneeId ? { assignee: { accountId: finalAssigneeId } } : {}),
      ...(params.priorityId ? { priority: { id: params.priorityId } } : {}),
    },
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Jira Create Issue Error:', errorData);
    throw new Error(`Failed to create Jira issue: ${response.statusText}`);
  }

  const data = await response.json() as { key: string; id: string };
  return data;
};

export const addJiraComment = async (issueKey: string, comment: string) => {
  const baseUrl = getJiraBaseUrl();
  if (!baseUrl) throw new Error('JIRA_BASE_URL is not configured');

  const apiUrl = `${baseUrl}/rest/api/2/issue/${issueKey}/comment`;
  const headers = getJiraAuthHeaders();

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ body: comment }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Jira Add Comment Error:', errorData);
    throw new Error(`Failed to add comment to Jira issue: ${response.statusText}`);
  }

  return await response.json();
};

export const getJiraProjects = async () => {
  const baseUrl = getJiraBaseUrl();
  if (!baseUrl) throw new Error('JIRA_BASE_URL is not configured');

  const apiUrl = `${baseUrl}/rest/api/2/project`;
  const headers = getJiraAuthHeaders();

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch Jira projects: ${response.statusText}`);
  }

  return await response.json() as Array<{ key: string; name: string; id: string }>;
};

export const getJiraBoards = async (projectKey?: string) => {
  const baseUrl = getJiraBaseUrl();
  if (!baseUrl) throw new Error('JIRA_BASE_URL is not configured');

  let apiUrl = `${baseUrl}/rest/agile/1.0/board`;
  if (projectKey) {
    apiUrl += `?projectKeyOrId=${projectKey}`;
  }
  const headers = getJiraAuthHeaders();

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    // Falls back to empty if Agile API is not available
    console.error('Failed to fetch Jira boards:', response.statusText);
    return [];
  }

  const data = await response.json() as { values: Array<{ id: number; name: string; type: string }> };
  return data.values || [];
};

export const getJiraPriorities = async () => {
  const baseUrl = getJiraBaseUrl();
  if (!baseUrl) throw new Error('JIRA_BASE_URL is not configured');

  const apiUrl = `${baseUrl}/rest/api/2/priority`;
  const headers = getJiraAuthHeaders();

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch Jira priorities: ${response.statusText}`);
  }

  return await response.json() as Array<{ id: string; name: string }>;
};

export const getJiraUsers = async (projectKey: string) => {
  const baseUrl = getJiraBaseUrl();
  if (!baseUrl) throw new Error('JIRA_BASE_URL is not configured');

  // Search for assignable users in the project
  const apiUrl = `${baseUrl}/rest/api/2/user/assignable/search?project=${projectKey}`;
  const headers = getJiraAuthHeaders();

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch Jira users: ${response.statusText}`);
  }

  return await response.json() as Array<{ accountId: string; displayName: string; emailAddress?: string }>;
};

export const getJiraIssueTypes = async (projectKey: string) => {
  const baseUrl = getJiraBaseUrl();
  if (!baseUrl) throw new Error('JIRA_BASE_URL is not configured');

  const apiUrl = `${baseUrl}/rest/api/2/project/${projectKey}`;
  const headers = getJiraAuthHeaders();

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch Jira project details: ${response.statusText}`);
  }

  const data = await response.json() as { issueTypes: Array<{ id: string; name: string; subtask: boolean }> };
  return data.issueTypes || [];
};

export const getJiraStatuses = async (projectKey: string) => {
  const baseUrl = getJiraBaseUrl();
  if (!baseUrl) throw new Error('JIRA_BASE_URL is not configured');

  // Fetch statuses for the project
  const apiUrl = `${baseUrl}/rest/api/2/project/${projectKey}/statuses`;
  const headers = getJiraAuthHeaders();

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch Jira statuses: ${response.statusText}`);
  }

  const data = await response.json() as Array<{ 
    name: string; 
    statuses: Array<{ id: string; name: string }> 
  }>;
  
  // Flatten statuses from all issue types
  const allStatuses: Array<{ id: string; name: string }> = [];
  const addedIds = new Set<string>();
  
  data.forEach(type => {
    type.statuses.forEach(status => {
      if (!addedIds.has(status.id)) {
        allStatuses.push(status);
        addedIds.add(status.id);
      }
    });
  });
  
  return allStatuses;
};

export const transitionJiraIssue = async (issueKey: string, statusName: string) => {
  const baseUrl = getJiraBaseUrl();
  if (!baseUrl) throw new Error('JIRA_BASE_URL is not configured');

  const headers = getJiraAuthHeaders();

  // 1. Get available transitions for the issue
  const transitionsUrl = `${baseUrl}/rest/api/2/issue/${issueKey}/transitions`;
  const tResponse = await fetch(transitionsUrl, { headers });
  if (!tResponse.ok) return; // Silent fail if can't fetch transitions

  const tData = await tResponse.json() as { transitions: Array<{ id: string; name: string; to: { name: string } }> };
  
  // 2. Find transition that matches the target status name
  const transition = tData.transitions.find(t => 
    t.to.name.toLowerCase() === statusName.toLowerCase() || 
    t.name.toLowerCase() === statusName.toLowerCase()
  );

  if (transition) {
    // 3. Perform transition
    await fetch(transitionsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ transition: { id: transition.id } }),
    });
  }
};

/**
 * Search for Jira issues using JQL
 * Useful for finding existing tasks to link a regression run to
 */
export const searchJiraIssues = async (projectKey: string, status?: string): Promise<any[]> => {
  try {
    const baseUrl = process.env.JIRA_BASE_URL;
    const headers = getJiraAuthHeaders();
    
    let jql = `project = "${projectKey}"`;
    if (status) {
      jql += ` AND status = "${status}"`;
    }
    jql += ' ORDER BY created DESC';

    const url = `${baseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=50&fields=summary,status,issuetype,assignee`;
    
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jira Search Error:', errorText);
      throw new Error('Failed to search Jira issues');
    }

    const data = await response.json() as { issues: any[] };
    return data.issues || [];
  } catch (error: any) {
    console.error('Jira Search Exception:', error.message);
    throw error;
  }
};
export const getJiraComments = async (issueKey: string) => {
  const baseUrl = getJiraBaseUrl();
  if (!baseUrl) throw new Error('JIRA_BASE_URL is not configured');

  const apiUrl = `${baseUrl}/rest/api/2/issue/${issueKey}/comment`;
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: getJiraAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Jira Get Comments Error:', errorData);
    throw new Error(`Failed to fetch Jira comments: ${response.statusText}`);
  }

  return response.json();
};
