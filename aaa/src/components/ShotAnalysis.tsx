import React from "react";
import type { Row, MetricKey } from "../utils/statsEngine";

type ShotAnalysisProps = {
    rows: Row[];
};

const MetricDisplay: React.FC<{
    label: string;
    value: number | "-" | null;
    diff?: number;
}> = ({ label, value, diff }) => {
    const formatValue = (v: number | "-" | null) => {
        if (typeof v !== "number") return "-";
        return v.toFixed(1);
    };

    const formatDiff = (d: number) => {
        const sign = d > 0 ? "+" : "";
        return `${sign}${d.toFixed(1)}`;
    };

    const diffClass = diff === undefined || diff === 0 ? "zero" : diff > 0 ? "pos" : "neg";

    return (
        <div className="flex flex-col">
            <div className="shot-grid-header">{label}</div>
            <div className="flex items-baseline">
                <span className="shot-grid-value">{formatValue(value)}</span>
                {diff !== undefined && typeof value === "number" && (
                    <span className={`diff-value ${diffClass}`}>{formatDiff(diff)}</span>
                )}
            </div>
        </div>
    );
};

const SyncBadge: React.FC<{
    name: string;
    status: "SYNC" | "NO DATA";
    active?: boolean
}> = ({ name, status, active }) => (
    <div className={`sync-badge ${active ? "active" : ""} ${status === "NO DATA" ? "no-data" : ""}`}>
        <div className="dot" />
        <span>{name}</span>
        <span className="tag">{status}</span>
    </div>
);

export const ShotAnalysis: React.FC<ShotAnalysisProps> = ({ rows }) => {
    return (
        <div className="flex flex-col gap-6 mt-8">
            <h2 className="text-2xl m-0 mb-4 px-2 brand-font">Detailed Shot Analysis</h2>

            {[...rows].reverse().map((row, idx) => {
                // Allow 0 values to be displayed (user request)
                const mlmValid = row.mlmds.distance !== "-" && row.mlmds.distance !== null;
                const pro2Valid = row.pro2.distance !== "-" && row.pro2.distance !== null;
                const pro3Valid = row.pro3.distance !== "-" && row.pro3.distance !== null;

                const getDiff = (device: "pro2" | "pro3", key: MetricKey) => {
                    const ref = row.mlmds[key];
                    const cmp = row[device][key];
                    if (typeof ref === "number" && typeof cmp === "number") {
                        return cmp - ref;
                    }
                    return undefined;
                };

                return (
                    <div key={row.shotId} className="glass-card shot-card overflow-hidden">
                        <div className="shot-header">
                            <div className="shot-title">
                                <div className="number-prefix">{String(rows.length - idx).padStart(2, '0')}<br />10</div>
                                SHOT #{row.shotId}
                            </div>
                            <div className="sync-status-group">
                                <SyncBadge name="MLM" status={mlmValid ? "SYNC" : "NO DATA"} active={mlmValid} />
                                <SyncBadge name="PRO 2.0" status={pro2Valid ? "SYNC" : "NO DATA"} active={pro2Valid} />
                                <SyncBadge name="PRO 3.0" status={pro3Valid ? "SYNC" : "NO DATA"} active={pro3Valid} />
                            </div>
                        </div>

                        <div className="shot-grid">
                            {/* MLM Row */}
                            <div className="shot-grid-row">
                                <div className="flex items-center">
                                    <span className="device-pill mlm">MLM</span>
                                </div>
                                <MetricDisplay label="DISTANCE" value={row.mlmds.distance} />
                                <MetricDisplay label="VELO" value={row.mlmds.exitVelo} />
                                <MetricDisplay label="ANGLE" value={row.mlmds.launchAngle} />
                                <MetricDisplay label="DIR" value={row.mlmds.exitDir} />
                            </div>

                            {/* Pro 2.0 Row */}
                            {pro2Valid && (
                                <div className="shot-grid-row">
                                    <div className="flex items-center mt-4">
                                        <span className="device-pill pro2">PRO 2</span>
                                    </div>
                                    <MetricDisplay label="DISTANCE" value={row.pro2.distance} diff={getDiff("pro2", "distance")} />
                                    <MetricDisplay label="VELO" value={row.pro2.exitVelo} diff={getDiff("pro2", "exitVelo")} />
                                    <MetricDisplay label="ANGLE" value={row.pro2.launchAngle} diff={getDiff("pro2", "launchAngle")} />
                                    <MetricDisplay label="DIR" value={row.pro2.exitDir} diff={getDiff("pro2", "exitDir")} />
                                </div>
                            )}

                            {/* Pro 3.0 Row */}
                            {pro3Valid && (
                                <div className="shot-grid-row">
                                    <div className="flex items-center mt-4">
                                        <span className="device-pill pro3">PRO 3</span>
                                    </div>
                                    <MetricDisplay label="DISTANCE" value={row.pro3.distance} diff={getDiff("pro3", "distance")} />
                                    <MetricDisplay label="VELO" value={row.pro3.exitVelo} diff={getDiff("pro3", "exitVelo")} />
                                    <MetricDisplay label="ANGLE" value={row.pro3.launchAngle} diff={getDiff("pro3", "launchAngle")} />
                                    <MetricDisplay label="DIR" value={row.pro3.exitDir} diff={getDiff("pro3", "exitDir")} />
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
