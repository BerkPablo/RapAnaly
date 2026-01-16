import React from "react";
import type { Row, MetricKey, Device } from "../utils/statsEngine";

type ShotAnalysisProps = {
    rows: Row[];
    referenceDevice: Device; // "pro2" or "pro3"
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

    const diffClass = diff === undefined || Math.abs(diff) < 0.001 ? "zero" : diff > 0 ? "pos" : "neg";

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

export const ShotAnalysis: React.FC<ShotAnalysisProps> = ({ rows, referenceDevice }) => {
    const refName = referenceDevice === "pro2" ? "PRO 2.0" : "PRO 3.0";

    return (
        <div className="flex flex-col gap-6 mt-8">
            <h2 className="text-2xl m-0 mb-4 px-2 brand-font">Detailed Shot Analysis</h2>

            {[...rows].reverse().map((row, idx) => {
                const mlmValid = row.mlmds.distance !== "-" && row.mlmds.distance !== null;
                const refValid = row[referenceDevice].distance !== "-" && row[referenceDevice].distance !== null;

                // Diff = Test(MLM) - Ref(Pro)
                const getDiff = (key: MetricKey) => {
                    const ref = row[referenceDevice][key];
                    const test = row.mlmds[key];
                    if (typeof ref === "number" && typeof test === "number") {
                        return test - ref; // Difference relative to Ref
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
                                <SyncBadge name={refName} status={refValid ? "SYNC" : "NO DATA"} active={refValid} />
                                <SyncBadge name="MLM" status={mlmValid ? "SYNC" : "NO DATA"} active={mlmValid} />
                            </div>
                        </div>

                        <div className="shot-grid">
                            {/* Reference Row (Pro) - Render First */}
                            <div className="shot-grid-row">
                                <div className="flex items-center">
                                    <span className={`device-pill ${referenceDevice}`}>{refName} (REF)</span>
                                </div>
                                <MetricDisplay label="DISTANCE" value={row[referenceDevice].distance} />
                                <MetricDisplay label="VELO" value={row[referenceDevice].exitVelo} />
                                <MetricDisplay label="ANGLE" value={row[referenceDevice].launchAngle} />
                                <MetricDisplay label="DIR" value={row[referenceDevice].exitDir} />
                            </div>

                            {/* MLM Row (Test) - Render Second with Diffs */}
                            <div className="shot-grid-row">
                                <div className="flex items-center mt-4">
                                    <span className="device-pill mlm">MLM (TEST)</span>
                                </div>
                                <MetricDisplay label="DISTANCE" value={row.mlmds.distance} diff={getDiff("distance")} />
                                <MetricDisplay label="VELO" value={row.mlmds.exitVelo} diff={getDiff("exitVelo")} />
                                <MetricDisplay label="ANGLE" value={row.mlmds.launchAngle} diff={getDiff("launchAngle")} />
                                <MetricDisplay label="DIR" value={row.mlmds.exitDir} diff={getDiff("exitDir")} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
