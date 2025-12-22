export class EnvironmentCheck {
    private canvas: OffscreenCanvas | HTMLCanvasElement;
    private ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
    private readonly SAMPLE_SIZE = 32; // Analyze a small thumbnail for performance

    constructor() {
        if (typeof OffscreenCanvas !== 'undefined') {
            this.canvas = new OffscreenCanvas(this.SAMPLE_SIZE, this.SAMPLE_SIZE);
        } else {
            this.canvas = document.createElement('canvas');
            this.canvas.width = this.SAMPLE_SIZE;
            this.canvas.height = this.SAMPLE_SIZE;
        }
        this.ctx = (this.canvas as HTMLCanvasElement).getContext('2d', { willReadFrequently: true });
    }

    checkLighting(video: HTMLVideoElement): { isLowLight: boolean; brightness: number } {
        if (!this.ctx || !video.videoWidth) return { isLowLight: false, brightness: 255 };

        // Draw resized frame
        this.ctx.drawImage(video, 0, 0, this.SAMPLE_SIZE, this.SAMPLE_SIZE);

        // Get pixel data
        const frame = this.ctx.getImageData(0, 0, this.SAMPLE_SIZE, this.SAMPLE_SIZE);
        const data = frame.data;

        let totalBrightness = 0;
        // Iterate r,g,b,a
        for (let i = 0; i < data.length; i += 4) {
            // Simple luminance: 0.299R + 0.587G + 0.114B
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            totalBrightness += (0.299 * r + 0.587 * g + 0.114 * b);
        }

        const avgBrightness = totalBrightness / (this.SAMPLE_SIZE * this.SAMPLE_SIZE);

        // Threshold: < 50/255 is usually quite dark
        return {
            isLowLight: avgBrightness < 50,
            brightness: avgBrightness
        };
    }
}
