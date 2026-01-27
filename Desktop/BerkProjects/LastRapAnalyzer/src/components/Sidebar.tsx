type SidebarProps = {
    onUpload: (device: "mlmds" | "pro2" | "pro3", text: string) => void;
    synced: {
        mlmds: boolean;
        pro2: boolean;
        pro3: boolean;
    };
    onSave: (mode: "tee" | "soft_toss") => void;
    onReset: () => void;
    fwVersions: {
        mlmds: string;
        pro2: string;
        pro3: string;
    };
    onFwChange: (device: "mlmds" | "pro2" | "pro3", val: string) => void;
    activeView: "compare" | "history";
    onViewChange: (view: "compare" | "history") => void;
    isSessionSaved: boolean;
    resetLabel?: string;
    disabled?: boolean;
    collapsed?: boolean;
};

import React, { useState } from "react";
import { UploadCloud, Save, Activity, History as HistoryIcon, Zap, RotateCcw, CheckCircle2, ArrowLeft } from "lucide-react";
import { DeviceSync } from "./DeviceSync";


export const Sidebar: React.FC<SidebarProps> = ({
    onUpload, synced, onSave, onReset, fwVersions, onFwChange, activeView, onViewChange, isSessionSaved, resetLabel = "RESET DISCARD DATA", disabled = false, collapsed = false
}) => {
    const [sessionMode, setSessionMode] = useState<"tee" | "soft_toss">("tee");

    // Determine icon based on label text for simplicity, or add a prop if preferred.
    // "CLOSE SESSION" -> ArrowLeft (Reverse Arrow)
    // "RESET DISCARD DATA" -> RotateCcw
    const isCloseSession = resetLabel.includes("CLOSE");

    return (
        <div className={`sidebar ${collapsed ? 'collapsed' : ''} ${disabled ? 'opacity-90' : ''}`}>
            <div className="sidebar-inner">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <Activity size={24} className="text-primary" />
                        <div className="flex flex-col leading-none">
                            <span className="text-xl font-black italic tracking-tighter">RAP</span>
                            <span className="text-primary text-2xl font-bold tracking-[0.2em]">ANALYZER</span>
                        </div>
                    </div>

                    <div className="nav-tabs">
                        <button
                            className={`nav-tab ${activeView === "compare" ? "active" : ""}`}
                            onClick={() => onViewChange("compare")}
                        >
                            <Activity size={18} />
                            COMPARE
                        </button>
                        <button
                            className={`nav-tab ${activeView === "history" ? "active" : ""}`}
                            onClick={() => onViewChange("history")}
                        >
                            <HistoryIcon size={18} />
                            HISTORY
                        </button>
                    </div>
                </div>

                <div className={`sidebar-content ${disabled ? 'opacity-50 grayscale' : ''}`}>
                    <div className="session-mode-section">
                        <div className="section-label">
                            <Zap size={14} />
                            SESSION MODE
                        </div>
                        <div className="toggle-group">
                            <button
                                className={`toggle-btn ${sessionMode === "tee" ? "active" : ""}`}
                                onClick={() => !disabled && setSessionMode("tee")}
                                disabled={disabled}
                            >
                                TEE
                            </button>
                            <button
                                className={`toggle-btn ${sessionMode === "soft_toss" ? "active" : ""}`}
                                onClick={() => !disabled && setSessionMode("soft_toss")}
                                disabled={disabled}
                            >
                                SOFT TOSS
                            </button>
                        </div>
                    </div>

                    <div className="upload-section-title">
                        <UploadCloud size={14} />
                        CSV UPLOAD
                    </div>

                    <div style={{ pointerEvents: disabled ? "none" : "auto" }}>
                        <DeviceSync
                            name="MLM"
                            label="MLM DS"
                            type="mlm"
                            isSynced={synced.mlmds}
                            fwVersion={fwVersions.mlmds}
                            onFwChange={(val) => onFwChange("mlmds", val)}
                            onUpload={(text: string) => onUpload("mlmds", text)}
                        />

                        <DeviceSync
                            name="PRO 2.0"
                            label="PRO 2.0"
                            type="pro2"
                            isSynced={synced.pro2}
                            fwVersion={fwVersions.pro2}
                            onFwChange={(val: string) => onFwChange("pro2", val)}
                            onUpload={(text: string) => onUpload("pro2", text)}
                        />

                        <DeviceSync
                            name="PRO 3.0"
                            label="PRO 3.0"
                            type="pro3"
                            isSynced={synced.pro3}
                            fwVersion={fwVersions.pro3}
                            onFwChange={(val) => onFwChange("pro3", val)}
                            onUpload={(text: string) => onUpload("pro3", text)}
                        />
                    </div>

                    <button
                        className={`btn-save-comparison ${isSessionSaved ? 'disabled' : ''}`}
                        onClick={() => !isSessionSaved && !disabled && onSave(sessionMode)}
                        disabled={disabled || isSessionSaved}
                        style={isSessionSaved ? { opacity: 0.5, cursor: 'not-allowed', background: '#22c55e', color: 'white' } : {}}
                    >
                        {isSessionSaved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                        {isSessionSaved ? "SAVED RESULT" : "SAVE RESULTS"}
                    </button>
                </div>

                <button className="btn-reset" onClick={onReset} style={{
                    marginTop: "0.5rem",
                    width: "100%",
                    padding: "0.5rem",
                    background: "rgba(239, 68, 68, 0.05)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "8px",
                    color: "#ef4444",
                    fontSize: "0.6rem",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                }}>
                    {isCloseSession ? <ArrowLeft size={16} /> : <RotateCcw size={12} />}
                    {resetLabel}
                </button>
            </div>
        </div>
    );
};
