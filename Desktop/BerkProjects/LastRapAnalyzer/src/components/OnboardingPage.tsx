import React from "react";
import { ArrowRight, Info, CheckCircle2, BarChart2 } from "lucide-react";

type OnboardingPageProps = {
    onComplete: () => void;
};

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onComplete }) => {
    return (
        <div style={{
            width: "100%",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(circle at top right, #1e293b, #0f172a)",
            position: "relative",
            overflow: "hidden"
        }}>
            <div className="glass-card" style={{
                width: "900px",
                maxHeight: "90vh",
                overflowY: "auto",
                padding: "3rem",
                display: "flex",
                flexDirection: "column",
                zIndex: 1,
                background: "rgba(15, 23, 42, 0.6)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.1)"
            }}>
                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-black italic tracking-tighter m-0 mb-3">
                        Welcome to <span className="text-primary">RAP ANALYZER</span>
                    </h1>
                    <p className="text-muted text-lg" style={{ color: "var(--text-muted)" }}>
                        Advanced Shot Analysis & Device Comparison
                    </p>
                </div>

                {/* Explicit Formula Section */}
                <div className="mb-10 p-6 rounded-xl border border-primary/20 bg-primary/5 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">Core Calculation Logic</span>
                    <div className="text-2xl font-black text-white font-mono bg-black/20 px-6 py-3 rounded-lg border border-white/10">
                        Difference = <span className="text-blue-400">MLM Value</span> - <span className="text-yellow-400">Ref Device</span>
                    </div>
                    <p className="text-xs text-muted mt-3 max-w-md">
                        All statistics (Bias, AbsDiff, STD) are calculated based on this direction.
                        A <span className="text-blue-400 font-bold">negative</span> result means MLM read lower than the Reference.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10">
                    {/* Metric Logic Column */}
                    <div>
                        <div className="flex items-center gap-3 mb-5 border-b border-white/10 pb-2">
                            <Info className="text-primary" size={20} />
                            <h3 className="text-lg font-bold m-0 uppercase tracking-widest">Metric Definitions</h3>
                        </div>

                        <div className="space-y-6">
                            <div className="glass-card p-4 bg-white/5 border-white/5">
                                <h4 className="text-xs font-black text-muted uppercase tracking-widest mb-3">Data Capture</h4>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex justify-between">
                                        <span className="text-white font-bold">Capture (n)</span>
                                        <span className="text-muted">Valid shots on BOTH devices</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span className="text-white font-bold">Capture (%)</span>
                                        <span className="text-muted">Efficiency rate</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="glass-card p-4 bg-white/5 border-white/5">
                                <h4 className="text-xs font-black text-muted uppercase tracking-widest mb-3">Statistical Error</h4>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex justify-between">
                                        <span className="text-white font-bold">Bias (AvgDiff)</span>
                                        <span className="text-muted">Systematic error direction</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span className="text-white font-bold">AbsDiff</span>
                                        <span className="text-muted">Avg magnitude of error</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span className="text-white font-bold">STD</span>
                                        <span className="text-muted">Consistency / Dispersion</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Classification Column */}
                    <div>
                        <div className="flex items-center gap-3 mb-5 border-b border-white/10 pb-2">
                            <BarChart2 className="text-primary" size={20} />
                            <h3 className="text-lg font-bold m-0 uppercase tracking-widest">Accuracy Tiers</h3>
                        </div>

                        <div className="space-y-3">
                            <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-l-green-500 bg-gradient-to-r from-green-500/10 to-transparent">
                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                                    <CheckCircle2 size={16} />
                                </div>
                                <div>
                                    <div className="font-black text-green-400 uppercase tracking-wider text-sm">Good</div>
                                    <div className="text-xs text-muted">High accuracy, minimal deviation</div>
                                </div>
                            </div>

                            <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-500/10 to-transparent">
                                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                                    <Info size={16} />
                                </div>
                                <div>
                                    <div className="font-black text-yellow-400 uppercase tracking-wider text-sm">Moderate</div>
                                    <div className="text-xs text-muted">Acceptable variance range</div>
                                </div>
                            </div>

                            <div className="glass-card p-4 flex items-center gap-4 border-l-4 border-l-red-500 bg-gradient-to-r from-red-500/10 to-transparent">
                                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                                    <Info size={16} />
                                </div>
                                <div>
                                    <div className="font-black text-red-400 uppercase tracking-wider text-sm">Bad</div>
                                    <div className="text-xs text-muted">Significant outlier</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-auto pt-8 border-t border-white/10">
                    <h3 className="text-center text-xs font-black uppercase tracking-[0.3em] text-muted mb-6">Workflow</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4">
                            <div className="w-10 h-10 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-primary mb-3 font-bold">1</div>
                            <h4 className="font-bold text-white text-sm mb-1">Upload CSV</h4>
                            <p className="text-xs text-muted">Import data for MLM DS and Pro 2.0/3.0</p>
                        </div>
                        <div className="text-center p-4">
                            <div className="w-10 h-10 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-primary mb-3 font-bold">2</div>
                            <h4 className="font-bold text-white text-sm mb-1">Compare</h4>
                            <p className="text-xs text-muted">View side-by-side metrics and diffs</p>
                        </div>
                        <div className="text-center p-4">
                            <div className="w-10 h-10 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-primary mb-3 font-bold">3</div>
                            <h4 className="font-bold text-white text-sm mb-1">Save & Track</h4>
                            <p className="text-xs text-muted">Store session results in history</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onComplete}
                    className="btn-primary flex items-center justify-center gap-2 mt-8 w-full py-4 text-lg tracking-widest hover:scale-[1.01] active:scale-[0.99]"
                >
                    ENTER DASHBOARD
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};
