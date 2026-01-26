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
                        <div key={session.id} className="history-item flex flex-col md:grid md:grid-cols-[140px_100px_1fr_auto] gap-4 p-4 items-center bg-white/5 border border-white/10 rounded-xl mb-4">
                            {/* Column 1: Mode */}
                            <div className="session-mode-badge w-full md:w-auto text-center md:text-left text-lg md:text-xl">
                                {session.mode.replace("_", " ")}
                            </div>

                            {/* Column 2: Shot Count */}
                            <div className="badge-count w-full md:w-auto justify-center md:justify-start">
                                {session.shotCount} SHOTS
                            </div>

                            {/* Column 3: Date/Time + Devices - Combined on mobile, split/grid on desktop */}
                            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto flex-1">
                                <div className="text-xs font-bold text-muted uppercase tracking-widest whitespace-nowrap">
                                    {session.date} • {session.time}
                                </div>

                                {/* Devices Input Area */}
                                <div className="flex flex-wrap justify-center md:justify-start gap-2 w-full">
                                    {isEditing ? (
                                        <>
                                            {session.devices.mlmds !== undefined && (
                                                <div className="flex items-center gap-1 bg-black/30 rounded p-1 border border-white/5">
                                                    <span className="text-[0.6rem] font-bold text-blue-400">MLM</span>
                                                    <input
                                                        className="bg-black/50 border border-white/10 rounded px-1 text-[0.65rem] text-white w-12 text-center"
                                                        value={editValues.mlmds}
                                                        onChange={(e) => setEditValues({ ...editValues, mlmds: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                            {session.devices.pro2 !== undefined && (
                                                <div className="flex items-center gap-1 bg-black/30 rounded p-1 border border-white/5">
                                                    <span className="text-[0.6rem] font-bold text-yellow-400">PRO2</span>
                                                    <input
                                                        className="bg-black/50 border border-white/10 rounded px-1 text-[0.65rem] text-white w-12 text-center"
                                                        value={editValues.pro2}
                                                        onChange={(e) => setEditValues({ ...editValues, pro2: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                            {session.devices.pro3 !== undefined && (
                                                <div className="flex items-center gap-1 bg-black/30 rounded p-1 border border-white/5">
                                                    <span className="text-[0.6rem] font-bold text-purple-400">PRO3</span>
                                                    <input
                                                        className="bg-black/50 border border-white/10 rounded px-1 text-[0.65rem] text-white w-12 text-center"
                                                        value={editValues.pro3}
                                                        onChange={(e) => setEditValues({ ...editValues, pro3: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {session.devices.mlmds && (
                                                <span className="device-chip-fw mlm text-[0.65rem] px-1.5 py-0.5">MLM: {session.devices.mlmds}</span>
                                            )}
                                            {session.devices.pro2 && (
                                                <span className="device-chip-fw pro2 text-[0.65rem] px-1.5 py-0.5">Pro2: {session.devices.pro2}</span>
                                            )}
                                            {session.devices.pro3 && (
                                                <span className="device-chip-fw pro3 text-[0.65rem] px-1.5 py-0.5">Pro3: {session.devices.pro3}</span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Column 5: Actions */}
                            <div className="flex gap-2 justify-end w-full md:w-auto md:pl-6 md:border-l border-white/10 pt-4 md:pt-0 border-t md:border-t-0">
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
