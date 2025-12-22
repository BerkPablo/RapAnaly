import React from 'react';
import type { SwingRecord } from '../kinematics/SwingHistory';
import { Clock, Play, Trash2 } from 'lucide-react';

interface Props {
    swings: SwingRecord[];
    onReplaySwing: (swing: SwingRecord) => void;
    onClearHistory: () => void;
    currentSwingId: number;
}

export const SwingHistoryPanel: React.FC<Props> = ({
    swings,
    onReplaySwing,
    onClearHistory,
    currentSwingId
}) => {
    if (swings.length === 0 && currentSwingId === 0) {
        return (
            <div className="bg-slate-900/90 backdrop-blur-xl border border-green-500/30 rounded-2xl p-3 shadow-lg">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-4 bg-green-500 rounded-full"></span>
                    Swing History
                </h3>
                <p className="text-xs text-slate-500 text-center py-4">
                    No swings recorded yet.<br />
                    Get in position and swing!
                </p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/90 backdrop-blur-xl border border-green-500/30 rounded-2xl p-3 shadow-lg">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-green-500 rounded-full"></span>
                    Swing History
                </h3>
                {swings.length > 0 && (
                    <button
                        onClick={onClearHistory}
                        className="p-1.5 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                        title="Clear History"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Current swing indicator */}
            {currentSwingId > 0 && (
                <div className="mb-2 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg animate-pulse">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-black">
                            {currentSwingId}
                        </div>
                        <span className="text-xs font-medium text-green-400">Recording swing...</span>
                    </div>
                </div>
            )}

            {/* Swing list */}
            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                {swings.slice().reverse().map((swing) => (
                    <div
                        key={swing.id}
                        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors cursor-pointer group"
                        onClick={() => onReplaySwing(swing)}
                    >
                        {/* Number badge */}
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {swing.id}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-white truncate">
                                Swing #{swing.id}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <Clock className="w-3 h-3" />
                                <span>{swing.duration.toFixed(2)}s</span>
                                <span className="text-slate-600">|</span>
                                <span>{swing.handPath.length} pts</span>
                            </div>
                        </div>

                        {/* Play button */}
                        <button
                            className="p-1.5 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                                e.stopPropagation();
                                onReplaySwing(swing);
                            }}
                        >
                            <Play className="w-3 h-3 text-black fill-current" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Stats */}
            {swings.length > 0 && (
                <div className="mt-3 pt-2 border-t border-white/10 text-center">
                    <span className="text-[10px] text-slate-500">
                        {swings.length} swing{swings.length !== 1 ? 's' : ''} recorded
                    </span>
                </div>
            )}
        </div>
    );
};
