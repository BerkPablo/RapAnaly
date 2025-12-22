import React from 'react';
import type { KinematicsState } from '../pose/types';


interface Props {
    data: KinematicsState;
}

// Descriptions for golf swing relevance
// Descriptions removed to save space


const MetricBadge = ({ label, value, unit, color }: { label: string, value: string | number, unit?: string, color: string }) => (
    <div className="flex flex-col">
        <span className="text-[10px] text-slate-500 uppercase font-bold">{label}</span>
        <span className={`text-xs font-mono font-bold ${color}`}>{value}{unit}</span>
    </div>
);

const ValueDisplay = ({
    label,
    value,
    unit = "°",
    color = "text-green-400"
}: {
    label: string,
    value: number | undefined | null,
    unit?: string,
    color?: string
}) => (
    <div className="flex flex-col gap-1 p-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
        <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">{label}</span>
            <span className={`text-base font-mono font-bold ${typeof value === 'number' ? color : 'text-slate-500'}`}>
                {typeof value === 'number' ? Math.round(value) : '---'}
                {typeof value === 'number' ? unit : ''}
            </span>
        </div>
    </div>
);

export const MetricsPanel: React.FC<Props> = ({ data }) => {
    const jointList = [
        'Right Elbow', 'Left Elbow',
        'Right Knee', 'Left Knee',
        'Right Shoulder', 'Left Shoulder'
    ];

    return (
        <div className="flex flex-col bg-slate-900/90 backdrop-blur-xl border border-green-500/30 rounded-2xl p-3 shadow-lg shadow-green-900/20 overflow-hidden relative">
            <header className="mb-2 shrink-0">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-5 bg-green-500 rounded-full"></span>
                    Kinematics Engine
                </h2>


            </header>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {/* Joint Angles Section */}
                <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-widest">Core Joint Analytics</div>
                    <div className="grid grid-cols-2 gap-2">
                        {jointList.map((name) => {
                            const joint = data.joints[name];
                            return (
                                <ValueDisplay
                                    key={name}
                                    label={name.replace('Right', 'R.').replace('Left', 'L.')}
                                    value={joint ? joint.angle : undefined}
                                    color={joint ? "text-green-400" : "text-slate-600"}
                                    unit={joint ? "°" : "--"}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* IK Result Section */}
                <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-widest mt-2">IK Posture Approximation</div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                            <MetricBadge
                                label="Est. Shoulder"
                                value={data.ik ? Math.round(data.ik.shoulderAngle) : "--"}
                                unit="°"
                                color="text-fuchsia-400"
                            />
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                            <MetricBadge
                                label="Est. Elbow"
                                value={data.ik ? Math.round(data.ik.elbowAngle) : "--"}
                                unit="°"
                                color="text-fuchsia-400"
                            />
                        </div>
                    </div>
                </div>

                {!Object.keys(data.joints).length && (
                    <div className="pt-4 text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-bold animate-pulse">Scanning for golfer...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
