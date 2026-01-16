import React from "react";
import { Trash2, Archive } from "lucide-react";

export type SavedSession = {
    id: string;
    date: string;
    time: string;
    mode: "tee" | "soft_toss";
    shotCount: number;
    devices: {
        mlmds?: string;
        pro2?: string;
        pro3?: string;
    };
};

type HistoryViewProps = {
    sessions: SavedSession[];
    onLoad: (session: SavedSession) => void;
    onDelete: (id: string) => void;
};

export const HistoryView: React.FC<HistoryViewProps> = ({ sessions, onLoad, onDelete }) => {
    return (
        <div className="history-page">
            <div className="history-header">
                <div className="flex items-center gap-4">
                    <div className="history-logo-box">
                        <Archive size={32} className="text-primary" />
                    </div>
                    <h1 className="text-3xl font-black italic tracking-tighter m-0">
                        Session History
                    </h1>
                </div>
                <div className="text-sm font-black tracking-widest text-muted uppercase">
                    {sessions.length} SESSIONS SAVED
                </div>
            </div>

            <div className="history-grid">
                {sessions.map((session) => (
                    <div key={session.id} className="history-item" style={{
                        display: "grid",
                        gridTemplateColumns: "140px 100px 220px 1fr auto",
                        alignItems: "center",
                        gap: "1rem"
                    }}>
                        {/* Column 1: Mode */}
                        <div className="session-mode-badge" style={{ fontSize: "1.2rem" }}>
                            {session.mode.replace("_", " ")}
                        </div>

                        {/* Column 2: Shot Count */}
                        <div className="badge-count">
                            {session.shotCount} SHOTS
                        </div>

                        {/* Column 3: Date/Time */}
                        <div className="text-xs font-bold text-muted uppercase tracking-widest">
                            {session.date} • {session.time}
                        </div>

                        {/* Column 4: Devices */}
                        <div className="flex items-center gap-3">
                            {session.devices.mlmds && (
                                <span className="device-chip-fw mlm">MLM: {session.devices.mlmds} FW</span>
                            )}
                            {session.devices.pro2 && (
                                <span className="device-chip-fw pro2">PRO2: {session.devices.pro2} FW</span>
                            )}
                            {session.devices.pro3 && (
                                <span className="device-chip-fw pro3">PRO3: {session.devices.pro3} FW</span>
                            )}
                        </div>

                        {/* Column 5: Actions */}
                        <div className="flex gap-3 justify-end pl-6 border-l" style={{ borderColor: "var(--glass-border)" }}>
                            <button className="btn-load-history" onClick={() => onLoad(session)}>
                                LOAD
                            </button>
                            <button className="btn-delete-history" onClick={() => onDelete(session.id)}>
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}

                {sessions.length === 0 && (
                    <div className="text-center py-20 text-muted opacity-50">
                        <Archive size={48} className="mb-4 mx-auto block" />
                        <p className="text-lg font-bold">No saved sessions yet.</p>
                        <p className="text-sm">Save your comparison results to see them here.</p>
                    </div>
                )}
            </div>
        </div >
    );
};
