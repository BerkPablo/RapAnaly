import React, { useState, useMemo } from 'react';
import type { ShotData, DeviceType, SessionType } from './types';
import { parseShotCSV } from './utils/csvParser';
import { saveSession, getSessions, getSessionHits } from './utils/db';
import ManualEntry from './components/ManualEntry';
import { Upload, Activity, Trash2, Binary, LayoutDashboard, Layers, Save, CheckCircle2, History, ChevronRight, Clock } from 'lucide-react';

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
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
            <LayoutDashboard className="text-primary" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none text-white">RAP ANALYZER</h1>
            <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mt-1">Benchmarking</p>
          </div>
        </div>

        <ManualEntry onAddShot={addMlmShot} />

        <div className="sidebar-card">
          <div className="sidebar-title">
            <Layers size={14} className="text-primary" />
            SESSION & RADAR SYNC
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
              className={`btn-primary w-full ${isSaving || !!currentSessionId ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSaving ? (
                <Activity size={14} className="animate-spin" />
              ) : saveSuccess ? (
                <CheckCircle2 size={14} className="text-green-400" />
              ) : (
                <Save size={14} />
              )}
              {currentSessionId ? 'SESSION SAVED' : saveSuccess ? 'SAVED TO CLOUD' : isSaving ? 'SAVING...' : 'SAVE TO DATABASE'}
            </button>
          </div>
        </div>

        <div className="sidebar-card overflow-hidden flex flex-col max-h-[300px]">
          <div className="sidebar-title sticky top-0 bg-card/80 backdrop-blur-md z-10 pb-2">
            <History size={14} className="text-primary" />
            SESSION HISTORY
            {currentSessionId && (
              <button onClick={resetToNew} className="ml-auto btn-mini-action">
                New Session
              </button>
            )}
          </div>
          <div className="history-list overflow-y-auto pr-1 relative min-h-[50px]">
            {isLoadingHistory && (
              <div className="absolute inset-0 bg-card/60 backdrop-blur-[2px] z-20 flex items-center justify-center">
                <Activity size={16} className="text-primary animate-spin" />
              </div>
            )}
            {savedSessions.length === 0 ? (
              <div className="text-[10px] text-text-dim/50 italic py-4 text-center">No saved sessions yet</div>
            ) : (
              savedSessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSessionClick(s)}
                  className={`history-item group ${currentSessionId === s.id ? 'active' : ''}`}
                >
                  <div className="flex flex-col items-start gap-1 w-full">
                    <span className="history-type">
                      {s.type.replace('_', ' ')}
                    </span>
                    <div className="history-meta">
                      <Clock size={10} className="text-primary/60" />
                      <span className="history-date">
                        {new Date(s.date).toLocaleDateString()} {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="history-chevron" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="mt-auto control-stack">
          <button onClick={clearSession} className="btn-outline text-red-400 border-red-900/20 hover:bg-red-950/20">
            <Trash2 size={14} /> RESET DISCARD DATA
          </button>
        </div>
      </aside>

      <main className="main-scroll">
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
      </main>
    </div>
  );
};

export default App;
