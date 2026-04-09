import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { generateAICases, extractJiraDataFromApi } from '../../api/aiCases';
import type { AIRegressionSetSuggestion } from '../../types/aiCases';
import type { RegressionPlatform } from '../../types/regression';
import { createRegressionSet, createTestCase } from '../../api/regressionSets';
import { useTeams } from '../../context/TeamContext';

const parseAcceptanceCriteria = (value: string): string[] =>
  value
    .split('\n')
    .map((line) => line.replace(/^\s*[-*\d.)]+\s*/, '').trim())
    .filter((line) => line.length > 0);

export const AICasesPage = () => {
  const navigate = useNavigate();
  const { teams } = useTeams();
  const [userStory, setUserStory] = useState('');
  const [criteriaText, setCriteriaText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [jiraUrl, setJiraUrl] = useState('');
  const [extractingJira, setExtractingJira] = useState(false);
  const [pendingJiraData, setPendingJiraData] = useState<{ userStory: string, acceptanceCriteria: string[] } | null>(null);

  const [results, setResults] = useState<AIRegressionSetSuggestion[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [setName, setSetName] = useState('');
  const [setDescription, setSetDescription] = useState('');
  const [setPlatform, setSetPlatform] = useState<RegressionPlatform>('Web');
  const [teamId, setTeamId] = useState('');
  const [savingSet, setSavingSet] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const criteriaCount = useMemo(() => parseAcceptanceCriteria(criteriaText).length, [criteriaText]);
  const generatedCases = useMemo(() => results[0]?.testCases ?? [], [results]);
  const selectedCases = useMemo(
    () => generatedCases.filter((item) => selectedCaseIds.includes(item.testCaseId)),
    [generatedCases, selectedCaseIds],
  );

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const acceptanceCriteria = parseAcceptanceCriteria(criteriaText);
    if (userStory.trim().length < 10) {
      setError('User story must be at least 10 characters.');
      return;
    }
    if (acceptanceCriteria.length === 0) {
      setError('Add at least one acceptance criteria line.');
      return;
    }

    setLoading(true);
    try {
      const response = await generateAICases({
        userStory: userStory.trim(),
        acceptanceCriteria,
      });
      const nextResults = response.data?.regressionSets ?? [];
      setResults(nextResults);
      setAccepted(false);
      setSuccessMessage(null);
      const firstSet = nextResults[0];
      const nextCases = firstSet?.testCases ?? [];
      setSelectedCaseIds(nextCases.map((item) => item.testCaseId));
      setSetName(firstSet?.name ?? '');
      setSetDescription(firstSet?.description ?? '');
      setSetPlatform((firstSet?.platform as RegressionPlatform | undefined) ?? 'Web');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI cases');
    } finally {
      setLoading(false);
    }
  };

  const handleJiraExtract = async () => {
    if (!jiraUrl.trim()) {
      setError('Lütfen bir Jira linki girin.');
      return;
    }
    setExtractingJira(true);
    setError(null);
    try {
      const resp = await extractJiraDataFromApi(jiraUrl.trim());
      setPendingJiraData(resp.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Jira\'dan veri çekilemedi.');
    } finally {
      setExtractingJira(false);
    }
  };

  const confirmJiraData = () => {
    if (pendingJiraData) {
      if (pendingJiraData.userStory) {
        setUserStory(pendingJiraData.userStory);
      }
      if (pendingJiraData.acceptanceCriteria && pendingJiraData.acceptanceCriteria.length > 0) {
        setCriteriaText(pendingJiraData.acceptanceCriteria.join('\n'));
      }
      setPendingJiraData(null);
      setJiraUrl('');
    }
  };

  const toggleCaseSelection = (testCaseId: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(testCaseId) ? prev.filter((id) => id !== testCaseId) : [...prev, testCaseId],
    );
  };

  const handleAcceptCases = () => {
    if (selectedCaseIds.length === 0) {
      setError('En az bir test case seçmelisiniz.');
      return;
    }
    setAccepted(true);
    setError(null);
  };

  const handleCreateRegressionSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setName.trim()) {
      setError('Regression set adı zorunludur.');
      return;
    }
    if (selectedCases.length === 0) {
      setError('En az bir test case seçmelisiniz.');
      return;
    }

    setSavingSet(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const setResponse = await createRegressionSet({
        name: setName.trim(),
        description: setDescription.trim() || undefined,
        platform: setPlatform,
        teamId: teamId || undefined,
      });
      const createdSetId = setResponse.data?._id;
      if (!createdSetId) {
        throw new Error('Regression set created but id is missing');
      }

      for (const tc of selectedCases) {
        await createTestCase(createdSetId, {
          testCaseId: tc.testCaseId,
          userType: tc.userType,
          platform: tc.platform,
          module: tc.module,
          testScenario: tc.testScenario,
          testCase: tc.testCase,
          preConditions: tc.preConditions,
          testData: tc.testData,
          testStep: tc.testStep,
          expectedResult: tc.expectedResult,
          actualResults: '',
          status: 'Not Executed',
        });
      }

      setSuccessMessage(
        `"${setName.trim()}" oluşturuldu ve ${selectedCases.length} test case sete eklendi.`,
      );
      navigate(`/regression-sets/${createdSetId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regression set oluşturulamadı');
    } finally {
      setSavingSet(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Cases</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Provide a user story and acceptance criteria, then generate suggested regression sets.
        </p>
      </div>

      <form
        onSubmit={handleGenerate}
        className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-4"
      >
        <div className="border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-lg space-y-3 mb-6">
          <h2 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">
            Jira Linki ile Otomatik Doldur
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={jiraUrl}
              onChange={(e) => setJiraUrl(e.target.value)}
              placeholder="https://yourdomain.atlassian.net/browse/PROJ-123"
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button
              type="button"
              variant="secondary"
              loading={extractingJira}
              onClick={handleJiraExtract}
            >
              Jira'dan Çek
            </Button>
          </div>
          
          {pendingJiraData && (
            <div className="mt-4 p-4 border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 rounded-md">
              <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Çekilen Verileri Onaylıyor musunuz?</h3>
              <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <strong className="block text-gray-900 dark:text-white">User Story:</strong>
                  <p className="mt-1 bg-gray-50 dark:bg-gray-900 p-2 rounded">{pendingJiraData.userStory || <span className="text-gray-400 italic">Bulunamadı</span>}</p>
                </div>
                <div>
                  <strong className="block text-gray-900 dark:text-white">Acceptance Criteria:</strong>
                  {pendingJiraData.acceptanceCriteria && pendingJiraData.acceptanceCriteria.length > 0 ? (
                    <ul className="list-disc list-inside mt-1 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                      {pendingJiraData.acceptanceCriteria.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-1 bg-gray-50 dark:bg-gray-900 p-2 rounded"><span className="text-gray-400 italic">Bulunamadı</span></p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <Button type="button" variant="secondary" onClick={() => setPendingJiraData(null)}>
                  İptal
                </Button>
                <Button type="button" variant="primary" onClick={confirmJiraData}>
                  Onayla ve Forma Aktar
                </Button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            User Story
          </label>
          <textarea
            value={userStory}
            onChange={(e) => setUserStory(e.target.value)}
            rows={4}
            placeholder="As a customer, I want to reset my password so that I can recover access..."
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Acceptance Criteria (one per line)
          </label>
          <textarea
            value={criteriaText}
            onChange={(e) => setCriteriaText(e.target.value)}
            rows={8}
            placeholder={'User receives reset email\nReset link expires after 15 minutes\nInvalid token returns error'}
            className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Parsed criteria: {criteriaCount}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" className="px-4 py-2 rounded-full" loading={loading}>
            Generate Regression Sets
          </Button>
        </div>
      </form>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Generated Suggestions</h2>
        {results.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">No suggestions yet.</p>
        ) : (
          results.map((set, idx) => (
            <div
              key={`${set.name}-${idx}`}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{set.name}</h3>
                <span className="text-xs rounded-full px-2 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                  {set.platform}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{set.description}</p>

              <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/60">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                        Select
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">ID</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Module</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Scenario</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Expected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                    {set.testCases.map((tc, tcIdx) => (
                      <tr key={`${tc.testCaseId}-${tcIdx}`}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedCaseIds.includes(tc.testCaseId)}
                            onChange={() => toggleCaseSelection(tc.testCaseId)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-900 dark:text-gray-100">{tc.testCaseId}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-200">{tc.module}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{tc.testScenario}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{tc.expectedResult}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>

      {results.length > 0 && (
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Seçili test case: <span className="font-semibold">{selectedCaseIds.length}</span>
            </p>
            <Button type="button" variant="secondary" onClick={handleAcceptCases}>
              Test Caseleri Kabul Et
            </Button>
          </div>

          {accepted && (
            <form onSubmit={handleCreateRegressionSet} className="space-y-4 border-t border-gray-200 dark:border-gray-800 pt-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Regression Set Oluştur
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Set Name
                  </label>
                  <input
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Örn: Password Recovery Regression"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Platform
                  </label>
                  <select
                    value={setPlatform}
                    onChange={(e) => setSetPlatform(e.target.value as RegressionPlatform)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Web">Web</option>
                    <option value="iOS">iOS</option>
                    <option value="Android">Android</option>
                    <option value="TV">TV</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={setDescription}
                  onChange={(e) => setSetDescription(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Team (optional)
                </label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full md:w-80 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Personal (only me)</option>
                  {teams.map((team) => (
                    <option key={team._id} value={team._id}>
                      Team: {team.name}
                    </option>
                  ))}
                </select>
              </div>

              {successMessage && (
                <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-200">
                  {successMessage}
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" className="px-4 py-2 rounded-full" loading={savingSet}>
                  Regression Set Oluştur
                </Button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
};

