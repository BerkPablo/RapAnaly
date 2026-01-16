import React from "react";
import { Activity, Target, Zap, Ruler } from "lucide-react";
import type { MetricResult } from "../utils/statsEngine";

type StatsCardsProps = {
    results: MetricResult[];
};

export const StatsCards: React.FC<StatsCardsProps> = ({ results }) => {
    const getMetric = (key: string) => results.find(r => r.metric === key);

    const stats = [
        { label: "Exit Velo", metric: getMetric("exitVelo"), icon: Zap, color: "var(--primary)" },
        { label: "Launch Angle", metric: getMetric("launchAngle"), icon: Activity, color: "var(--success)" },
        { label: "Exit Dir", metric: getMetric("exitDir"), icon: Target, color: "var(--warning)" },
        { label: "Distance", metric: getMetric("distance"), icon: Ruler, color: "var(--primary)" },
    ];

    return (
        <div className="grid grid-cols-4 gap-4">
            {stats.map((s, i) => (
                <div key={i} className="glass-card p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                        <s.icon size={16} style={{ color: s.color }} />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{s.metric ? s.metric.goodCount : 0}</span>
                        <span className="text-xs text-muted" style={{ color: "var(--text-muted)" }}>Good Shots</span>
                    </div>
                    <div className="w-full bg-white-10 rounded-xl" style={{ height: "4px", background: "rgba(255,255,255,0.05)" }}>
                        <div
                            className="rounded-xl"
                            style={{
                                height: "100%",
                                width: `${s.metric ? s.metric.goodPct : 0}%`,
                                background: s.color,
                                boxShadow: `0 0 10px ${s.color}`
                            }}
                        />
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                        <span style={{ color: "var(--text-muted)" }}>Precision</span>
                        <span className="font-medium" style={{ color: s.color }}>{s.metric ? s.metric.goodPct.toFixed(1) : 0}%</span>
                    </div>
                </div>
            ))}
        </div>
    );
};
