import React from 'react';
import { Eye, EyeOff, Activity, Download, Circle } from 'lucide-react';

interface Props {
    showSkeleton: boolean;
    setShowSkeleton: (show: boolean) => void;
    onExport: () => void;
    isRecording?: boolean;
    onToggleRecord?: () => void;
}

export const Controls: React.FC<Props> = ({
    showSkeleton,
    setShowSkeleton,
    onExport,
    isRecording = false,
    onToggleRecord
}) => {
    return (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" />
                <span>Controls</span>
            </h2>

            {/* Visibility Toggle */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Visualization</label>
                <button
                    onClick={() => setShowSkeleton(!showSkeleton)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${showSkeleton
                        ? 'bg-green-500/10 border-green-500/50 text-green-400'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}
                >
                    <span className="font-medium">Skeleton Overlay</span>
                    {showSkeleton ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
            </div>


            {/* Recording (Placeholder for next step) */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Session Recording</label>
                <button
                    onClick={onToggleRecord}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-bold transition-all ${isRecording
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'bg-white text-slate-900 hover:bg-slate-200'
                        }`}
                >
                    <Circle className={`w-5 h-5 ${isRecording ? 'fill-current animate-pulse' : ''}`} />
                    {isRecording ? 'STOP RECORDING' : 'START RECORDING'}
                </button>
            </div>

            {/* Export */}
            <div className="pt-4 border-t border-white/10">
                <button
                    onClick={onExport}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
                >
                    <Download className="w-4 h-4" />
                    <span>Export CSV Data</span>
                </button>
            </div>
        </div>
    );
};
