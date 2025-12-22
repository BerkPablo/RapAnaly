import type { SwingPhase } from '../pose/types';

export interface SwingRecord {
    id: number;
    startTime: number;
    endTime: number;
    duration: number;
    handPath: { x: number; y: number }[];
    peakPhase: SwingPhase;
}

export class SwingHistoryManager {
    private swings: SwingRecord[] = [];
    private currentSwingId = 0;
    private isSwinging = false;
    private currentSwingStart = 0;
    private currentHandPath: { x: number; y: number }[] = [];
    private lastPhase: SwingPhase = 'IDLE';
    private finishFrameCount = 0;
    private readonly FINISH_THRESHOLD = 15; // ~0.5s at 30fps

    // Track phase to detect swing start/end
    public processPhase(phase: SwingPhase, handPos: { x: number; y: number } | null, timestamp: number): SwingRecord | null {
        let completedSwing: SwingRecord | null = null;

        // Detect swing START: Address → Backswing
        if (!this.isSwinging && this.lastPhase === 'Address' && phase === 'Backswing') {
            this.isSwinging = true;
            this.currentSwingStart = timestamp;
            this.currentHandPath = [];
            this.currentSwingId++;
            console.log(`🏌️ Swing ${this.currentSwingId} started`);
        }

        // During swing, record hand path
        if (this.isSwinging && handPos) {
            this.currentHandPath.push({ ...handPos });
        }

        // Detect swing END: Finish phase stable for ~0.5s
        if (this.isSwinging && phase === 'Finish') {
            this.finishFrameCount++;
            if (this.finishFrameCount >= this.FINISH_THRESHOLD) {
                // Swing complete!
                const record: SwingRecord = {
                    id: this.currentSwingId,
                    startTime: this.currentSwingStart,
                    endTime: timestamp,
                    duration: (timestamp - this.currentSwingStart) / 1000,
                    handPath: [...this.currentHandPath],
                    peakPhase: 'Finish'
                };
                this.swings.push(record);
                completedSwing = record;
                console.log(`✅ Swing ${this.currentSwingId} completed: ${record.duration.toFixed(2)}s`);

                // Reset
                this.isSwinging = false;
                this.finishFrameCount = 0;
                this.currentHandPath = [];
            }
        } else {
            this.finishFrameCount = 0;
        }

        // Also end swing if we go back to IDLE/Address after Downswing (aborted swing)
        if (this.isSwinging && (phase === 'IDLE' || phase === 'Address') &&
            (this.lastPhase === 'Downswing' || this.lastPhase === 'FollowThrough')) {
            console.log(`⚠️ Swing ${this.currentSwingId} aborted`);
            this.isSwinging = false;
            this.finishFrameCount = 0;
        }

        this.lastPhase = phase;
        return completedSwing;
    }

    public getSwingHistory(): SwingRecord[] {
        return [...this.swings];
    }

    public getSwingById(id: number): SwingRecord | undefined {
        return this.swings.find(s => s.id === id);
    }

    public getCurrentSwingId(): number {
        return this.isSwinging ? this.currentSwingId : 0;
    }

    public isCurrentlySwinging(): boolean {
        return this.isSwinging;
    }

    public clearHistory(): void {
        this.swings = [];
        this.currentSwingId = 0;
    }
}
