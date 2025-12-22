import React, { useRef, useEffect } from 'react';
import { X, Play, Pause } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    videoBlob: Blob | null;
}

export const ReplayModal: React.FC<Props> = ({ isOpen, onClose, videoBlob }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [playbackRate, setPlaybackRate] = React.useState(1.0);
    const [currentTime, setCurrentTime] = React.useState(0);
    const [duration, setDuration] = React.useState(0);
    const [videoUrl, setVideoUrl] = React.useState<string>("");

    useEffect(() => {
        let url = "";
        if (!isOpen) {
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.src = "";
            }
            // Use requestAnimationFrame or setTimeout to move setState out of the sync path if needed,
            // but usually setting to false when isOpen is false is fine if handled carefully.
            // Let's try to just avoid it if not strictly necessary or wrap it.
            setTimeout(() => {
                setIsPlaying(false);
                setVideoUrl("");
            }, 0);
        } else if (videoBlob && videoRef.current) {
            url = URL.createObjectURL(videoBlob);
            videoRef.current.src = url;
            const finalUrl = url;
            setTimeout(() => {
                setVideoUrl(finalUrl);
            }, 0);
        }
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    }, [isOpen, videoBlob]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    if (!isOpen || !videoBlob) return null;

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleRateChange = (rate: number) => {
        setPlaybackRate(rate);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const formatTime = (time: number) => {
        const seconds = Math.floor(time % 60);
        const milliseconds = Math.floor((time % 1) * 100);
        return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
    };

    return (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="relative w-full max-w-5xl bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] ring-1 ring-white/10">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="w-3 h-8 bg-gradient-to-b from-green-400 to-green-600 rounded-full shadow-[0_0_15px_rgba(74,222,128,0.5)]"></div>
                            Swing Replay
                        </h2>
                        <p className="text-slate-400 text-sm mt-1 ml-6 font-medium tracking-wide">SLOW MOTION ANALYSIS</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-white/10 rounded-full transition-all hover:rotate-90 duration-300 group"
                    >
                        <X className="w-6 h-6 text-slate-400 group-hover:text-white" />
                    </button>
                </div>

                {/* Video Container */}
                <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden min-h-[500px] group/video">
                    {/* Grid Pattern Overlay */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

                    <video
                        ref={videoRef}
                        className="w-full h-full object-contain pointer-events-auto"
                        onEnded={() => setIsPlaying(false)}
                        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                        onLoadedMetadata={() => {
                            const video = videoRef.current;
                            if (video) {
                                if (!isFinite(video.duration)) {
                                    video.currentTime = Number.MAX_SAFE_INTEGER;
                                    video.ontimeupdate = () => {
                                        video.ontimeupdate = null;
                                        setDuration(video.duration);
                                        video.currentTime = 0;
                                    };
                                } else {
                                    setDuration(video.duration);
                                }
                            }
                        }}
                        onDurationChange={() => {
                            if (videoRef.current && isFinite(videoRef.current.duration)) {
                                setDuration(videoRef.current.duration);
                            }
                        }}
                        loop
                        playsInline
                    />

                    {!isPlaying && (
                        <button
                            onClick={togglePlay}
                            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors z-10 backdrop-blur-[2px]"
                        >
                            <div className="w-24 h-24 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-[0_0_30px_rgba(74,222,128,0.2)] group-hover/video:scale-110 transition-transform duration-300">
                                <Play className="w-10 h-10 text-white fill-current ml-2" />
                            </div>
                        </button>
                    )}
                </div>

                {/* Controls Area */}
                <div className="bg-slate-900/60 border-t border-white/10 backdrop-blur-md">
                    {/* Seek Bar */}
                    <div className="px-8 pt-6 pb-2">
                        <div className="flex items-center gap-4 mb-2">
                            <span className="text-xs font-mono font-bold text-green-400 w-16">{formatTime(currentTime)}</span>
                            <div className="flex-1 relative h-2 bg-white/10 rounded-full overflow-hidden group/seek">
                                <div
                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                                    style={{ width: `${(currentTime / duration) * 100}%` }}
                                ></div>
                                <input
                                    type="range"
                                    min="0"
                                    max={isFinite(duration) ? duration : 0}
                                    step="0.01"
                                    value={currentTime}
                                    onChange={handleSeek}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </div>
                            <span className="text-xs font-mono text-slate-500 w-16 text-right">{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Button Controls */}
                    <div className="p-6 pt-2 flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={togglePlay}
                                className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-xl hover:bg-green-400 hover:scale-105 transition-all shadow-lg"
                            >
                                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                            </button>

                            <div className="h-8 w-px bg-white/10 mx-2"></div>

                            {/* Playback Speed Segmented Control */}
                            <div className="bg-black/40 p-1 rounded-xl border border-white/5 flex gap-1">
                                {[0.25, 0.5, 1.0].map((rate) => (
                                    <button
                                        key={rate}
                                        onClick={() => handleRateChange(rate)}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${playbackRate === rate
                                            ? 'bg-white/10 text-green-400 shadow-sm border border-white/5'
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                            }`}
                                    >
                                        {rate}x
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {videoUrl && (
                                <a
                                    href={videoUrl}
                                    download={`golf-swing-${new Date().toISOString()}.webm`}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-all hover:border-green-500/50 group"
                                >
                                    <span>Download Analysis</span>
                                    <svg className="w-4 h-4 text-slate-400 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
