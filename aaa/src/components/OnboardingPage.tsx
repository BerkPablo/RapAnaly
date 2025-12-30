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
                width: "800px",
                maxHeight: "90vh",
                overflowY: "auto",
                padding: "3rem",
                display: "flex",
                flexDirection: "column",
                zIndex: 1
            }}>
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-black italic tracking-tighter m-0 mb-2">
                        Welcome to <span className="text-primary">RAP ANALYZER</span>
                    </h1>
                    <p className="text-muted" style={{ color: "var(--text-muted)" }}>
                        Before you begin, here is how the statistics are calculated.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="glass-card" style={{ padding: "1.5rem", background: "rgba(255,255,255,0.02)" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Info className="text-primary" size={20} />
                            <h3 className="text-lg font-bold m-0">Metric Logic</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-6 text-xs text-muted" style={{ color: "var(--text-muted)" }}>
                            <div>
                                <h4 className="text-white font-bold mb-2 uppercase tracking-wider">Data & Capture</h4>
                                <ul className="space-y-1">
                                    <li><strong className="text-primary">Count:</strong> Total number of shots in the reference (MLM DS) session.</li>
                                    <li><strong className="text-primary">Capture (n):</strong> Number of shots where BOTH devices recorded a valid value (non-zero/non-null).</li>
                                    <li><strong className="text-primary">Capture (%):</strong> <code>(Capture(n) / Count) * 100</code>. The efficiency of the comparison device.</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-white font-bold mb-2 uppercase tracking-wider">Difference Metrics</h4>
                                <ul className="space-y-1">
                                    <li><strong className="text-primary">AvgDiff (Bias):</strong> Average of <code>(Pro Value - MLM Value)</code>. Indicates systematic error (high or low).</li>
                                    <li><strong className="text-primary">AvgAbsDiff:</strong> Average of <code>|Pro Value - MLM Value|</code>. The average magnitude of error.</li>
                                    <li><strong className="text-primary">Median:</strong> The middle value of the Difference set. Less sensitive to outliers than Average.</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-white font-bold mb-2 uppercase tracking-wider">Statistical Spread</h4>
                                <ul className="space-y-1">
                                    <li><strong className="text-primary">Min / Max:</strong> The smallest and largest Difference values observed.</li>
                                    <li><strong className="text-primary">STD (Standard Deviation):</strong> Measures dispersion. <code>√(Σ(x - mean)² / (n-1))</code>. Lower is more consistent.</li>
                                    <li><strong className="text-primary">90th PCTL (P90):</strong> The value below which 90% of the absolute differences fall. A reliable accuracy upper bound.</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-white font-bold mb-3 uppercase tracking-wider">Classification & Thresholds</h4>
                                <div className="space-y-3">
                                    <div className="text-xs mb-2">
                                        <strong className="text-primary">Thresholds:</strong> Dynamic limits (A & B) specific to each metric type.
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="flex items-center p-2 rounded bg-green-500/10 border border-green-500/20">
                                            <div className="w-2 h-2 rounded-full bg-green-500 mr-3 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                            <div className="flex flex-col">
                                                <span className="text-green-400 font-bold uppercase tracking-wider text-[0.65rem]">Good</span>
                                                <span className="text-[0.65rem] opacity-80">Diff &lt; Threshold A</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                                            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-3 shadow-[0_0_8px_rgba(234,179,8,0.6)]"></div>
                                            <div className="flex flex-col">
                                                <span className="text-yellow-400 font-bold uppercase tracking-wider text-[0.65rem]">Moderate</span>
                                                <span className="text-[0.65rem] opacity-80">Between A & B</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center p-2 rounded bg-red-500/10 border border-red-500/20">
                                            <div className="w-2 h-2 rounded-full bg-red-500 mr-3 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                                            <div className="flex flex-col">
                                                <span className="text-red-400 font-bold uppercase tracking-wider text-[0.65rem]">Bad</span>
                                                <span className="text-[0.65rem] opacity-80">Diff &gt; Threshold B</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: "1.5rem", background: "rgba(255,255,255,0.02)" }}>
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart2 className="text-primary" size={20} />
                            <h3 className="text-lg font-bold m-0">Accuracy Classification</h3>
                        </div>
                        <ul className="text-sm text-muted flex flex-col gap-3" style={{ color: "var(--text-muted)", listStyle: "none", padding: 0 }}>
                            <li className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <strong>Good:</strong> Difference within tight tolerance
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                <strong>Moderate:</strong> Acceptable deviation
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <strong>Bad:</strong> Significant outlier
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-lg font-bold mb-4">How to Use</h3>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                            <div className="rounded-full bg-primary/20 p-1 mt-1 text-primary">
                                <CheckCircle2 size={16} />
                            </div>
                            <div>
                                <strong className="block text-white">1. Upload CSV Data</strong>
                                <span className="text-sm text-muted" style={{ color: "var(--text-muted)" }}>: Use the sidebar to upload CSV files for MLM DS, PRO 2.0, or PRO 3.0.</span>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="rounded-full bg-primary/20 p-1 mt-1 text-primary">
                                <CheckCircle2 size={16} />
                            </div>
                            <div>
                                <strong className="block text-white">2. Compare Sessions</strong>
                                <span className="text-sm text-muted" style={{ color: "var(--text-muted)" }}>: Toggle between Pro 2.0 and Pro 3.0 tabs to see detailed side-by-side comparisons.</span>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="rounded-full bg-primary/20 p-1 mt-1 text-primary">
                                <CheckCircle2 size={16} />
                            </div>
                            <div>
                                <strong className="block text-white">3. Analyze & Save</strong>
                                <span className="text-sm text-muted" style={{ color: "var(--text-muted)" }}>: Review the statistical breakdown and save your session results to history.</span>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onComplete}
                    className="btn-primary flex items-center justify-center gap-2 mt-auto self-end"
                    style={{ padding: "1rem 2rem", fontSize: "1rem" }}
                >
                    GET STARTED
                    <ArrowRight size={20} />
                </button>
            </div>
        </div>
    );
};
