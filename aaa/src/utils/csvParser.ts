import type { Row, RawVal, DeviceData } from "./statsEngine";

export function parseNumberOrDash(s: string): RawVal {
    const t = (s ?? "").trim();
    if (!t) return null;
    if (t === "-") return "-";
    const v = Number(t);
    if (!Number.isFinite(v)) return null;
    return v;
}

export function parseDeviceCsv(text: string): { rows: Record<string, DeviceData>; error?: string } {
    const lines = text
        .replace(/\r/g, "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

    if (lines.length < 2) return { rows: {}, error: "CSV must have header + at least 1 data row." };

    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const idx = (name: string) => header.findIndex(h => h.includes(name));

    const shotIdIdx = idx("shot_id");
    if (shotIdIdx === -1) return { rows: {}, error: "Missing required 'shot_id' column." };

    const mapping = {
        distance: idx("distance") !== -1 ? idx("distance") : idx("carry"),
        exitVelo: idx("exit_velo") !== -1 ? idx("exit_velo") : idx("ball_speed"),
        launchAngle: idx("launch_angle") !== -1 ? idx("launch_angle") : idx("angle"),
        exitDir: idx("exit_dir") !== -1 ? idx("exit_dir") : (idx("direction") !== -1 ? idx("direction") : idx("dir")),
    };

    const out: Record<string, DeviceData> = {};

    for (let li = 1; li < lines.length; li++) {
        const parts = lines[li].split(",").map((p) => p.trim());
        const get = (index: number) => parts[index] ?? "";

        const shotId = get(shotIdIdx);
        if (!shotId) continue;

        out[shotId] = {
            distance: parseNumberOrDash(get(mapping.distance)),
            exitVelo: parseNumberOrDash(get(mapping.exitVelo)),
            launchAngle: parseNumberOrDash(get(mapping.launchAngle)),
            exitDir: parseNumberOrDash(get(mapping.exitDir)),
        };
    }

    return { rows: out };
}

// Keeping fallback but deprecated
export function parseCsv(_text: string): { rows: Row[]; error?: string } {
    return { rows: [], error: "Switch to parseDeviceCsv for individual file uploads." };
}
