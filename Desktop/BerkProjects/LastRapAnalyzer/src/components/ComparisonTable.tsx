import React from "react";
import type { MetricResult } from "../utils/statsEngine";

type ComparisonTableProps = {
    results: MetricResult[];
};

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ results }) => {
    const format = (x: number, digits = 2) => {
        if (!Number.isFinite(x)) return "-";
        return x.toFixed(digits);
    };

    return (
        <div className="glass-card" style={{ overflowX: "auto" }}>
            <table>
                <thead>
                    <tr>
                        <th>Parameter</th>
                        <th>Count</th>
                        <th>Capture(n)</th>
                        <th>Capture(%)</th>
                        <th>Min</th>
                        <th>AvgDiff</th>
                        <th>AvgAbsDiff</th>
                        <th>Median</th>
                        <th>STD</th>
                        <th>90th PCTL</th>
                        <th>Max</th>
                        <th>Good</th>
                        <th>Moderate</th>
                        <th>Bad</th>
                        <th>Thresholds</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((r) => (
                        <tr key={r.metric}>
                            <td className="font-medium" style={{ whiteSpace: "nowrap" }}>{r.parameter}</td>
                            <td>{r.count}</td>
                            <td>{r.captureN}</td>
                            <td>{format(r.capturePct, 1)}%</td>
                            <td>{format(r.min)}</td>
                            <td style={{ color: r.avg > 0 ? "var(--success)" : r.avg < 0 ? "var(--error)" : "inherit" }}>
                                {format(r.avg)}
                            </td>
                            <td>{format(r.absAvg)}</td>
                            <td>{format(r.median)}</td>
                            <td>{format(r.stdAbs)}</td>
                            <td>{format(r.p90)}</td>
                            <td>{format(r.max)}</td>
                            <td style={{ whiteSpace: "nowrap" }}>
                                <span className="badge-good">{r.goodCount}</span>
                                <span className="text-xs ml-1" style={{ marginLeft: "4px" }}>{format(r.goodPct, 1)}%</span>
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                                <span className="badge-mod">{r.moderateCount}</span>
                                <span className="text-xs ml-1" style={{ marginLeft: "4px" }}>{format(r.moderatePct, 1)}%</span>
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                                <span className="badge-bad">{r.badCount}</span>
                                <span className="text-xs ml-1" style={{ marginLeft: "4px" }}>{format(r.badPct, 1)}%</span>
                            </td>
                            <td className="threshold-text">
                                {r.thresholds.good} | {r.thresholds.moderate} | {r.thresholds.bad}
                            </td>
                        </tr>
                    ))}
                    {results.length === 0 && (
                        <tr>
                            <td colSpan={15} className="text-center p-8 text-muted" style={{ color: "var(--text-muted)" }}>
                                No metrics available. Please upload a CSV file.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
