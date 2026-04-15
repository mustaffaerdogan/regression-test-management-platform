import { useState, useEffect } from 'react';
import { Button } from './Button';
import { getJiraProjects, getJiraStatuses, getJiraIssues, getJiraIssueTypes, importFromJiraComments, getJiraUsers } from '../api/jira';
import type { JiraProject, JiraStatus, JiraIssueType } from '../api/jira';
import { useNavigate } from 'react-router-dom';
import { startRun } from '../api/testRuns';
import { getRegressionSets } from '../api/regressionSets';
import type { RegressionSet } from '../types/regression';

interface JiraIntegrationPanelProps {
  regressionSetId?: string;
  testCaseIds?: string[];
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export const JiraIntegrationPanel = ({ 
  regressionSetId: initialSetId, 
  testCaseIds: initialCaseIds, 
  onSuccess,
  onError 
}: JiraIntegrationPanelProps) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [statuses, setStatuses] = useState<JiraStatus[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [issueTypes, setIssueTypes] = useState<JiraIssueType[]>([]);
  const [regressionSets, setRegressionSets] = useState<RegressionSet[]>([]);
  
  const [selectedSetId, setSelectedSetId] = useState<string>(initialSetId || '');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedIssueKey, setSelectedIssueKey] = useState<string>('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [bugIssueType, setBugIssueType] = useState<string>('');
  const [bugStatus, setBugStatus] = useState<string>('');
  const [newSetName, setNewSetName] = useState<string>('');
  const [isImportMode, setIsImportMode] = useState(false);
  
  // New state for task creation
  const [isNewTask, setIsNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  
  // New state for execution source
  const [executionSource, setExecutionSource] = useState<'platform' | 'jira'>('platform');
  
  const [loading, setLoading] = useState(false);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [fetchingIssues, setFetchingIssues] = useState(false);

  useEffect(() => {
    // Reset isNewTask when switching to Live Jira mode since we need existing task for comments
    if (executionSource === 'jira') {
      setIsNewTask(false);
    }
  }, [executionSource]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setFetchingMetadata(true);
      try {
        const [projRes, setsRes] = await Promise.all([
          getJiraProjects(),
          !initialSetId ? getRegressionSets() : Promise.resolve({ data: [] })
        ]);
        setProjects(projRes.data || []);
        if (!initialSetId) setRegressionSets(setsRes.data || []);
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      } finally {
        setFetchingMetadata(false);
      }
    };
    void fetchInitialData();
  }, [initialSetId]);

  useEffect(() => {
    if (selectedProject) {
      const fetchProjectData = async () => {
        try {
          const [statusRes, typeRes, usersRes] = await Promise.all([
            getJiraStatuses(selectedProject),
            getJiraIssueTypes(selectedProject),
            getJiraUsers(selectedProject)
          ]);
          setStatuses(statusRes.data || []);
          setUsers(usersRes.data || []);
          const types = typeRes.data || [];
          setIssueTypes(types);
          
          const bugMatch = types.find(t => 
            ['bug', 'hata', 'arıza', 'ariza', 'defect'].includes(t.name.toLowerCase())
          );
          if (bugMatch) setBugIssueType(bugMatch.name);
          else if (types.length > 0) setBugIssueType(types[0].name);
        } catch (err) {
          console.error('Failed to fetch project data:', err);
        }
      };
      void fetchProjectData();
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject && !isNewTask) {
      const fetchIssues = async () => {
        setFetchingIssues(true);
        try {
          const res = await getJiraIssues(selectedProject, selectedStatus || undefined);
          setIssues(res.data || []);
        } catch (err) {
          console.error('Failed to fetch issues:', err);
        } finally {
          setFetchingIssues(false);
        }
      };
      void fetchIssues();
    }
  }, [selectedProject, selectedStatus, isNewTask]);

  const handleLaunch = async () => {
    if (!selectedProject || (!isNewTask && !selectedIssueKey) || (isNewTask && !newTaskTitle)) return;
    
    setLoading(true);
    try {
      if (isImportMode) {
        // Mode 2: Just Import permanently
        const res = await importFromJiraComments(selectedIssueKey, newSetName || undefined);
        const newId = (res.data as any)?.regressionSetId;
        if (newId) {
          onSuccess?.(`Success! Imported ${(res.data as any)?.count} cases from Jira.`);
          navigate(`/regression-sets/${newId}`);
        }
      } else {
        // Mode 1: Execution Run
        let finalSetId = selectedSetId;
        let caseIds = initialCaseIds || [];

        if (executionSource === 'jira') {
          // Sub-Option B: Live Import & Run
          const importRes = await importFromJiraComments(selectedIssueKey, `Jira Live Run - ${selectedIssueKey}`);
          finalSetId = (importRes.data as any)?.regressionSetId;
          // No need to set caseIds, startRun will pick all from the new set
        }

        if (!finalSetId) {
          throw new Error('Please select a regression set or use Live Jira cases.');
        }

        const currentSet = regressionSets.find(s => s._id === finalSetId);
        if (!caseIds.length && currentSet?.testCases) {
          caseIds = currentSet.testCases.map(tc => typeof tc === 'object' ? (tc as any)._id : tc);
        }
        
        const jiraData = {
          jiraProjectKey: selectedProject,
          jiraIssueKey: isNewTask ? undefined : selectedIssueKey,
          summary: isNewTask ? newTaskTitle : undefined,
          jiraAssignee: isNewTask ? (selectedAssignee || undefined) : undefined,
          jiraBugIssueType: bugIssueType,
          jiraBugStatus: bugStatus || undefined,
          testCaseIds: caseIds.length > 0 ? caseIds : undefined,
        };
        
        const response = await startRun(finalSetId, jiraData);
        const runId = response.data?.runId;
        if (runId) {
          onSuccess?.(isNewTask ? 'New Jira task created and run started!' : executionSource === 'jira' ? 'Jira cases parsed and run started!' : 'Run linked to Jira successfully!');
          navigate(`/test-runs/${runId}/execute`);
        }
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedTask = issues.find(i => i.key === selectedIssueKey);
  const selectedSet = regressionSets.find(s => s._id === selectedSetId);

  return (
    <div className={`relative group overflow-hidden bg-gradient-to-br ${isImportMode ? 'from-green-600 via-teal-700 to-green-900 shadow-green-500/20' : 'from-indigo-600 via-blue-700 to-indigo-900 shadow-indigo-500/20'} rounded-[2.5rem] p-0.5 shadow-2xl transition-all hover:scale-[1.01] duration-500`}>
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl"></div>

      <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-[2.4rem] p-8 sm:p-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${isImportMode ? 'bg-green-600 shadow-green-500/30' : 'bg-indigo-600 shadow-indigo-500/30'} rounded-2xl flex items-center justify-center shadow-lg`}>
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isImportMode ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  )}
                </svg>
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {isImportMode ? 'Import from Jira' : 'Jira Test Execution'}
              </h2>
            </div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 ml-13 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 ${isImportMode ? 'bg-teal-500' : 'bg-green-500'} rounded-full animate-pulse`}></span>
              {isImportMode 
                ? 'Jira yorumlarındaki test caseleri regülasyon setine dönüştürün' 
                : 'Bu mod, testi Jira taskına bağlar; her sonuç Jira\'ya yorum olarak eklenir ve hatalar otomatik açılır.'}
            </p>
          </div>
          
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-inner">
            <button 
              onClick={() => setIsImportMode(false)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest leading-none rounded-xl transition-all ${!isImportMode ? 'bg-white dark:bg-gray-900 text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title="Testi Jira'ya bağla ve koş"
            >
              Execution Run
            </button>
            <button 
              onClick={() => setIsImportMode(true)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest leading-none rounded-xl transition-all ${isImportMode ? 'bg-white dark:bg-gray-900 text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title="Jira yorumlarından caseleri geri al"
            >
              Import Set
            </button>
          </div>
        </div>

        {/* Sub-selector for execution source (only visible in Execution Mode) */}
        {!isImportMode && (
          <div className="flex items-center gap-6 pb-2 animate-in fade-in duration-500">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Case Kaynağı:</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="radio" 
                  name="execSource" 
                  className="w-4 h-4 text-indigo-600 focus:ring-0 border-gray-300 pointer-events-none"
                  checked={executionSource === 'platform'}
                  onChange={() => setExecutionSource('platform')}
                />
                <span className={`text-xs font-bold transition-colors ${executionSource === 'platform' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}>Platform Setleri</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="radio" 
                  name="execSource" 
                  className="w-4 h-4 text-indigo-600 focus:ring-0 border-gray-300 pointer-events-none"
                  checked={executionSource === 'jira'}
                  onChange={() => setExecutionSource('jira')}
                />
                <span className={`text-xs font-bold transition-colors ${executionSource === 'jira' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`}>Live Jira Caseleri</span>
              </label>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 items-end">
          {/* Regression Set Selector or New Set Name */}
          {!initialSetId && (
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-2">
                {isImportMode ? 'New Set Name (Optional)' : executionSource === 'jira' ? 'Live Auto-Generated Set' : 'Regression Set'}
              </label>
              {isImportMode ? (
                <input 
                  type="text"
                  placeholder="e.g. Imported Set v1"
                  className="w-full h-14 bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-5 text-sm font-black text-gray-900 dark:text-white focus:border-green-500 focus:ring-0 transition-all outline-none"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  disabled={loading}
                />
              ) : executionSource === 'jira' ? (
                <div className="w-full h-14 bg-indigo-50/50 dark:bg-indigo-900/10 border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 rounded-2xl flex items-center px-5 text-xs font-bold text-indigo-400 tracking-tight italic">
                  Jira yorumlarından otomatik çekilecek
                </div>
              ) : (
                <select
                  className="w-full h-14 bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-5 text-sm font-black text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-0 transition-all outline-none"
                  value={selectedSetId}
                  onChange={(e) => setSelectedSetId(e.target.value)}
                  disabled={loading}
                >
                  <option value="">-- Choose Set --</option>
                  {regressionSets.map(s => <option key={s._id} value={s._id}>{s.name} ({s.platform})</option>)}
                </select>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-2">Jira Project</label>
            <select
              className={`w-full h-14 bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-5 text-sm font-bold text-gray-900 dark:text-white focus:ring-0 transition-all outline-none ${isImportMode ? 'focus:border-green-500' : 'focus:border-indigo-500'}`}
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={fetchingMetadata || loading}
            >
              <option value="">-- Choose Project --</option>
              {projects.map(p => <option key={p.id} value={p.key}>{p.name} ({p.key})</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest pl-2">Flow Status</label>
            <select
              className={`w-full h-14 bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-700 rounded-2xl px-5 text-sm font-bold text-gray-900 dark:text-white focus:ring-0 transition-all outline-none ${isImportMode ? 'focus:border-green-500' : 'focus:border-indigo-500'}`}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              disabled={!selectedProject || loading}
            >
              <option value="">All Statuses</option>
              {statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>

          {!isImportMode && (
            <>
              <div className="space-y-2">
                <label className={`text-[11px] font-black ${executionSource === 'jira' ? 'text-green-500/60' : 'text-indigo-500/60'} uppercase tracking-widest pl-2`}>Auto-Bug Type</label>
                <select
                  className={`w-full h-14 ${executionSource === 'jira' ? 'bg-green-50/30 dark:bg-green-900/10 border-green-100 dark:border-green-800/50 text-green-900 dark:text-green-300 focus:border-green-500' : 'bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/50 text-indigo-900 dark:text-indigo-300 focus:border-indigo-500'} border-2 rounded-2xl px-5 text-sm font-bold focus:ring-0 transition-all outline-none`}
                  value={bugIssueType}
                  onChange={(e) => setBugIssueType(e.target.value)}
                  disabled={loading}
                >
                  {issueTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className={`text-[11px] font-black ${executionSource === 'jira' ? 'text-green-500/60' : 'text-indigo-500/60'} uppercase tracking-widest pl-2`}>Auto-Bug Status</label>
                <select
                  className={`w-full h-14 ${executionSource === 'jira' ? 'bg-green-50/30 dark:bg-green-900/10 border-green-100 dark:border-green-800/50 text-green-900 dark:text-green-300 focus:border-green-500' : 'bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/50 text-indigo-900 dark:text-indigo-300 focus:border-indigo-500'} border-2 rounded-2xl px-5 text-sm font-bold focus:ring-0 transition-all outline-none`}
                  value={bugStatus}
                  onChange={(e) => setBugStatus(e.target.value)}
                  disabled={loading}
                >
                  <option value="">-- Start Column --</option>
                  {statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            </>
          )}

          <div className={`space-y-2 ${initialSetId || (!isImportMode && executionSource === 'platform') ? 'col-span-full xl:col-span-5 mt-4' : 'col-span-1'}`}>
            <div className="flex items-center justify-between pl-2">
              <label className={`text-[11px] font-black ${isImportMode || executionSource === 'jira' ? 'text-green-500' : 'text-indigo-500'} uppercase tracking-widest`}>
                {executionSource === 'jira' ? 'Target Task (Comment Source)' : 'Link to Jira Task'}
              </label>
              {!isImportMode && executionSource === 'platform' && (
                <button 
                  onClick={() => setIsNewTask(!isNewTask)}
                  className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg transition-all ${isNewTask ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {isNewTask ? 'Existing' : '+ New Task'}
                </button>
              )}
            </div>
            {isNewTask ? (
              <input 
                type="text"
                placeholder="Jira Task Summary..."
                className="w-full h-14 bg-indigo-50/30 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/50 border-2 rounded-2xl px-5 text-sm font-black text-indigo-700 dark:text-indigo-300 focus:ring-0 transition-all outline-none"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                disabled={loading}
              />
            ) : (
              <select
                className={`w-full h-14 ${isImportMode || executionSource === 'jira' ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-300' : 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300'} border-2 rounded-2xl px-5 text-sm font-black focus:ring-0 transition-all outline-none`}
                value={selectedIssueKey}
                onChange={(e) => setSelectedIssueKey(e.target.value)}
                disabled={fetchingIssues || !selectedProject || loading}
              >
                <option value="">{fetchingIssues ? 'Browsing Jira...' : '-- Link Active Task --'}</option>
                {issues.map(i => <option key={i.key} value={i.key}>[{i.key}] {i.fields.summary}</option>)}
              </select>
            )}
          </div>
        </div>

        {(selectedIssueKey || isNewTask) && (
          <div className={`bg-gradient-to-r ${isImportMode || executionSource === 'jira' ? 'from-green-50 to-white dark:from-green-900/10' : 'from-gray-50 to-white dark:from-gray-800/50'} p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50 animate-in slide-in-from-bottom-2 duration-500`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-800 shrink-0">
                  <img src={isNewTask ? "/jira-icon.png" : (selectedTask?.fields.issuetype?.iconUrl || "/jira-icon.png")} alt="" className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black ${isImportMode || executionSource === 'jira' ? 'text-green-600 dark:text-green-400 bg-green-50' : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50'} dark:bg-indigo-900/40 px-2 py-0.5 rounded uppercase tracking-wider`}>
                      {isNewTask ? 'NEW TASK' : selectedIssueKey}
                    </span>
                    {!isNewTask && <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedTask?.fields.status?.name}</span>}
                  </div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    {isNewTask ? (newTaskTitle || 'Type a summary above...') : (selectedTask?.fields.summary || 'Loading task details...')}
                  </h4>
                  {!isImportMode && selectedSet && executionSource === 'platform' && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Active Set:</span>
                      <span className="text-[10px] text-indigo-500 font-black tracking-tight">{selectedSet.name}</span>
                    </div>
                  )}
                  {executionSource === 'jira' && !isImportMode && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-black uppercase tracking-wider">Mevcut yorumlar okunacak ve anlık test koşumu başlatılacak</span>
                    </div>
                  )}
                  {isImportMode && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-black uppercase tracking-wider">Ready to parse cases from comments</span>
                    </div>
                  )}
                </div>
              </div>
              
              {!isImportMode && (
                <div className="flex gap-3">
                  <div className="space-y-1 flex flex-col items-end">
                     <label className="text-[9px] font-black text-red-500 uppercase tracking-widest">Auto-Bug Type</label>
                     <select 
                       className="bg-transparent border-none text-[11px] font-black text-gray-500 dark:text-gray-400 p-0 focus:ring-0 cursor-pointer text-right"
                       value={bugIssueType}
                       onChange={(e) => setBugIssueType(e.target.value)}
                     >
                       {issueTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                     </select>
                  </div>
                </div>
              )}

              {isNewTask && (
                <div className="flex gap-4">
                  <div className="space-y-1 flex flex-col items-end">
                     <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Assignee</label>
                     <select 
                       className="bg-transparent border-none text-[11px] font-black text-gray-500 dark:text-gray-400 p-0 focus:ring-0 cursor-pointer text-right"
                       value={selectedAssignee}
                       onChange={(e) => setSelectedAssignee(e.target.value)}
                     >
                       <option value="">Automatic</option>
                       {users.map(u => <option key={u.accountId} value={u.accountId}>{u.displayName}</option>)}
                     </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex pt-4">
          <Button
            className={`w-full h-16 rounded-3xl text-xl font-black transition-all duration-300 shadow-xl ${
              loading || !selectedProject || (isNewTask ? !newTaskTitle : !selectedIssueKey) || (!isImportMode && executionSource === 'platform' && !selectedSetId)
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700' 
                : isImportMode || executionSource === 'jira'
                  ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20 hover:shadow-green-600/40 transform hover:-translate-y-1'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 hover:shadow-indigo-600/40 transform hover:-translate-y-1'
            }`}
            onClick={handleLaunch}
            disabled={loading || !selectedProject || (isNewTask ? !newTaskTitle : !selectedIssueKey) || (!isImportMode && executionSource === 'platform' && !selectedSetId)}
            loading={loading}
          >
            {isImportMode 
              ? 'Import & Create Regression Set' 
              : executionSource === 'jira'
                ? 'Check Jira Comments & Start Live Run'
                : 'Launch Jira-Linked Integrated Run'}
          </Button>
        </div>
      </div>
    </div>
  );
};
