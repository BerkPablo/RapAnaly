import React, { useState } from "react";
import { Trash2, Archive, Edit2, Check, X } from "lucide-react";

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
    onUpdate: (id: string, newDevices: { mlmds?: string; pro2?: string; pro3?: string }) => void;
};

export const HistoryView: React.FC<HistoryViewProps> = ({ sessions, onLoad, onDelete, onUpdate }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<{ mlmds: string; pro2: string; pro3: string }>({ mlmds: "", pro2: "", pro3: "" });

    const startEditing = (session: SavedSession) => {
        setEditingId(session.id);
        setEditValues({
            mlmds: session.devices.mlmds || "",
            pro2: session.devices.pro2 || "",
            pro3: session.devices.pro3 || ""
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
    };

    const saveEditing = (id: string) => {
        const newDevices: any = {};
        if (editValues.mlmds) newDevices.mlmds = editValues.mlmds;
        if (editValues.pro2) newDevices.pro2 = editValues.pro2;
        if (editValues.pro3) newDevices.pro3 = editValues.pro3;
        onUpdate(id, newDevices);
        setEditingId(null);
    };

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
                {sessions.map((session) => {
                    const isEditing = editingId === session.id;

                    return (
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
                                {isEditing ? (
                                    <>
                                        {session.devices.mlmds !== undefined && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-[0.6rem] font-bold text-blue-400">MLM DS</span>
                                                <input
                                                    className="bg-black/50 border border-white/10 rounded px-1 py-0.5 text-xs text-white w-12"
                                                    value={editValues.mlmds}
                                                    onChange={(e) => setEditValues({ ...editValues, mlmds: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        {session.devices.pro2 !== undefined && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-[0.6rem] font-bold text-yellow-400">PRO 2.0</span>
                                                <input
                                                    className="bg-black/50 border border-white/10 rounded px-1 py-0.5 text-xs text-white w-12"
                                                    value={editValues.pro2}
                                                    onChange={(e) => setEditValues({ ...editValues, pro2: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        {session.devices.pro3 !== undefined && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-[0.6rem] font-bold text-purple-400">PRO 3.0</span>
                                                <input
                                                    className="bg-black/50 border border-white/10 rounded px-1 py-0.5 text-xs text-white w-12"
                                                    value={editValues.pro3}
                                                    onChange={(e) => setEditValues({ ...editValues, pro3: e.target.value })}
                                                />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {session.devices.mlmds && (
                                            <span className="device-chip-fw mlm">MLM DS: {session.devices.mlmds} FW</span>
                                        )}
                                        {session.devices.pro2 && (
                                            <span className="device-chip-fw pro2">PRO 2.0: {session.devices.pro2} FW</span>
                                        )}
                                        {session.devices.pro3 && (
                                            <span className="device-chip-fw pro3">PRO 3.0: {session.devices.pro3} FW</span>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Column 5: Actions */}
                            <div className="flex gap-2 justify-end pl-6 border-l" style={{ borderColor: "var(--glass-border)" }}>
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={() => saveEditing(session.id)}
                                            className="p-2 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            onClick={cancelEditing}
                                            className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            className="p-2 hover:bg-white/10 text-muted hover:text-white rounded-lg transition-colors"
                                            onClick={() => startEditing(session)}
                                            title="Edit Firmware Versions"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="btn-load-history" onClick={() => onLoad(session)}>
                                            LOAD
                                        </button>
                                        <button className="btn-delete-history" onClick={() => onDelete(session.id)}>
                                            <Trash2 size={18} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}

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
