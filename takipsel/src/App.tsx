import { useState, useRef, useCallback, useEffect } from 'react';
import { CameraCanvas } from './ui/CameraCanvas';
import type { CameraCanvasHandle } from './ui/CameraCanvas';
import { MetricsPanel } from './ui/MetricsPanel';
import { Controls } from './ui/Controls';
import { ReplayModal } from './ui/ReplayModal';
import { KinematicsEngine } from './kinematics/kinematics';
import { exportToCSV } from './utils/export';
import { CompositeVideoRecorder } from './utils/recorder';
import type { Pose, KinematicsState } from './pose/types';
import './index.css';


function App() {
  const [kinematicsState, setKinematicsState] = useState<KinematicsState>({
    joints: {},
    history: {},
    timestamp: 0,
    segmentLengths: {
      upperArm: 0,
      forearm: 0,
      thigh: 0,
      shin: 0
    },
    handPath: []
  } as unknown as KinematicsState);

  const [fps, setFps] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [showReplay, setShowReplay] = useState(false);

  const engineRef = useRef(new KinematicsEngine());
  const canvasRef = useRef<CameraCanvasHandle>(null);
  const recorderRef = useRef<CompositeVideoRecorder | null>(null);

  // Ref for isRecording to be accessible in useCallback without re-creating it
  const isRecordingRef = useRef(isRecording);
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const handlePoseUpdate = useCallback((pose: Pose) => {
    const timestamp = Date.now();
    const newState = engineRef.current.process(pose, timestamp);
    setKinematicsState(newState);
  }, []);

  const handleExport = useCallback(() => {
    exportToCSV(kinematicsState.history);
  }, [kinematicsState.history]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      // Stop
      if (recorderRef.current) {
        const blob = await recorderRef.current.stop();
        setVideoBlob(blob);
        setIsRecording(false);
        setShowReplay(true);
      }
    } else {
      // Start
      if (canvasRef.current) {
        const videoElement = canvasRef.current.getVideoElement();
        if (videoElement) {
          recorderRef.current = new CompositeVideoRecorder(
            videoElement,
            () => canvasRef.current!.getCurrentPoseData()
          );
          recorderRef.current.start();
          setIsRecording(true);
        }
      }
    }
  }, [isRecording]);

  // Auto-Recording Logic
  useEffect(() => {
    // If we are NOT recording, and phase becomes Address (Ready) -> Start Recording
    if (!isRecordingRef.current && kinematicsState.phase === 'Address') {
      // We use a small timeout to ensure stability? No, engine handles stability.
      console.log("Auto-Start Recording");
      toggleRecording();
    }

    // If we ARE recording, and phase becomes Finish -> Stop & Show Replay
    if (isRecordingRef.current && kinematicsState.phase === 'Finish') {
      console.log("Auto-Stop Recording (Finish)");
      toggleRecording();
    }
  }, [kinematicsState.phase, toggleRecording]);

  const handleFpsUpdate = useCallback((val: number) => {
    setFps(val);
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-white p-6 font-sans">
      <div className="max-w-[1600px] mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-6 min-h-[calc(100vh-3rem)]">

        {/* Main Column: Camera, Metrics & Controls */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          {/* Header */}
          <header className="flex justify-between items-end pb-2 border-b border-white/10">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tighter bg-gradient-to-r from-white to-green-400 bg-clip-text text-transparent">
                GOLF<span className="text-green-500">KINETICS</span>
              </h1>
              <p className="text-slate-400 text-sm font-mono mt-1">SWING ANALYSIS SYSTEM</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase font-bold">System Status</div>
                <div className="flex items-center gap-2 justify-end">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="font-mono text-green-400">ONLINE</span>
                </div>
              </div>
            </div>
          </header>

          {/* Viewport */}
          <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl shadow-green-900/10 min-h-[720px] flex items-center justify-center">
            <CameraCanvas
              ref={canvasRef}
              onPoseUpdate={handlePoseUpdate}
              onFPSUpdate={handleFpsUpdate}
              showSkeleton={showSkeleton}
              minConfidence={0.3}
              handPath={kinematicsState.handPath}
              ik={kinematicsState.ik}
              joints={kinematicsState.joints}
              phase={kinematicsState.phase}
            />

            {/* Overlay UI Container */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 items-start">
              {/* Recording Indicator */}
              {isRecording && (
                <div className="flex items-center gap-2 bg-red-500/90 text-white px-3 py-1.5 rounded-lg font-bold animate-pulse shadow-lg shadow-red-500/20">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                  REC
                </div>
              )}

              {/* FPS Counter - Moved to left to avoid panel overlap */}
              <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                <div className="text-xs text-slate-400 uppercase font-bold">FPS</div>
                <div className="font-mono text-green-400 font-bold">{fps}</div>
              </div>
            </div>
          </div>

          {/* Controls - Moved under Video */}
          <div className="flex flex-col gap-6">
            <Controls
              showSkeleton={showSkeleton}
              setShowSkeleton={setShowSkeleton}
              onExport={handleExport}
              isRecording={isRecording}
              onToggleRecord={toggleRecording}
            />
          </div>
        </div>

        {/* Sidebar: Metrics & Controls */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <MetricsPanel data={kinematicsState} />



          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-widest">Analysis Engine</h3>
            <div className="space-y-4">
              <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                <p className="text-xs text-slate-400 mb-1">Pose Detection</p>
                <p className="text-sm font-mono text-green-400">MoveNet Lightning V4</p>
              </div>
              <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                <p className="text-xs text-slate-400 mb-1">Kinematics Thread</p>
                <p className="text-sm font-mono text-green-400">Active (Smoothed)</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Replay Modal */}
      <ReplayModal
        isOpen={showReplay}
        onClose={() => setShowReplay(false)}
        videoBlob={videoBlob}
      />
    </div>
  );
}

export default App;
