import { useState, useMemo } from 'react';
import { Globe, FileCode, CheckCircle2, ExternalLink, Zap, Type, Info, Play, XCircle, AlertCircle, MinusCircle, Loader2, Eye } from 'lucide-react';
import * as Accordion from '@radix-ui/react-accordion';
import { Button } from '../../components/Button';
import { generateAICases, extractJiraDataFromApi, crawlUrl, runAICasesOnUrl } from '../../api/aiCases';
import type { AIRunTestsOutput, AITestRunResult } from '../../api/aiCases';
import type { AIRegressionSetSuggestion } from '../../types/aiCases';
import type { RegressionPlatform } from '../../types/regression';
import { createRegressionSet, createTestCase } from '../../api/regressionSets';
import { useTeams } from '../../context/TeamContext';
import { useNavigate } from 'react-router-dom';

interface ElementCount { forms: number; inputs: number; buttons: number; links: number; selects: number; }

export const AICasesPage = () => {
  const navigate = useNavigate();
  const { teams } = useTeams();
  // Tabs: url, html, text (legacy User Story)
  const [activeTab, setActiveTab] = useState<'url' | 'html' | 'text'>('text');
  
  // URL Tab States
  const [url, setUrl] = useState('');
  const [cookies, setCookies] = useState('');

  // HTML Tab States
  const [htmlContent, setHtmlContent] = useState('');

  // TEXT Tab States (Legacy User Story)
  const [userStory, setUserStory] = useState('');
  const [criteriaText, setCriteriaText] = useState('');
  const [jiraUrl, setJiraUrl] = useState('');
  const [extractingJira, setExtractingJira] = useState(false);
  const [pendingJiraData, setPendingJiraData] = useState<{ userStory: string, acceptanceCriteria: string[] } | null>(null);
  
  // Processing States
  const [loadingStep, setLoadingStep] = useState<0 | 1 | 2>(0); // 0: Idle, 1: Process/Crawl, 2: Analysing
  const [, setCrawledStats] = useState<ElementCount | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Result States
  const [resultMode, setResultMode] = useState<'crawl' | 'text' | null>(null);
  
  // Crawl Results
  const [crawlResult, setCrawlResult] = useState<any | null>(null);
  const [selectedCrawlIds, setSelectedCrawlIds] = useState<string[]>([]);

  // Auto-run (Playwright) state
  const [testRunning, setTestRunning] = useState(false);
  const [testRunResults, setTestRunResults] = useState<AIRunTestsOutput | null>(null);
  const [testRunError, setTestRunError] = useState<string | null>(null);
  const [headedMode, setHeadedMode] = useState(false);

  // Text Results
  const [textResults, setTextResults] = useState<AIRegressionSetSuggestion[]>([]);
  const [selectedTextIds, setSelectedTextIds] = useState<string[]>([]);
  const [textAccepted, setTextAccepted] = useState(false);
  
  // Save Regression Set Form (Shared or for Text mainly initially, but applied to both)
  const [setName, setSetName] = useState('');
  const [setDescription, setSetDescription] = useState('');
  const [setPlatform, setSetPlatform] = useState<RegressionPlatform>('Web');
  const [teamId, setTeamId] = useState('');
  const [savingSet, setSavingSet] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const parseAcceptanceCriteria = (value: string): string[] =>
    value.split('\n').map((line) => line.replace(/^\s*[-*\d.)]+\s*/, '').trim()).filter((line) => line.length > 0);
  
  const criteriaCount = useMemo(() => parseAcceptanceCriteria(criteriaText).length, [criteriaText]);

  // JIRA EXTRACT
  const handleJiraExtract = async () => {
    if (!jiraUrl.trim()) return setError('Lütfen bir Jira linki girin.');
    setExtractingJira(true);
    setError(null);
    try {
      const resp = await extractJiraDataFromApi(jiraUrl.trim());
      setPendingJiraData(resp.data ?? null);
    } catch (err: any) {
      setError(err.message || "Jira'dan veri çekilemedi.");
    } finally {
      setExtractingJira(false);
    }
  };

  const confirmJiraData = () => {
    if (pendingJiraData) {
      if (pendingJiraData.userStory) setUserStory(pendingJiraData.userStory);
      if (pendingJiraData.acceptanceCriteria && pendingJiraData.acceptanceCriteria.length > 0) {
        setCriteriaText(pendingJiraData.acceptanceCriteria.join('\n'));
      }
      setPendingJiraData(null);
      setJiraUrl('');
    }
  };

  // TEXT GENERATE (Legacy)
  const handleGenerateText = async () => {
    setError(null);
    const acceptanceCriteria = parseAcceptanceCriteria(criteriaText);
    if (userStory.trim().length < 10) return setError('User story must be at least 10 characters.');
    if (acceptanceCriteria.length === 0) return setError('Add at least one acceptance criteria line.');

    setLoadingStep(2);
    setResultMode(null);
    try {
      const response = await generateAICases({ userStory: userStory.trim(), acceptanceCriteria });
      const nextResults = response.data?.regressionSets ?? [];
      setTextResults(nextResults);
      setTextAccepted(false);
      setSuccessMessage(null);
      const firstSet = nextResults[0];
      const nextCases = firstSet?.testCases ?? [];
      setSelectedTextIds(nextCases.map((item) => item.testCaseId));
      setSetName(firstSet?.name ?? '');
      setSetDescription(firstSet?.description ?? '');
      setSetPlatform((firstSet?.platform as RegressionPlatform | undefined) ?? 'Web');
      setResultMode('text');
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI cases');
    } finally {
      setLoadingStep(0);
    }
  };

  // CRAWL GENERATE
  const handleCrawl = async () => {
    if (activeTab === 'url' && !url.trim()) return setError('Geçerli bir URL girin.');
    if (activeTab === 'html' && !htmlContent.trim()) return setError('Geçerli HTML girin.');
    
    setError(null);
    setLoadingStep(1);
    setResultMode(null);
    setTestRunResults(null);
    setTestRunError(null);

    let mockStatsInterval: any;
    if (activeTab === 'url') {
      mockStatsInterval = setInterval(() => {
        setCrawledStats({
          forms: Math.floor(Math.random() * 3),
          inputs: Math.floor(Math.random() * 15),
          buttons: Math.floor(Math.random() * 8),
          links: Math.floor(Math.random() * 40),
          selects: Math.floor(Math.random() * 2),
        });
      }, 500);
    }
    
    try {
      const payload = {
        url: activeTab === 'url' ? url : undefined,
        html: activeTab === 'html' ? htmlContent : undefined,
        cookies: cookies || undefined,
      };

      const data = await crawlUrl(payload);
      
      clearInterval(mockStatsInterval);
      setCrawlResult(data);
      setCrawledStats(data.detectedElements);
      setSelectedCrawlIds(data.testCases.map((tc: any) => tc.id));
      setResultMode('crawl');
      setSetName(data.pageTitle + ' Suite');
      setSetDescription(`Otomatik taranan adres: ${data.url}`);
    } catch (err: any) {
      clearInterval(mockStatsInterval);
      setError(err.message || 'Sayfa crawl edilemedi.');
    } finally {
       setLoadingStep(0);
    }
  };

  const handleAction = () => {
    if (activeTab === 'text') handleGenerateText();
    else handleCrawl();
  };

  // PLAYWRIGHT: Auto-run generated test cases
  const handleAutoRun = async () => {
    if (!crawlResult || !crawlResult.url || activeTab !== 'url') {
      setTestRunError('Otomatik koşum sadece URL ile crawl edilen sonuçlarda kullanılabilir.');
      return;
    }
    if (!crawlResult.testCases?.length) {
      setTestRunError('Çalıştırılacak test case yok.');
      return;
    }
    setTestRunError(null);
    setTestRunning(true);
    setTestRunResults(null);
    try {
      const output = await runAICasesOnUrl({
        url: crawlResult.url,
        headed: headedMode,
        testCases: crawlResult.testCases.map((tc: any) => ({
          id: tc.id,
          title: tc.title,
          preconditions: tc.preconditions ?? [],
          steps: tc.steps ?? [],
          expectedResults: tc.expectedResults ?? [],
        })),
      });
      setTestRunResults(output);
    } catch (err: any) {
      setTestRunError(err.message || 'Otomatik test koşumu başarısız oldu.');
    } finally {
      setTestRunning(false);
    }
  };

  const getRunResult = (testCaseId: string): AITestRunResult | undefined =>
    testRunResults?.results.find((r) => r.testCaseId === testCaseId);

  // Build "Actual Results" + status from a Playwright run result
  const buildActualResultsFromRun = (
    runResult: AITestRunResult | undefined,
  ): { actualResults: string; status: 'Pass' | 'Fail' | 'Not Executed' } => {
    if (!runResult) {
      return { actualResults: '', status: 'Not Executed' };
    }
    const lines: string[] = [];
    if (runResult.status === 'passed') {
      lines.push('Otomatik koşum sonucu: BAŞARILI');
    } else if (runResult.status === 'failed') {
      lines.push('Otomatik koşum sonucu: BAŞARISIZ');
      if (runResult.errorMessage) lines.push(`Hata: ${runResult.errorMessage}`);
    } else {
      lines.push('Otomatik koşum sonucu: ATLANDI');
    }
    if (runResult.finalUrl) lines.push(`Son URL: ${runResult.finalUrl}`);
    lines.push(`Süre: ${(runResult.durationMs / 1000).toFixed(2)} sn`);
    if (runResult.stepResults?.length) {
      lines.push('Adımlar:');
      runResult.stepResults.forEach((sr, idx) => {
        const icon =
          sr.status === 'passed' ? '✓' : sr.status === 'failed' ? '✗' : '–';
        const errPart = sr.status === 'failed' && sr.error ? ` (${sr.error})` : '';
        lines.push(`  ${idx + 1}. ${icon} ${sr.step}${errPart}`);
      });
    }
    const status: 'Pass' | 'Fail' | 'Not Executed' =
      runResult.status === 'passed'
        ? 'Pass'
        : runResult.status === 'failed'
        ? 'Fail'
        : 'Not Executed';
    return { actualResults: lines.join('\n'), status };
  };

  // SAVE RESULTS
  const handleCreateRegressionSetText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setName.trim()) return setError('Regression set adı zorunludur.');

    // gather selected
    let casesToSave: any[] = [];
    if (resultMode === 'text') {
      const allTextCases = textResults.flatMap(r => r.testCases);
      casesToSave = allTextCases
        .filter(tc => selectedTextIds.includes(tc.testCaseId))
        .map((tc) => ({ ...tc, actualResults: '', status: 'Not Executed' as const }));
    } else if (resultMode === 'crawl') {
      casesToSave = crawlResult.testCases
        .filter((tc: any) => selectedCrawlIds.includes(tc.id))
        .map((tc: any) => {
          const runResult = getRunResult(tc.id);
          const { actualResults, status } = buildActualResultsFromRun(runResult);
          return {
            testCaseId: tc.id,
            userType: 'End User',
            platform: setPlatform,
            module: 'Crawler AI',
            testScenario: tc.title,
            testCase: tc.title,
            preConditions: tc.preconditions.join('. '),
            testData: '-',
            testStep: tc.steps.join('\n'),
            expectedResult: tc.expectedResults.join('. '),
            actualResults,
            status,
          };
        });
    }

    if (casesToSave.length === 0) return setError('En az bir test case seçmelisiniz.');

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
      if (!createdSetId) throw new Error('Regression set created but id is missing');

      for (const tc of casesToSave) {
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
          actualResults: tc.actualResults ?? '',
          status: tc.status ?? 'Not Executed',
        });
      }

      setSuccessMessage(`"${setName.trim()}" oluşturuldu ve ${casesToSave.length} case eklendi.`);
      setTimeout(() => navigate(`/regression-sets/${createdSetId}`), 1000);
    } catch (err: any) {
      setError(err.message || 'Set oluşturulamadı');
    } finally {
      setSavingSet(false);
    }
  };

  const toggleSelectAllCrawl = () => {
    if (crawlResult && selectedCrawlIds.length === crawlResult.testCases.length) setSelectedCrawlIds([]);
    else if (crawlResult) setSelectedCrawlIds(crawlResult.testCases.map((tc: any) => tc.id));
  };
  
  const toggleCaseSelectionText = (testCaseId: string) => {
    setSelectedTextIds((prev) => prev.includes(testCaseId) ? prev.filter((id) => id !== testCaseId) : [...prev, testCaseId]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      {/* Upper Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            AI Cases <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider">NEW</span>
          </h1>
          <p className="text-sm text-text-muted mt-1">User Story, URL veya HTML ile otomatik test senaryosu üret</p>
        </div>
        
        <div className="flex p-1 bg-surface border border-border rounded-lg shadow-sm">
          <button onClick={() => { setActiveTab('text'); setResultMode(null); setTextAccepted(false); }} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'text' ? 'bg-primary text-white shadow-soft' : 'text-text-secondary hover:text-text-primary'}`}>
            <Type className="w-4 h-4" /> Metin (Story)
          </button>
          <button onClick={() => { setActiveTab('url'); setResultMode(null); setTextAccepted(false); }} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'url' ? 'bg-primary text-white shadow-soft' : 'text-text-secondary hover:text-text-primary'}`}>
            <Globe className="w-4 h-4" /> URL Tarayıcı
          </button>
          <button onClick={() => { setActiveTab('html'); setResultMode(null); setTextAccepted(false); }} className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'html' ? 'bg-primary text-white shadow-soft' : 'text-text-secondary hover:text-text-primary'}`}>
            <FileCode className="w-4 h-4" /> HTML Yükle
          </button>
        </div>
      </div>

      {!resultMode && (
        <div className="glass rounded-xl p-6 md:p-8 shadow-soft border border-border transition-all">
          
          {loadingStep === 0 && (
            <div className="space-y-6">
              
              {/* TEXT TAB */}
              {activeTab === 'text' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="border border-indigo-100 dark:border-primary/20 bg-primary/5 p-4 rounded-lg space-y-3">
                    <h2 className="text-sm font-semibold text-primary">Jira Linki ile Otomatik Doldur</h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input type="text" value={jiraUrl} onChange={(e) => setJiraUrl(e.target.value)} placeholder="https://yourdomain.atlassian.net/browse/PROJ-123" className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" />
                      <Button variant="secondary" loading={extractingJira} onClick={handleJiraExtract}>Jira'dan Çek</Button>
                    </div>
                    {pendingJiraData && (
                      <div className="mt-4 p-4 border border-blue-200 dark:border-primary/30 bg-background rounded-md animate-fade-in">
                        <h3 className="text-sm font-semibold mb-2">Çekilen Verileri Onaylıyor musunuz?</h3>
                        <p className="text-sm italic text-text-muted mb-2">User Story: {pendingJiraData.userStory?.substring(0, 50)}...</p>
                        <div className="flex gap-2 justify-end">
                          <Button variant="secondary" onClick={() => setPendingJiraData(null)}>İptal</Button>
                          <Button variant="primary" onClick={confirmJiraData}>Onayla ve Aktar</Button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-text-primary mb-1">User Story</label>
                     <textarea value={userStory} onChange={(e) => setUserStory(e.target.value)} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="As a customer, I want to reset my password..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Acceptance Criteria (satır satır)</label>
                    <textarea value={criteriaText} onChange={(e) => setCriteriaText(e.target.value)} rows={5} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="User receives email..." />
                    <p className="mt-1 text-xs text-text-muted">Kriter sayısı: {criteriaCount}</p>
                  </div>
                </div>
              )}

              {/* URL TAB */}
              {activeTab === 'url' && (
                <div className="animate-fade-in space-y-6">
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-text-muted" />
                    <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://app.example.com/login" className="w-full pl-12 pr-6 py-4 bg-background border border-border rounded-xl text-lg focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-text-secondary">
                    <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p>
                      Sayfadaki form, arama kutusu, navigasyon ve CTA gibi farklı bileşenler otomatik tespit edilir.
                      Her tespit edilen özellik için <strong>tek bir düz (happy-path) test senaryosu</strong> üretilir.
                    </p>
                  </div>
                  <Accordion.Root type="single" collapsible className="mt-2 border border-border rounded-xl bg-background overflow-hidden">
                    <Accordion.Item value="item-1">
                      <Accordion.Header>
                        <Accordion.Trigger className="w-full px-6 py-4 flex justify-between text-sm font-medium hover:bg-surface outline-none">
                          Gelişmiş Seçenekler
                        </Accordion.Trigger>
                      </Accordion.Header>
                      <Accordion.Content className="p-6 bg-surface space-y-4 border-t border-border">
                        <div>
                          <label className="block text-sm font-medium mb-2">Cookies (Opsiyonel)</label>
                          <p className="text-xs text-text-muted mb-2">Oturum açılması gereken sayfaları taramak için, tarayıcıdan kopyaladığınız cookie header'ını buraya yapıştırın.</p>
                          <textarea value={cookies} onChange={(e) => setCookies(e.target.value)} placeholder="sessionId=abc123; userId=42" className="w-full h-20 p-3 text-sm font-mono bg-background border border-border rounded-lg outline-none" />
                        </div>
                      </Accordion.Content>
                    </Accordion.Item>
                  </Accordion.Root>
                </div>
              )}

              {/* HTML TAB */}
              {activeTab === 'html' && (
                <div className="animate-fade-in">
                  <textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} placeholder="<html lang='en'>...</html>" className="w-full h-48 p-4 font-mono text-xs bg-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary" />
                </div>
              )}

              {error && <div className="p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm">{error}</div>}

              <div className="flex justify-end">
                <Button onClick={handleAction} className="py-2 px-6 rounded-lg text-sm font-semibold shadow-soft h-10 w-40">
                  {activeTab === 'text' ? 'Senaryo Üret' : 'Analiz Et'}
                </Button>
              </div>
            </div>
          )}

          {/* Loading States */}
          {loadingStep > 0 && (
             <div className="py-12 flex flex-col items-center justify-center space-y-8 animate-fade-in">
               <div className="relative w-24 h-24">
                 <div className="absolute inset-0 rounded-full border-4 border-surface border-t-primary animate-spin" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    {loadingStep === 1 ? <Globe className="w-8 h-8 text-primary animate-pulse" /> : <Zap className="w-8 h-8 text-secondary animate-bounce" />}
                 </div>
               </div>
               
               <div className="text-center space-y-2">
                 <h3 className="text-xl font-semibold text-text-primary">
                   {loadingStep === 1 ? '🌐 Sayfa taranıyor...' : '🤖 AI senaryolar üretiyor...'}
                 </h3>
                 <p className="text-sm text-text-muted max-w-md mx-auto">
                   Lütfen bekleyin, bu işlem yapay zeka modeline bağlanıldığı için 10-30 saniye arası sürebilir.
                 </p>
               </div>
             </div>
          )}
        </div>
      )}


      {/* RESULT SCREENS */}

      {/* TEXT RESULT SCREEN (Legacy Format) */}
      {resultMode === 'text' && textResults.length > 0 && (
         <div className="space-y-6 animate-fade-in">
           {textResults.map((set, idx) => (
             <div key={`${set.name}-${idx}`} className="rounded-xl border border-border bg-surface p-4">
               <div className="flex items-center justify-between gap-3 mb-2">
                 <h3 className="text-base font-semibold">{set.name}</h3>
                 <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{set.platform}</span>
               </div>
               <p className="text-sm text-text-secondary mb-4">{set.description}</p>

               <div className="overflow-x-auto border border-border rounded-lg">
                 <table className="min-w-full divide-y divide-border text-sm">
                   <thead className="bg-background">
                     <tr>
                       <th className="px-3 py-2 text-left font-medium">Select</th>
                       <th className="px-3 py-2 text-left font-medium">ID</th>
                       <th className="px-3 py-2 text-left font-medium">Scenario</th>
                       <th className="px-3 py-2 text-left font-medium">Test Case</th>
                       <th className="px-3 py-2 text-left font-medium">Pre Conditions</th>
                       <th className="px-3 py-2 text-left font-medium">Test Step</th>
                       <th className="px-3 py-2 text-left font-medium">Expected Result</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border bg-surface">
                     {set.testCases.map((tc, tcIdx) => (
                       <tr key={`${tc.testCaseId}-${tcIdx}`}>
                         <td className="px-3 py-2">
                           <input type="checkbox" checked={selectedTextIds.includes(tc.testCaseId)} onChange={() => toggleCaseSelectionText(tc.testCaseId)} />
                         </td>
                         <td className="px-3 py-2 font-mono text-xs">{tc.testCaseId}</td>
                         <td className="px-3 py-2">{tc.testScenario}</td>
                         <td className="px-3 py-2 font-semibold">{tc.testCase}</td>
                         <td className="px-3 py-2">{tc.preConditions}</td>
                         <td className="px-3 py-2 whitespace-pre-wrap">{tc.testStep}</td>
                         <td className="px-3 py-2">{tc.expectedResult}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
           ))}
           <div className="flex justify-end">
             <Button variant="primary" onClick={() => setTextAccepted(true)}>Seçilileri Onayla</Button>
           </div>
         </div>
      )}


      {/* CRAWL RESULT SCREEN */}
      {resultMode === 'crawl' && crawlResult && (
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in items-start">
           
           <div className="lg:col-span-4 space-y-6">
             <div className="glass p-6 rounded-xl border border-border shadow-soft h-full">
               <div className="mb-6">
                 <h3 className="text-sm text-text-muted uppercase tracking-wider font-semibold mb-2">Sayfa Hedefi</h3>
                 <p className="text-text-primary text-sm font-medium border-l-2 border-primary pl-3 py-1 bg-primary/5 rounded-r">
                   {crawlResult.pageTitle}
                 </p>
                 <a href={crawlResult.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-2">
                   {crawlResult.url} <ExternalLink className="w-3 h-3" />
                 </a>
               </div>
               <div>
                 <h3 className="text-sm text-text-muted uppercase tracking-wider font-semibold mb-3">Sayfa Özeti</h3>
                 <p className="text-sm text-text-secondary italic">"{crawlResult.pageSummary}"</p>
               </div>
             </div>
           </div>

          <div className="lg:col-span-8 flex flex-col space-y-4">
            <div className="glass px-6 py-4 rounded-xl border border-border flex flex-wrap items-center justify-between gap-4 sticky top-20 z-10">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-5 h-5 flex flex-shrink-0 items-center justify-center border rounded transition-colors ${selectedCrawlIds.length === crawlResult.testCases.length ? 'bg-primary border-primary' : 'bg-background border-border hover:border-primary/50'}`}>
                  {selectedCrawlIds.length > 0 && selectedCrawlIds.length !== crawlResult.testCases.length && <div className="w-2.5 h-0.5 bg-primary rounded-full" />}
                  {selectedCrawlIds.length === crawlResult.testCases.length && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-sm font-medium">Tümünü Seç ({crawlResult.testCases.length} test)</span>
                <input type="checkbox" className="hidden" checked={selectedCrawlIds.length > 0} onChange={toggleSelectAllCrawl} />
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {activeTab === 'url' && (
                  <>
                    <label
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md border border-border cursor-pointer hover:border-primary/50 select-none"
                      title="Açık: Tarayıcı penceresi görünür şekilde açılır ve adımlar yavaşlatılır. Kapalı: Hızlı arka plan koşumu."
                    >
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={headedMode}
                        disabled={testRunning}
                        onChange={(e) => setHeadedMode(e.target.checked)}
                      />
                      <Eye className="w-3.5 h-3.5" /> Görsel Mod
                    </label>
                    <Button
                      variant="secondary"
                      onClick={handleAutoRun}
                      loading={testRunning}
                      className="flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      {testRunning ? 'Çalışıyor...' : 'Playwright ile Otomatik Çalıştır'}
                    </Button>
                  </>
                )}
                <Button onClick={() => setTextAccepted(true)}>Seçililerden Suite Oluştur</Button>
              </div>
            </div>

            {testRunError && (
              <div className="p-4 bg-error/10 border border-error/20 rounded-xl text-error text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{testRunError}</span>
              </div>
            )}

            {testRunResults && (
              <div className="glass rounded-xl p-4 border border-border flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-text-muted">Toplam:</span>
                  <span className="font-semibold">{testRunResults.summary.total}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-semibold">{testRunResults.summary.passed} başarılı</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-error">
                  <XCircle className="w-4 h-4" />
                  <span className="font-semibold">{testRunResults.summary.failed} başarısız</span>
                </div>
                {testRunResults.summary.skipped > 0 && (
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <MinusCircle className="w-4 h-4" />
                    <span>{testRunResults.summary.skipped} atlandı</span>
                  </div>
                )}
                <div className="ml-auto text-xs text-text-muted">
                  Süre: {(testRunResults.durationMs / 1000).toFixed(1)} sn
                </div>
              </div>
            )}

            <div className="space-y-4">
              {crawlResult.testCases.map((tc: any) => {
                const runResult = getRunResult(tc.id);
                const stepStatusMap: Record<string, 'passed' | 'failed' | 'skipped' | undefined> = {};
                runResult?.stepResults.forEach((sr) => {
                  stepStatusMap[sr.step] = sr.status;
                });
                return (
                <div key={tc.id} className={`glass overflow-hidden rounded-xl border transition-all ${runResult?.status === 'passed' ? 'border-success/50' : runResult?.status === 'failed' ? 'border-error/50' : selectedCrawlIds.includes(tc.id) ? 'border-primary' : 'border-border'}`}>
                  <div className="flex items-center justify-between px-6 py-4 bg-surface/50 border-b border-border">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <input type="checkbox" checked={selectedCrawlIds.includes(tc.id)} onChange={() => setSelectedCrawlIds(p => p.includes(tc.id) ? p.filter(id => id !== tc.id) : [...p, tc.id])} />
                      <span className="px-2 py-1 rounded bg-background text-primary font-mono text-xs font-bold border border-primary/20 flex-shrink-0">{tc.id}</span>
                      <h4 className="text-sm font-semibold truncate">{tc.title}</h4>
                    </div>
                    {testRunning && !runResult && (
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary flex-shrink-0">
                        <Loader2 className="w-3 h-3 animate-spin" /> Sırada
                      </span>
                    )}
                    {runResult?.status === 'passed' && (
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold bg-success/10 text-success flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Başarılı
                      </span>
                    )}
                    {runResult?.status === 'failed' && (
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold bg-error/10 text-error flex-shrink-0">
                        <XCircle className="w-3.5 h-3.5" /> Başarısız
                      </span>
                    )}
                    {runResult?.status === 'skipped' && (
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold bg-text-muted/10 text-text-muted flex-shrink-0">
                        <MinusCircle className="w-3.5 h-3.5" /> Atlandı
                      </span>
                    )}
                  </div>
                  <Accordion.Root type="single" collapsible className="w-full">
                    <Accordion.Item value="item-1">
                      <Accordion.Header>
                        <Accordion.Trigger className="w-full px-6 py-3 text-xs font-medium text-text-secondary bg-surface hover:text-text-primary outline-none text-left">Detayları Göster</Accordion.Trigger>
                      </Accordion.Header>
                      <Accordion.Content className="p-6 bg-background space-y-4 text-sm">
                        <div className="border-l-2 border-warning pl-4">
                          <h5 className="font-bold text-xs uppercase mb-1 text-text-muted">Ön Koşullar</h5>
                          <ul className="list-disc list-inside text-text-secondary">{tc.preconditions.map((p: any, i: number) => <li key={i}>{p}</li>)}</ul>
                        </div>
                        <div className="border-l-2 border-primary pl-4">
                          <h5 className="font-bold text-xs uppercase mb-1 text-text-muted">Test Adımları</h5>
                          <ol className="space-y-1 text-text-primary">
                            {tc.steps.map((p: any, i: number) => {
                              const stepStatus = stepStatusMap[p];
                              return (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-text-muted font-mono w-5 flex-shrink-0">{i + 1}.</span>
                                  {stepStatus === 'passed' && <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />}
                                  {stepStatus === 'failed' && <XCircle className="w-3.5 h-3.5 text-error flex-shrink-0 mt-0.5" />}
                                  {stepStatus === 'skipped' && <MinusCircle className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />}
                                  <span className={stepStatus === 'failed' ? 'text-error' : stepStatus === 'skipped' ? 'text-text-muted line-through' : ''}>{p}</span>
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                        <div className="border-l-2 border-success pl-4 bg-success/5 p-2 rounded-r">
                          <h5 className="font-bold text-xs uppercase mb-1 text-success">Beklenen Sonuç</h5>
                          <ul className="list-disc list-inside font-medium">{tc.expectedResults.map((p: any, i: number) => <li key={i}>{p}</li>)}</ul>
                        </div>
                        {runResult && (
                          <div className="pt-4 border-t border-border space-y-3">
                            <h5 className="font-bold text-xs uppercase text-text-muted">Otomatik Koşum Raporu</h5>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                              <span>Süre: <strong>{(runResult.durationMs / 1000).toFixed(2)} sn</strong></span>
                              {runResult.finalUrl && runResult.finalUrl !== crawlResult.url && (
                                <span className="truncate max-w-md">Son URL: <a className="text-primary hover:underline" href={runResult.finalUrl} target="_blank" rel="noreferrer">{runResult.finalUrl}</a></span>
                              )}
                            </div>
                            {runResult.errorMessage && (
                              <div className="p-3 rounded-md bg-error/10 border border-error/20 text-error text-xs flex items-start gap-2">
                                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span className="break-words">{runResult.errorMessage}</span>
                              </div>
                            )}
                            {runResult.screenshotBase64 && (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-primary hover:underline">Son Ekran Görüntüsü</summary>
                                <img
                                  src={runResult.screenshotBase64}
                                  alt={`${tc.id} screenshot`}
                                  className="mt-2 max-w-full rounded-lg border border-border"
                                />
                              </details>
                            )}
                          </div>
                        )}
                      </Accordion.Content>
                    </Accordion.Item>
                  </Accordion.Root>
                </div>
                );
              })}
            </div>
          </div>
        </div>
     )}


      {/* COMMON SAVE FORM */}
      {textAccepted && (
         <div className="glass rounded-xl p-6 border border-border mt-8 animate-fade-in shadow-soft">
            <h3 className="text-lg font-semibold mb-4">Regression Set Oluştur</h3>
            <form onSubmit={handleCreateRegressionSetText} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Set Name</label>
                  <input value={setName} onChange={(e) => setSetName(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" placeholder="Suite Name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Platform</label>
                  <select value={setPlatform} onChange={(e) => setSetPlatform(e.target.value as RegressionPlatform)} className="w-full rounded-md border border-border bg-background px-3 py-2">
                    <option value="Web">Web</option>
                    <option value="iOS">iOS</option>
                    <option value="Android">Android</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea rows={2} value={setDescription} onChange={(e) => setSetDescription(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Team (optional)</label>
                  <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2">
                    <option value="">Personal (only me)</option>
                    {teams.map((team) => (
                      <option key={team._id} value={team._id}>Team: {team.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4">
                {error && <p className="text-error text-sm">{error}</p>}
                {successMessage && <p className="text-success text-sm font-semibold">{successMessage}</p>}
                <Button type="submit" loading={savingSet} className="ml-auto">Test Suite Oluştur</Button>
              </div>
            </form>
         </div>
      )}
    </div>
  );
};
