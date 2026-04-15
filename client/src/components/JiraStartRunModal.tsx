import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { getJiraProjects, getJiraBoards, getJiraPriorities, getJiraUsers, getJiraStatuses, getJiraIssueTypes, getJiraIssues } from '../api/jira';
import type { JiraProject, JiraBoard, JiraPriority, JiraUser, JiraStatus, JiraIssueType } from '../api/jira';
import type { TestCase } from '../types/regression';

interface JiraStartRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (jiraData?: { 
    jiraProjectKey?: string; 
    jiraAssignee?: string; 
    jiraBoardId?: string;
    testCaseIds?: string[];
    summary?: string;
    priorityId?: string;
    jiraStatus?: string;
    jiraSuccessStatus?: string;
    jiraBugIssueType?: string;
    jiraBugStatus?: string;
    jiraIssueKey?: string;
  }) => void;
  loading: boolean;
  mode?: 'start' | 'export';
  testCases?: TestCase[];
}

type NamingStrategy = 'set_name' | 'date' | 'custom';

export const JiraStartRunModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  loading, 
  mode = 'start',
  testCases = []
}: JiraStartRunModalProps) => {
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [boards, setBoards] = useState<JiraBoard[]>([]);
  const [priorities, setPriorities] = useState<JiraPriority[]>([]);
  const [users, setUsers] = useState<JiraUser[]>([]);
  const [statuses, setStatuses] = useState<JiraStatus[]>([]);
  const [issueTypes, setIssueTypes] = useState<JiraIssueType[]>([]);
  const [existingIssues, setExistingIssues] = useState<any[]>([]);
  
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  const [selectedBugType, setSelectedBugType] = useState<string>('');
  const [selectedBugStatus, setSelectedBugStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [successStatus, setSuccessStatus] = useState<string>('');
  const [bugIssueType, setBugIssueType] = useState<string>('');
  
  const [useExistingTask, setUseExistingTask] = useState(false);
  const [selectedIssueKey, setSelectedIssueKey] = useState<string>('');
  
  const [namingStrategy, setNamingStrategy] = useState<NamingStrategy>('set_name');
  const [customSummary, setCustomSummary] = useState<string>('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [fetchingIssues, setFetchingIssues] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchInitialMetadata = async () => {
        setFetchingMetadata(true);
        setError(null);
        try {
          const [projRes, prioRes] = await Promise.all([
            getJiraProjects(),
            getJiraPriorities()
          ]);
          setProjects(projRes.data || []);
          setPriorities(prioRes.data || []);
          
          if (testCases.length > 0) {
            setSelectedCaseIds(testCases.map(tc => tc._id));
          }
        } catch (err) {
          setError('Failed to fetch Jira metadata.');
        } finally {
          setFetchingMetadata(false);
        }
      };
      void fetchInitialMetadata();
    }
  }, [isOpen, testCases]);

  useEffect(() => {
    if (selectedProject) {
      const fetchDependentMetadata = async () => {
        try {
          const [boardsRes, usersRes, statusesRes, typesRes] = await Promise.all([
            getJiraBoards(selectedProject),
            getJiraUsers(selectedProject),
            getJiraStatuses(selectedProject),
            getJiraIssueTypes(selectedProject)
          ]);
          setBoards(boardsRes.data || []);
          setUsers(usersRes.data || []);
          setStatuses(statusesRes.data || []);
          
          const types = typesRes.data || [];
          setIssueTypes(types);
          
          const detectionMatch = types.find((t: JiraIssueType) => 
            ['bug', 'hata', 'arıza', 'ariza', 'defect'].includes(t.name.toLowerCase())
          );
          if (detectionMatch) setBugIssueType(detectionMatch.name);
          else if (types.length > 0) setBugIssueType(types[0].name);

          const doneStatus = statusesRes.data?.find((s: JiraStatus) => 
            ['Done', 'Completed', 'Finished', 'Closed'].includes(s.name)
          );
          if (doneStatus) setSuccessStatus(doneStatus.name);
        } catch (err) {
          console.error('Failed to fetch project dependent data:', err);
        }
      };
      void fetchDependentMetadata();
    }
  }, [selectedProject]);

  useEffect(() => {
    if (useExistingTask && selectedProject) {
      const fetchIssues = async () => {
        setFetchingIssues(true);
        try {
          const res = await getJiraIssues(selectedProject, selectedStatus || undefined);
          setExistingIssues(res.data || []);
        } catch (err) {
          console.error('Failed to fetch existing issues:', err);
        } finally {
          setFetchingIssues(false);
        }
      };
      void fetchIssues();
    }
  }, [useExistingTask, selectedProject, selectedStatus]);

  const handleConfirm = () => {
    if (selectedProject) {
      let finalSummary = customSummary;
      if (mode === 'export' && namingStrategy === 'set_name') {
        const setName = testCases[0]?.regressionSet && typeof testCases[0]?.regressionSet === 'object' 
          ? (testCases[0].regressionSet as any).name 
          : 'Regression';
        finalSummary = setName;
      } else if (mode === 'export' && namingStrategy === 'date') {
        finalSummary = `Export - ${new Date().toLocaleDateString()}`;
      }

      onConfirm({ 
        jiraProjectKey: selectedProject, 
        jiraAssignee: selectedAssignee || undefined,
        jiraBoardId: selectedBoard || undefined,
        testCaseIds: selectedCaseIds.length > 0 ? selectedCaseIds : undefined,
        summary: finalSummary || undefined,
        priorityId: selectedPriority || undefined,
        jiraStatus: selectedStatus || undefined,
        jiraSuccessStatus: mode === 'start' ? successStatus : undefined,
        jiraBugIssueType: mode === 'start' ? (selectedBugType || bugIssueType || undefined) : undefined,
        jiraBugStatus: mode === 'start' ? (selectedBugStatus || undefined) : undefined,
        jiraIssueKey: useExistingTask ? selectedIssueKey : undefined,
      });
    } else {
      onConfirm(undefined);
    }
  };

  const toggleCase = (id: string) => {
    setSelectedCaseIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedCaseIds.length === testCases.length) setSelectedCaseIds([]);
    else setSelectedCaseIds(testCases.map(tc => tc._id));
  };

  const title = mode === 'export' ? 'Jira Case Export' : 'Jira Integrated Regression Run';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidthClass="max-w-4xl">
      <div className="space-y-6 pt-2 h-[85vh] sm:h-auto overflow-y-auto pr-1">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/30 font-medium font-bold">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                Jira Configuration
              </h3>
              
              <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-sm space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter">Jira Project</label>
                  <select
                    className="w-full rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3.5 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    disabled={fetchingMetadata}
                  >
                    <option value="">-- Choose Jira Space --</option>
                    {projects.map((p) => <option key={p.id} value={p.key}>{p.name} ({p.key})</option>)}
                  </select>
                </div>

                {mode === 'start' && (
                  <div className="flex p-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <button
                      onClick={() => setUseExistingTask(false)}
                      className={`flex-1 py-2 text-[11px] font-black uppercase tracking-tighter rounded-lg transition-all ${!useExistingTask ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-indigo-500'}`}
                    >
                      New Task
                    </button>
                    <button
                      onClick={() => setUseExistingTask(true)}
                      className={`flex-1 py-2 text-[11px] font-black uppercase tracking-tighter rounded-lg transition-all ${useExistingTask ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-indigo-500'}`}
                    >
                      Linked Task
                    </button>
                  </div>
                )}

                {!useExistingTask && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter">Status Filter</label>
                      <select
                        className="w-full rounded-2xl border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 p-3 text-sm focus:ring-2 focus:ring-indigo-500 font-bold"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        disabled={!selectedProject}
                      >
                        <option value="">All Statuses</option>
                        {statuses.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter">Priority</label>
                      <select
                        className="w-full rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                        value={selectedPriority}
                        onChange={(e) => setSelectedPriority(e.target.value)}
                      >
                        <option value="">Default</option>
                        {priorities.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {useExistingTask && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter">Status Filter</label>
                    <select
                      className="w-full rounded-2xl border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 p-3 text-sm focus:ring-2 focus:ring-indigo-500 font-bold"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      disabled={!selectedProject}
                    >
                      <option value="">All Statuses</option>
                      {statuses.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                {useExistingTask ? (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                    <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">Select Existing Task</label>
                    <select
                      className="w-full rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 p-3.5 text-sm font-bold shadow-indigo-100/50"
                      value={selectedIssueKey}
                      onChange={(e) => setSelectedIssueKey(e.target.value)}
                      disabled={fetchingIssues || !selectedProject}
                    >
                      <option value="">{fetchingIssues ? 'Searching Jira...' : '-- Choose Active Task --'}</option>
                      {existingIssues.map((issue) => (
                        <option key={issue.key} value={issue.key}>
                          [{issue.key}] {issue.fields.summary}
                        </option>
                      ))}
                    </select>
                    {existingIssues.length === 0 && !fetchingIssues && selectedProject && (
                      <p className="text-[10px] text-red-500 font-bold mt-1 px-1 italic">No tasks found with this status.</p>
                    )}
                  </div>
                ) : mode !== 'export' ? (
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border-2 border-red-50 dark:border-red-900/20 shadow-sm animate-in zoom-in-95 duration-300">
                    <label className="block text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                      Otomatik Hata (Bug) Türü
                    </label>
                    <select
                      className="w-full rounded-xl border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10 p-2.5 text-sm font-bold text-red-700 dark:text-red-400 focus:ring-2 focus:ring-red-500"
                      value={bugIssueType}
                      onChange={(e) => setBugIssueType(e.target.value)}
                      disabled={!selectedProject}
                    >
                      <option value="">-- Select Type --</option>
                      {issueTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
                ) : null}

                {!useExistingTask && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter tracking-tighter">Target Board</label>
                    <select
                      className="w-full rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                      value={selectedBoard}
                      onChange={(e) => setSelectedBoard(e.target.value)}
                      disabled={!selectedProject}
                    >
                      <option value="">No specific board</option>
                      {boards.map((b) => <option key={b.id} value={b.id.toString()}>{b.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Task Details & Scope
              </h3>
              
              <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-5">
                <div className="space-y-4">
                  {mode === 'export' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter">Naming Strategy</label>
                      <select
                        className="w-full rounded-xl border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                        value={namingStrategy}
                        onChange={(e) => setNamingStrategy(e.target.value as NamingStrategy)}
                      >
                        <option value="set_name">Regression Set Name</option>
                        <option value="date">Date Prefix</option>
                        <option value="custom">Custom Title</option>
                      </select>
                    </div>
                  )}

                  {(mode === 'export' || (mode === 'start' && !useExistingTask)) && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter">Assignee</label>
                      <select
                        className="w-full rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                        value={selectedAssignee}
                        onChange={(e) => setSelectedAssignee(e.target.value)}
                        disabled={!selectedProject}
                      >
                        <option value="">Automatic</option>
                        {users.map((u) => <option key={u.accountId} value={u.accountId}>{u.displayName}</option>)}
                      </select>
                    </div>
                  )}

                  {mode === 'start' && !useExistingTask && (
                    <>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter">Auto-Bug Type</label>
                        <select
                          className="w-full rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                          value={selectedBugType}
                          onChange={(e) => setSelectedBugType(e.target.value)}
                          disabled={!selectedProject}
                        >
                          <option value="">Default (Bug)</option>
                          {issueTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter">Auto-Bug Status</label>
                        <select
                          className="w-full rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                          value={selectedBugStatus}
                          onChange={(e) => setSelectedBugStatus(e.target.value)}
                          disabled={!selectedProject}
                        >
                          <option value="">Default (No Transition)</option>
                          {statuses.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  {useExistingTask && selectedIssueKey && (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 animate-in fade-in duration-500">
                      <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Linked Jira Task</label>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-snug">
                        {existingIssues.find(i => i.key === selectedIssueKey)?.fields.summary || selectedIssueKey}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[9px] font-black bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 uppercase">{selectedIssueKey}</span>
                        <span className="text-[10px] text-indigo-400 font-bold italic">Comments will be posted here</span>
                      </div>
                    </div>
                  )}

                  {(mode === 'start' || (mode === 'export' && namingStrategy === 'custom')) && !useExistingTask && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">
                        {mode === 'start' ? 'Main Task Title' : 'Title / Prefix'}
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-2xl border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 p-4 text-sm border-2 font-bold focus:ring-indigo-500 shadow-indigo-100/50"
                        placeholder="Örn: Release v1.2 - Gece Regresyon Koşumu"
                        value={customSummary}
                        onChange={(e) => setCustomSummary(e.target.value)}
                        autoFocus
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[11px] font-bold text-gray-400 uppercase">Scope ({selectedCaseIds.length})</span>
                    <button onClick={toggleAll} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full">
                      {selectedCaseIds.length === testCases.length ? 'Clear' : 'Select All'}
                    </button>
                  </div>

                  <div className="h-[250px] bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-y-auto p-3 custom-scrollbar space-y-2">
                    {testCases.map(tc => (
                      <label key={tc._id} className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${selectedCaseIds.includes(tc._id) ? 'bg-white dark:bg-gray-800 border-indigo-200 dark:border-indigo-800 shadow-sm' : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-gray-800/60'}`}>
                        <input type="checkbox" checked={selectedCaseIds.includes(tc._id)} onChange={() => toggleCase(tc._id)} className="w-4 h-4 rounded-lg text-indigo-600" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[9px] font-black text-indigo-500 uppercase leading-none">{tc.testCaseId}</span>
                          <span className="text-xs text-gray-900 dark:text-gray-100 truncate font-semibold mt-1">{tc.testCase}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-6 mt-4 border-t border-gray-100 dark:border-gray-800">
          <Button
            className="flex-[2] py-4 rounded-2xl shadow-xl shadow-indigo-100 bg-indigo-600 hover:bg-indigo-700 text-lg font-black transition-all hover:-translate-y-1"
            onClick={handleConfirm}
            loading={loading}
            disabled={fetchingMetadata || !selectedProject || selectedCaseIds.length === 0 || (!useExistingTask && !customSummary) || (useExistingTask && !selectedIssueKey)}
          >
            {mode === 'export' ? 'Export Test Cases to Jira' : 'Launch Integrated Run'}
          </Button>
          <Button variant="secondary" className="flex-1 py-4 rounded-2xl border-gray-200 font-bold" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
