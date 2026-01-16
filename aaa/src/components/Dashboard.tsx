import React, { useMemo, useState } from "react";
import { ComparisonTable } from "./ComparisonTable";
import { StatsCards } from "./StatsCards";
import { computeMetric, METRICS, isValidValue } from "../utils/statsEngine";
import type { Row, Device, MetricKey } from "../utils/statsEngine";
import { Info, LayoutDashboard, FileBarChart2 } from "lucide-react";
import { ShotAnalysis } from "./ShotAnalysis";

type DashboardProps = {
    rows: Row[];
    onLogout: () => void;
};

export const Dashboard: React.FC<DashboardProps> = ({ rows, onLogout }) => {
    const [activeTab, setActiveTab] = useState<Device>("pro2");

    const results = useMemo(() => {
        // Here: Test Device = "mlmds", Reference Device = activeTab (pro2 or pro3)
        return METRICS.map((m) => computeMetric(rows, "mlmds", activeTab, m.key));
    }, [rows, activeTab]);

    const averages = useMemo(() => {
        const getAvg = (device: "mlmds" | "pro2" | "pro3", key: MetricKey) => {
            const vals = rows.map(r => r[device][key]).filter(isValidValue) as number[];
            return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        };

        return {
            mlmds: METRICS.reduce((acc, m) => ({ ...acc, [m.key]: getAvg("mlmds", m.key) }), {} as Record<MetricKey, number | null>),
            pro2: METRICS.reduce((acc, m) => ({ ...acc, [m.key]: getAvg("pro2", m.key) }), {} as Record<MetricKey, number | null>),
            pro3: METRICS.reduce((acc, m) => ({ ...acc, [m.key]: getAvg("pro3", m.key) }), {} as Record<MetricKey, number | null>),
        };
    }, [rows]);


    return (
        <div className="flex flex-col gap-6 p-6" style={{ maxWidth: "1400px", margin: "0 auto" }}>
            <header className="flex justify-between items-center">
                <div className="flex flex-col">
                    <h1 className="text-3xl m-0 flex items-center gap-3 font-black italic uppercase tracking-wider">
                        <LayoutDashboard className="text-primary" size={32} />
                        Session Compare
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    {rows.length > 0 && (
                        <div className="glass-card p-2 px-4 flex items-center gap-3">
                            <FileBarChart2 size={16} className="text-primary" />
                            <span className="text-sm font-medium">{rows.length} Total Shots</span>
                        </div>
                    )}
                    <button
                        onClick={onLogout}
                        className="btn-primary flex items-center gap-2"
                        style={{ padding: "0.5rem 1rem", fontSize: "0.8rem" }}
                    >
                        LOG OUT
                    </button>
                </div>
            </header>

            <main className="flex flex-col">
                <div className="flex gap-8 mb-16">
                    <button
                        className={`btn-tab ${activeTab === "pro2" ? "active" : ""}`}
                        onClick={() => setActiveTab("pro2")}
                    >
                        Pro 2.0 (Ref) ↔ MLM DS (Test)
                    </button>
                    <button
                        className={`btn-tab ${activeTab === "pro3" ? "active" : ""}`}
                        onClick={() => setActiveTab("pro3")}
                    >
                        Pro 3.0 (Ref) ↔ MLM DS (Test)
                    </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "2rem", marginTop: "1.5rem" }}>
                    <StatsCards results={results} />

                    <ComparisonTable results={results} />
                </div>

                {/* Explicit Spacer */}
                <div style={{ minHeight: "30px", width: "100%", display: "block" }}></div>

                {/* Average Data Section */}
                <div className="glass-card overflow-hidden">
                    <div className="p-4 px-6 border-bottom flex items-center gap-2" style={{ borderBottom: "1px solid var(--glass-border)" }}>
                        <Info size={16} className="text-primary" />
                        <span className="text-sm font-bold uppercase tracking-wider">Session Averages</span>
                    </div>
                    <div className="shot-grid">
                        {/* Reference Row (Pro2/Pro3) - Now on TOP */}
                        <div className="shot-grid-row">
                            <div className="flex items-center">
                                <span className={`device-pill ${activeTab}`}>
                                    {activeTab === "pro2" ? "PRO 2.0" : "PRO 3.0"} AVG (REF)
                                </span>
                            </div>
                            {[
                                { key: "distance", label: "DISTANCE" },
                                { key: "exitVelo", label: "VELO" },
                                { key: "launchAngle", label: "ANGLE" },
                                { key: "exitDir", label: "DIR" }
                            ].map((m) => (
                                <div key={m.key} className="flex flex-col">
                                    <div className="shot-grid-header">{m.label}</div>
                                    <div className="shot-grid-value">{(averages[activeTab][m.key as MetricKey] ?? 0).toFixed(1)}</div>
                                </div>
                            ))}
                        </div>

                        {/* Test Row (MLM DS) - Now on BOTTOM */}
                        <div className="shot-grid-row">
                            <div className="flex items-center mt-4">
                                <span className="device-pill mlm">MLM AVG (TEST)</span>
                            </div>
                            {[
                                { key: "distance", label: "DISTANCE" },
                                { key: "exitVelo", label: "VELO" },
                                { key: "launchAngle", label: "ANGLE" },
                                { key: "exitDir", label: "DIR" }
                            ].map((m) => {
                                const k = m.key as MetricKey;
                                const val = averages.mlmds[k]; // Test Value
                                const ref = averages[activeTab][k]; // Reference Value
                                const diff = (val !== null && ref !== null) ? val - ref : undefined;
                                const diffClass = diff === undefined || Math.abs(diff) < 0.001 ? "zero" : diff > 0 ? "pos" : "neg";

                                return (
                                    <div key={m.key} className="flex flex-col mt-4">
                                        <div className="shot-grid-header">{m.label}</div>
                                        <div className="flex items-baseline gap-2">
                                            <div className="shot-grid-value">{(val ?? 0).toFixed(1)}</div>
                                            {diff !== undefined && (
                                                <span className={`diff-value ${diffClass}`}>
                                                    {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <ShotAnalysis rows={rows} />

            </main>
        </div >
    );
};
