import React, { useState, useMemo } from 'react';
import type { ShotData, DeviceType, SessionType } from './types';
import { parseShotCSV } from './utils/csvParser';
import { saveSession, getSessions, getSessionHits, deleteSession } from './utils/db';
import ManualEntry from './components/ManualEntry';
import { Upload, Activity, Trash2, Binary, Layers, Save, CheckCircle2, History, Cloud, CloudOff, Info, Archive, Play } from 'lucide-react';
import { isSupabaseConfigured } from './utils/supabase';

const App: React.FC = () => {
  const [mlmShots, setMlmShots] = useState<ShotData[]>([]);
  const [pro2Shots, setPro2Shots] = useState<ShotData[]>([]);
  const [pro3Shots, setPro3Shots] = useState<ShotData[]>([]);
  const [sessionType, setSessionType] = useState<SessionType>('TEE');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'compare' | 'history'>('compare');

  // Load session list on mount
  React.useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const data = await getSessions();
      setSavedSessions(data);
    } catch (err) {
      console.warn('Could not fetch sessions:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, device: DeviceType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseShotCSV(file);
      if (device === 'MLM_DS') setMlmShots(parsed);
      if (device === 'PRO_2_0') setPro2Shots(parsed);
      if (device === 'PRO_3_0') setPro3Shots(parsed);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleSaveToDb = async () => {
    if (mlmShots.length === 0 && pro2Shots.length === 0 && pro3Shots.length === 0) {
      alert('No data to save.');
      return;
    }
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await saveSession(sessionType, mlmShots, pro2Shots, pro3Shots);
      setSaveSuccess(true);
      fetchSessions(); // Refresh list
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Detailed Save Error:', error);
      alert('Error saving to database: ' + (error.message || 'Unknown error. check console.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSessionClick = async (session: any) => {
    setIsLoadingHistory(true);
    setCurrentSessionId(session.id);
    setSessionType(session.type);
    setActiveTab('compare'); // Switch to compare tab when loading a session
    try {
      const hits = await getSessionHits(session.id);

      const mlm = hits.filter((h: any) => h.device_type === 'MLM_DS').map(formatHit);
      const pro2 = hits.filter((h: any) => h.device_type === 'PRO_2_0').map(formatHit);
      const pro3 = hits.filter((h: any) => h.device_type === 'PRO_3_0').map(formatHit);

      setMlmShots(mlm);
      setPro2Shots(pro2);
      setPro3Shots(pro3);
    } catch (err: any) {
      alert('Failed to load session hits: ' + err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      await deleteSession(sessionId);
      if (currentSessionId === sessionId) {
        resetToNew();
      }
      fetchSessions();
    } catch (err: any) {
      alert('Failed to delete session: ' + err.message);
    }
  };

  const formatHit = (h: any): ShotData => ({
    no: h.hit_no,
    distance: h.distance_ft,
    exitVelocity: h.exit_velocity_mph,
    launchAngle: h.launch_angle_deg,
    exitDirection: h.direction_deg
  });

  const resetToNew = () => {
    setCurrentSessionId(null);
    setMlmShots([]);
    setPro2Shots([]);
    setPro3Shots([]);
  };

  const addMlmShot = (shot: ShotData) => {
    setMlmShots(prev => [...prev.filter(s => s.no !== shot.no), shot].sort((a, b) => a.no - b.no));
  };

  const clearSession = () => {
    if (confirm('Clear all session data?')) {
      setMlmShots([]); setPro2Shots([]); setPro3Shots([]);
    }
  };

  const allShotNumbers = useMemo(() => {
    const nos = new Set<number>();
    mlmShots.forEach(s => nos.add(s.no));
    pro2Shots.forEach(s => nos.add(s.no));
    pro3Shots.forEach(s => nos.add(s.no));
    return Array.from(nos).sort((a, b) => b - a);
  }, [mlmShots, pro2Shots, pro3Shots]);

  const sessionAverages = useMemo(() => {
    const calc = (shots: ShotData[]) => {
      const validShots = shots.filter(s => s.distance > 0 && s.exitVelocity > 0);
      return {
        dist: validShots.length > 0 ? validShots.reduce((a, b) => a + b.distance, 0) / validShots.length : null,
        velo: validShots.length > 0 ? validShots.reduce((a, b) => a + b.exitVelocity, 0) / validShots.length : null,
        angle: validShots.length > 0 ? validShots.reduce((a, b) => a + b.launchAngle, 0) / validShots.length : null,
        dir: validShots.length > 0 ? validShots.reduce((a, b) => a + b.exitDirection, 0) / validShots.length : null,
        count: shots.length // Total count includes zeroes as requested
      };
    };
    return {
      mlm: calc(mlmShots),
      pro2: calc(pro2Shots),
      pro3: calc(pro3Shots)
    };
  }, [mlmShots, pro2Shots, pro3Shots]);


  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="flex items-center gap-4 mb-8 px-2">
          <div className="relative">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.4)]">
              <Activity className="text-black" size={24} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-sidebar-card border-2 border-sidebar rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter leading-none text-white italic">
              RAP <span className="text-primary">ANALYZER</span>
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="w-8 h-[2px] bg-primary/30" />
              <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]"></span>
            </div>
          </div>
        </div>

        <div className="control-stack mb-6">
          <button
            onClick={() => setActiveTab('compare')}
            className={`btn-outline w-full justify-start gap-3 ${activeTab === 'compare' ? 'bg-primary/10 border-primary/30 text-white' : 'text-text-dim'}`}
          >
            <Activity size={16} className={activeTab === 'compare' ? 'text-primary' : ''} />
            <span className="font-bold">COMPARE</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`btn-outline w-full justify-start gap-3 ${activeTab === 'history' ? 'bg-primary/10 border-primary/30 text-white' : 'text-text-dim'}`}
          >
            <Archive size={16} className={activeTab === 'history' ? 'text-primary' : ''} />
            <span className="font-bold">HISTORY</span>
          </button>
        </div>

        <ManualEntry onAddShot={addMlmShot} />

        <div className="sidebar-card">
          <div className="sidebar-title">
            <Upload size={14} className="text-primary" />
            CSV SYNC
          </div>

          <div className="mb-6">
            <span className="section-label mb-2 block">SESSION MODE</span>
            <div className="segmented-control">
              {(['TEE', 'SOFT_TOSS', 'OTHER'] as SessionType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSessionType(type)}
                  className={`segment-btn ${sessionType === type ? 'active' : ''}`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="control-stack">
            <label className="btn-outline cursor-pointer border-l-4 border-l-primary/40">
              <Upload size={14} className="text-primary" />
              <span>SYNC <strong className="text-white">MLM DS</strong> CSV</span>
              <input type="file" accept=".csv" className="hidden" onChange={e => handleFileUpload(e, 'MLM_DS')} />
            </label>
            <label className="btn-outline cursor-pointer border-l-4 border-l-amber/40">
              <Upload size={14} className="text-amber" />
              <span>SYNC <strong className="text-white">PRO 2.0</strong> CSV</span>
              <input type="file" accept=".csv" className="hidden" onChange={e => handleFileUpload(e, 'PRO_2_0')} />
            </label>
            <label className="btn-outline cursor-pointer border-l-4 border-l-indigo/40">
              <Upload size={14} className="text-indigo" />
              <span>SYNC <strong className="text-white">PRO 3.0</strong> CSV</span>
              <input type="file" accept=".csv" className="hidden" onChange={e => handleFileUpload(e, 'PRO_3_0')} />
            </label>

            <div className="h-px bg-white/5 my-1" />

            <button
              onClick={handleSaveToDb}
              disabled={isSaving || !!currentSessionId}
              className={`btn-primary w-full ${isSaving || !!currentSessionId ? 'opacity-50 cursor-not-allowed' : ''} ${!isSupabaseConfigured ? 'border-amber-500/50' : ''}`}
            >
              {isSaving ? (
                <Activity size={14} className="animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle2 size={14} className="text-green-400" />
              ) : (
                <Save size={14} />
              )}
              {currentSessionId
                ? 'SESSION SAVED'
                : saveSuccess
                  ? (isSupabaseConfigured ? 'SAVED TO CLOUD' : 'SAVED TO LOCAL')
                  : isSaving
                    ? 'SAVING...'
                    : (isSupabaseConfigured ? 'SAVE TO DATABASE' : 'SAVE TO LOCAL STORAGE')}
            </button>

            {!isSupabaseConfigured && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3">
                <Info size={16} className="text-amber-500 shrink-0" />
                <p className="text-[10px] text-amber-200/80 leading-relaxed">
                  <strong>Not Connected:</strong> Data is currently saved to this browser only. Connect Supabase in Vercel to share across devices.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-card">
          <div className="sidebar-title">
            <History size={14} className="text-primary" />
            LIVE STATUS
          </div>
          <div className="space-y-3">
            <div className={`p-3 rounded-xl border ${currentSessionId ? 'bg-green-500/5 border-green-500/20' : 'bg-white/5 border-white/5'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Session Status</span>
                {currentSessionId ? <CheckCircle2 size={12} className="text-green-400" /> : <div className="w-2 h-2 rounded-full bg-white/20" />}
              </div>
              <p className="text-sm font-bold text-white">
                {currentSessionId ? 'SAVED SESSION' : 'NEW SESSION'}
              </p>
            </div>
            {currentSessionId && (
              <button onClick={resetToNew} className="btn-primary w-full py-2 text-[10px]">
                START NEW SESSION
              </button>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              {isSupabaseConfigured ? (
                <>
                  <Cloud size={10} className="text-green-400" />
                  <span className="text-[9px] font-bold text-green-400/80 uppercase tracking-tighter">Cloud Sync Active</span>
                </>
              ) : (
                <>
                  <CloudOff size={10} className="text-amber-400" />
                  <span className="text-[9px] font-bold text-amber-400/80 uppercase tracking-tighter">Local Storage Mode</span>
                </>
              )}
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse opacity-50" style={{ color: isSupabaseConfigured ? '#4ade80' : '#fbbf24' }} />
          </div>
        </div>

        <div className="mt-auto control-stack">
          <button onClick={clearSession} className="btn-outline text-red-400 border-red-900/20 hover:bg-red-950/20">
            <Trash2 size={14} /> RESET DISCARD DATA
          </button>
        </div>
      </aside>

      <main className="main-scroll relative">
        {isLoadingHistory && (
          <div className="absolute inset-x-0 top-0 h-1 bg-primary/20 overflow-hidden z-[100]">
            <div className="absolute inset-0 bg-primary" style={{ animation: 'shimmer 2s infinite' }} />
          </div>
        )}
        {activeTab === 'compare' ? (
          <div className="max-w-5xl mx-auto">
            {/* Section: Session Totals */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Activity className="text-primary" size={24} />
                  <h2 className="section-header">Session Comparison</h2>
                </div>
                <div className="flex items-center gap-6 px-5 py-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md shadow-2xl">
                  <div className="flex flex-col">
                    <span className="section-label">MODE</span>
                    <span className="text-sm font-black text-primary tracking-wide">{sessionType.replace('_', ' ')}</span>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="flex flex-col">
                    <span className="section-label">DATE</span>
                    <span className="text-sm font-bold text-text-muted">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="session-avg-panel">
                <table className="avg-table">
                  <thead>
                    <tr>
                      <th className="text-primary/70">Device</th>
                      <th className="text-primary/70">Distance (Avg)</th>
                      <th className="text-primary/70">Exit Velo (Avg)</th>
                      <th className="text-primary/70">Launch Angle (Avg)</th>
                      <th className="text-primary/70">Exit Dir (Avg)</th>
                      <th className="text-primary/70">Shots Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 'MLM DS', data: sessionAverages.mlm, badge: 'badge-mlm' },
                      { id: 'PRO 2.0', data: sessionAverages.pro2, badge: 'badge-pro2', base: sessionAverages.mlm },
                      { id: 'PRO 3.0', data: sessionAverages.pro3, badge: 'badge-pro3', base: sessionAverages.mlm },
                    ].map(row => (
                      <tr key={row.id}>
                        <td><span className={`device-badge ${row.badge}`}>{row.id}</span></td>
                        <td>
                          <span className="avg-val mono">{row.data?.dist?.toFixed(1) || '—'}</span>
                          {row.base && row.data && row.data.dist !== null && row.base.dist !== null && (
                            <span className={`avg-diff mono ${(row.data.dist - row.base.dist) > 0 ? 'text-amber' : 'text-indigo'}`}>
                              ({(row.data.dist - row.base.dist) > 0 ? '+' : ''}{(row.data.dist - row.base.dist).toFixed(1)})
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="avg-val mono">{row.data?.velo?.toFixed(1) || '—'}</span>
                          {row.base && row.data && row.data.velo !== null && row.base.velo !== null && (
                            <span className={`avg-diff mono ${(row.data.velo - row.base.velo) > 0 ? 'text-amber' : 'text-indigo'}`}>
                              ({(row.data.velo - row.base.velo) > 0 ? '+' : ''}{(row.data.velo - row.base.velo).toFixed(1)})
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="avg-val mono">{row.data?.angle?.toFixed(1) || '—'}</span>
                          {row.base && row.data && row.data.angle !== null && row.base.angle !== null && (
                            <span className={`avg-diff mono ${(row.data.angle - row.base.angle) > 0 ? 'text-amber' : 'text-indigo'}`}>
                              ({(row.data.angle - row.base.angle) > 0 ? '+' : ''}{(row.data.angle - row.base.angle).toFixed(1)})
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="avg-val mono">{row.data?.dir?.toFixed(1) || '—'}</span>
                          {row.base && row.data && row.data.dir !== null && row.base.dir !== null && (
                            <span className={`avg-diff mono ${(row.data.dir - row.base.dir) > 0 ? 'text-amber' : 'text-indigo'}`}>
                              ({(row.data.dir - row.base.dir) > 0 ? '+' : ''}{(row.data.dir - row.base.dir).toFixed(1)})
                            </span>
                          )}
                        </td>
                        <td><span className="text-text-muted font-bold">{row.data?.count || 0}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!sessionAverages.mlm && (
                  <div className="mt-4 p-4 bg-primary/5 border border-primary/10 rounded-xl text-center text-sm text-primary/80">
                    Note: Add MLM DS data to see average deviations.
                  </div>
                )}
              </div>
            </div>

            {/* Section: Shot by Shot */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Layers className="text-primary" size={24} />
                <h2 className="section-header">Shot Analysis</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-[10px] font-bold text-text-dim uppercase tracking-wider">{new Date().toLocaleDateString()}</div>
                <div className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  <span className="text-[10px] font-black text-primary tracking-widest">{sessionType.replace('_', ' ')} SESSION</span>
                </div>
              </div>
            </div>

            {allShotNumbers.map(no => {
              const mlm = mlmShots.find(s => s.no === no);
              const pro2 = pro2Shots.find(s => s.no === no);
              const pro3 = pro3Shots.find(s => s.no === no);

              return (
                <div key={no} className="shot-card animate-entry">
                  <div className="shot-card-header">
                    <div className="flex items-center gap-3">
                      <Binary size={14} className="text-primary/60" />
                      <span className="shot-number">SHOT #{no}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[
                        { id: 'MLM', exists: !!mlm, color: 'text-primary', label: 'MLM', key: 'mlm' },
                        { id: 'PRO 2', exists: !!pro2, color: 'text-amber', label: 'PRO 2.0', key: 'pro2' },
                        { id: 'PRO 3', exists: !!pro3, color: 'text-indigo', label: 'PRO 3.0', key: 'pro3' },
                      ].map(st => (
                        <div key={st.id} className={`status-badge ${st.key} ${st.exists ? 'exists' : ''}`}>
                          <div className={`status-dot ${st.exists ? st.color : ''}`} />
                          <span className="status-device">{st.label}</span>
                          <span className={`status-tag ${st.exists ? st.key : 'none'}`}>
                            {st.exists ? 'SYNC' : 'NO DATA'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="shot-card-content">
                    <table className="shot-table">
                      <thead>
                        <tr>
                          <th>Device</th>
                          <th>Distance</th>
                          <th>Velo</th>
                          <th>Angle</th>
                          <th>Dir</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { id: 'MLM', data: mlm, badge: 'badge-mlm' },
                          { id: 'PRO 2', data: pro2, badge: 'badge-pro2', base: mlm },
                          { id: 'PRO 3', data: pro3, badge: 'badge-pro3', base: mlm },
                        ].map(row => (
                          <tr key={row.id}>
                            <td><span className={`device-badge ${row.badge} mini`}>{row.id}</span></td>
                            <td>
                              <span className={`shot-val mono ${!row.data ? 'dim' : ''}`}>
                                {row.data?.distance.toFixed(1) || '—'}
                              </span>
                              {row.base && row.data && (
                                <span className={`shot-delta mono ${(row.data.distance - row.base.distance) > 0 ? 'plus' : (row.data.distance - row.base.distance) < 0 ? 'minus' : 'zero'}`}>
                                  {(row.data.distance - row.base.distance) > 0 ? '+' : ''}{(row.data.distance - row.base.distance).toFixed(1)}
                                </span>
                              )}
                            </td>
                            <td>
                              <span className={`shot-val mono ${!row.data ? 'dim' : ''}`}>
                                {row.data?.exitVelocity.toFixed(1) || '—'}
                              </span>
                              {row.base && row.data && (
                                <span className={`shot-delta mono ${(row.data.exitVelocity - row.base.exitVelocity) > 0 ? 'plus' : (row.data.exitVelocity - row.base.exitVelocity) < 0 ? 'minus' : 'zero'}`}>
                                  {(row.data.exitVelocity - row.base.exitVelocity) > 0 ? '+' : ''}{(row.data.exitVelocity - row.base.exitVelocity).toFixed(1)}
                                </span>
                              )}
                            </td>
                            <td>
                              <span className={`shot-val mono ${!row.data ? 'dim' : ''}`}>
                                {row.data?.launchAngle.toFixed(1) || '—'}
                              </span>
                              {row.base && row.data && (
                                <span className={`shot-delta mono ${(row.data.launchAngle - row.base.launchAngle) > 0 ? 'plus' : (row.data.launchAngle - row.base.launchAngle) < 0 ? 'minus' : 'zero'}`}>
                                  {(row.data.launchAngle - row.base.launchAngle) > 0 ? '+' : ''}{(row.data.launchAngle - row.base.launchAngle).toFixed(1)}
                                </span>
                              )}
                            </td>
                            <td>
                              <span className={`shot-val mono ${!row.data ? 'dim' : ''}`}>
                                {row.data?.exitDirection.toFixed(1) || '—'}
                              </span>
                              {row.base && row.data && (
                                <span className={`shot-delta mono ${(row.data.exitDirection - row.base.exitDirection) > 0 ? 'plus' : (row.data.exitDirection - row.base.exitDirection) < 0 ? 'minus' : 'zero'}`}>
                                  {(row.data.exitDirection - row.base.exitDirection) > 0 ? '+' : ''}{(row.data.exitDirection - row.base.exitDirection).toFixed(1)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {allShotNumbers.length === 0 && (
              <div className="h-[400px] flex flex-col items-center justify-center text-text-dim border-2 border-dashed border-border rounded-3xl">
                <Binary size={48} className="opacity-10 mb-4" />
                <p className="font-medium">Please enter data or load samples to start comparing.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Archive className="text-primary" size={24} />
                <h2 className="section-header">Session History</h2>
              </div>
              <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-md">
                <span className="text-xs font-bold text-text-dim uppercase tracking-wider">{savedSessions.length} SESSIONS SAVED</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {savedSessions.length === 0 ? (
                <div className="h-[400px] flex flex-col items-center justify-center text-text-dim border-2 border-dashed border-border rounded-3xl">
                  <History size={48} className="opacity-10 mb-4" />
                  <p className="font-medium">No saved sessions found.</p>
                </div>
              ) : (
                savedSessions.map(s => (
                  <div
                    key={s.id}
                    className={`history-row group ${currentSessionId === s.id ? 'active' : ''}`}
                    onClick={() => handleSessionClick(s)}
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="history-meta-text">
                        {new Date(s.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        <span className="mx-3 opacity-20">|</span>
                        {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex items-center gap-4">
                        <h3 className="history-session-type">{s.type.replace('_', ' ')}</h3>
                        <div className="flex items-center gap-2 px-2.5 py-0.5 bg-white/5 border border-white/5 rounded-md">
                          <span className="text-[10px] font-black text-white/40 tracking-tighter uppercase">Hits</span>
                          <span className="text-[11px] font-bold text-primary mono">{s.hit_count}</span>
                        </div>
                        {currentSessionId === s.id && (
                          <div className="history-active-indicator">
                            <div className="history-active-dot" />
                            CURRENTLY VIEWING
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleSessionClick(s)}
                        className={`history-load-btn ${currentSessionId === s.id ? 'active' : ''}`}
                      >
                        <Play size={14} fill="currentColor" />
                        LOAD SESSION
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(e, s.id)}
                        className="history-del-btn"
                        title="Delete Session"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
