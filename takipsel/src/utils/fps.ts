
export class FPSCounter {
    private lastTime: number = 0;
    private frameCount: number = 0;
    private fps: number = 0;

    tick(timestamp: number): number {
        if (this.lastTime === 0) {
            this.lastTime = timestamp;
            return 0;
        }

        this.frameCount++;
        const delta = timestamp - this.lastTime;

        if (delta >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = timestamp;
        }

        return this.fps;
    }
}
