import { useState, useMemo, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { HistoryView, type SavedSession } from "./components/HistoryView";
import { LoginPage } from "./components/LoginPage";
import { OnboardingPage } from "./components/OnboardingPage";
import { DeleteConfirmationModal } from "./components/DeleteConfirmationModal";
import { SaveSuccessModal } from "./components/SaveSuccessModal";
import { ResetConfirmationModal } from "./components/ResetConfirmationModal";
import { parseDeviceCsv } from "./utils/csvParser";
import type { Row, DeviceData } from "./utils/statsEngine";
import { supabase } from "./lib/supabase";

function App() {
  const [deviceData, setDeviceData] = useState<{
    mlmds: Record<string, DeviceData>;
    pro2: Record<string, DeviceData>;
    pro3: Record<string, DeviceData>;
  }>({
    mlmds: {},
    pro2: {},
    pro3: {},
  });

  const [viewMode, setViewMode] = useState<"login" | "onboarding" | "app">("login");
  const [user, setUser] = useState<any>(null);

  const [fwVersions, setFwVersions] = useState({
    mlmds: "2V",
    pro2: "3V",
    pro3: "4V",
  });

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session) {
        setViewMode("app"); // Skip onboarding on reload for authorized users
        loadSessions();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) {
        // If we were at login, go to onboarding. If already in app, stay.
        setViewMode((prev) => prev === "login" ? "onboarding" : prev);
        loadSessions();
      } else {
        setViewMode("login");
        setSessions([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const onUpload = (device: "mlmds" | "pro2" | "pro3", text: string) => {
    const parsed = parseDeviceCsv(text);
    if (parsed.error) {
      alert(`Error parsing ${device}: ${parsed.error}`);
      return;
    }
    setDeviceData((prev) => ({
      ...prev,
      [device]: parsed.rows,
    }));
  };

  const mergedRows = useMemo(() => {
    // We only care about shots that have an MLM DS entry as the baseline
    const mlmShots = Object.keys(deviceData.mlmds);
    if (mlmShots.length === 0) return [];

    const emptyDeviceData: DeviceData = {
      distance: "-",
      exitVelo: "-",
      launchAngle: "-",
      exitDir: "-",
    };

    return mlmShots.map((id) => ({
      shotId: id,
      mlmds: deviceData.mlmds[id],
      pro2: deviceData.pro2[id] || emptyDeviceData,
      pro3: deviceData.pro3[id] || emptyDeviceData,
    })) as Row[];
  }, [deviceData]);

  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [activeView, setActiveView] = useState<"compare" | "history">("compare");
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; sessionId: string | null }>({
    isOpen: false,
    sessionId: null
  });
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
  const [isSessionSaved, setIsSessionSaved] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const loadSessions = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error loading sessions:", error);
      // Fallback to local storage if DB fails (e.g. table doesn't exist yet)
      const stored = localStorage.getItem("rap_analyzer_sessions");
      if (stored) {
        try { setSessions(JSON.parse(stored)); } catch (e) { }
      }
      return;
    }

    if (data) {
      const mappedSessions: SavedSession[] = data.map((s: any) => {
        const d = new Date(s.created_at);
        return {
          id: s.id,
          date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          mode: s.mode,
          shotCount: s.shot_count,
          devices: s.device_metadata
        };
      });
      setSessions(mappedSessions);
    }
  };

  const onSave = async (mode: "tee" | "soft_toss") => {
    if (mergedRows.length === 0) return;
    if (!user) {
      alert("You must be logged in to save sessions.");
      return;
    }

    const sessionPayload = {
      user_id: user.id,
      mode,
      shot_count: mergedRows.length,
      device_metadata: {
        mlmds: synced.mlmds ? fwVersions.mlmds : undefined,
        pro2: synced.pro2 ? fwVersions.pro2 : undefined,
        pro3: synced.pro3 ? fwVersions.pro3 : undefined,
      },
      data: mergedRows
    };

    const { error } = await supabase.from('sessions').insert(sessionPayload);

    if (error) {
      console.error("Save error:", error);
      alert(`Failed to save to database: ${error.message}`);
      return;
    }

    // Also update UI optimistically or reload
    await loadSessions();
    setSaveSuccessOpen(true);
    setIsSessionSaved(true);
  };

  const onLoad = (session: SavedSession) => {
    supabase.from('sessions').select('data').eq('id', session.id).single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching session:", error);
          alert("Error loading session data.");
          return;
        }

        if (data && data.data) {
          const rows = data.data as Row[];
          
          const newDeviceData: {
            mlmds: Record<string, DeviceData>;
            pro2: Record<string, DeviceData>;
            pro3: Record<string, DeviceData>;
          } = {
            mlmds: {},
            pro2: {},
            pro3: {},
          };

          rows.forEach((r) => {
            if (r.mlmds) newDeviceData.mlmds[r.shotId] = r.mlmds;
            // Handle potentially missing device data in older saves or just safety
            if (r.pro2) newDeviceData.pro2[r.shotId] = r.pro2;
            if (r.pro3) newDeviceData.pro3[r.shotId] = r.pro3;
          });

          setDeviceData(newDeviceData);
          setActiveView("compare");
          // Optional: Restore firmware versions if they were saved in metadata
          if (session.devices) {
             setFwVersions(prev => ({
                 ...prev,
                 mlmds: session.devices.mlmds || prev.mlmds,
                 pro2: session.devices.pro2 || prev.pro2,
                 pro3: session.devices.pro3 || prev.pro3,
             }));
          }
        }
      });
  };

  const onDelete = (id: string) => {
    setDeleteModalState({ isOpen: true, sessionId: id });
  };

  const confirmDelete = async () => {
    if (deleteModalState.sessionId) {
      const { error } = await supabase.from('sessions').delete().eq('id', deleteModalState.sessionId);
      if (error) {
        alert("Failed to delete:" + error.message);
      } else {
        loadSessions();
      }
      setDeleteModalState({ isOpen: false, sessionId: null });
    }
  };

  const onReset = () => {
    setResetModalOpen(true);
  };

  const confirmReset = () => {
    setDeviceData({ mlmds: {}, pro2: {}, pro3: {} });
    setIsSessionSaved(false);
    setResetModalOpen(false);
  };

  const synced = {
    mlmds: Object.keys(deviceData.mlmds).length > 0,
    pro2: Object.keys(deviceData.pro2).length > 0,
    pro3: Object.keys(deviceData.pro3).length > 0,
  };


  if (viewMode === "login") {
    return <LoginPage />;
  }

  if (viewMode === "onboarding") {
    return <OnboardingPage onComplete={() => setViewMode("app")} />;
  }

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        onUpload={onUpload}
        synced={synced}
        onSave={onSave}
        isSessionSaved={isSessionSaved}
        onReset={onReset}
        fwVersions={fwVersions}
        onFwChange={(device, val) => setFwVersions(prev => ({ ...prev, [device]: val }))}
        activeView={activeView}
        onViewChange={setActiveView}
      />
      <div className="main-content" style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        {activeView === "compare" ? (
          <Dashboard rows={mergedRows} onLogout={() => supabase.auth.signOut()} />
        ) : (
          <HistoryView
            sessions={sessions}
            onLoad={(s: SavedSession) => {
              onLoad(s);
              setActiveView("compare");
            }}
            onDelete={onDelete}
          />
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, sessionId: null })}
        onConfirm={confirmDelete}
      />
      <SaveSuccessModal
        isOpen={saveSuccessOpen}
        onClose={() => setSaveSuccessOpen(false)}
      />
      <ResetConfirmationModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onConfirm={confirmReset}
      />
    </div>
  );
}

export default App;
