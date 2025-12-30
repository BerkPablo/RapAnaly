export type Device = "pro2" | "pro3";
export type MetricKey = "distance" | "exitVelo" | "launchAngle" | "exitDir";
export type RawVal = number | "-" | null;

export type DeviceData = Record<MetricKey, RawVal>;

export type Row = {
  shotId: string;
  mlmds: DeviceData;
  pro2: DeviceData;
  pro3: DeviceData;
};

export type Threshold = { a: number; b: number; label: string; unit: string };

export const METRICS: { key: MetricKey; name: string }[] = [
  { key: "distance", name: "Distance" },
  { key: "exitVelo", name: "Exit Velo" },
  { key: "launchAngle", name: "Launch Angle" },
  { key: "exitDir", name: "Exit Direction" },
];

export const TH: Record<MetricKey, Threshold> = {
  exitVelo: { a: 1.0, b: 2.0, label: "Exit Velo", unit: "mph" },
  exitDir: { a: 1.0, b: 2.0, label: "Exit Direction", unit: "deg" },
  launchAngle: { a: 1.0, b: 2.0, label: "Launch Angle", unit: "deg" },
  distance: { a: 50.0, b: 100.0, label: "Distance", unit: "ft" },
};

export function isValidValue(x: RawVal): x is number {
  if (x === "-" || x === null) return false;
  if (typeof x !== "number") return false;
  if (!Number.isFinite(x)) return false;
  if (x === 0) return false;
  return true;
}

export function mean(arr: number[]) {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : NaN;
}

export function median(arr: number[]) {
  if (!arr.length) return NaN;
  const a = [...arr].sort((x, y) => x - y);
  const n = a.length;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return a[mid];
  return (a[mid - 1] + a[mid]) / 2;
}

export function sampleStd(arr: number[]) {
  const n = arr.length;
  if (n < 2) return NaN;
  const m = mean(arr);
  const varSum = arr.reduce((s, x) => s + (x - m) ** 2, 0);
  return Math.sqrt(varSum / (n - 1));
}

export function percentileInc(arr: number[], p: number) {
  if (!arr.length) return NaN;
  const a = [...arr].sort((x, y) => x - y);
  const n = a.length;
  if (n === 1) return a[0];

  const rank = 1 + (n - 1) * p;
  const k = Math.floor(rank);
  const d = rank - k;

  const i0 = Math.max(1, Math.min(n, k)) - 1;
  const i1 = Math.max(1, Math.min(n, k + 1)) - 1;

  if (i0 === i1) return a[i0];
  return a[i0] + d * (a[i1] - a[i0]);
}

export function classify(absDiff: number, a: number, b: number) {
  if (absDiff < a) return "Good";
  if (absDiff <= b) return "Moderate";
  return "Bad";
}

export type MetricResult = {
  metric: MetricKey;
  parameter: string;
  unit: string;
  count: number;
  captureN: number;
  capturePct: number;
  min: number;
  avg: number;
  absAvg: number;
  median: number;
  stdAbs: number;
  p90: number;
  max: number;
  goodCount: number;
  moderateCount: number;
  badCount: number;
  goodPct: number;
  moderatePct: number;
  badPct: number;
  thresholds: { good: string; moderate: string; bad: string };
};

export function computeMetric(rows: Row[], device: Device, metric: MetricKey): MetricResult {
  const count = rows.length;
  const { a, b, label, unit } = TH[metric];

  const diffs: number[] = [];
  const absDiffs: number[] = [];

  let mlmdsValidCount = 0;
  let good = 0,
    moderate = 0,
    bad = 0;

  for (const r of rows) {
    const ref = r.mlmds[metric];
    const cmp = r[device][metric];

    const refValid = isValidValue(ref);
    if (refValid) mlmdsValidCount++;

    if (!refValid || !isValidValue(cmp)) continue;

    const diff = cmp - ref;
    const abs = Math.abs(diff);

    diffs.push(diff);
    absDiffs.push(abs);

    const bucket = classify(abs, a, b);
    if (bucket === "Good") good++;
    else if (bucket === "Moderate") moderate++;
    else bad++;
  }

  const N = diffs.length;
  const capturePct = mlmdsValidCount ? (100 * N) / mlmdsValidCount : 0;

  const minV = absDiffs.length ? Math.min(...absDiffs) : NaN;
  const maxV = absDiffs.length ? Math.max(...absDiffs) : NaN;

  const avgDiff = mean(diffs);
  const absAvg = mean(absDiffs);
  const med = median(absDiffs);
  const stdAbs = sampleStd(absDiffs);
  const p90 = percentileInc(absDiffs, 0.9);

  const goodPct = N ? (100 * good) / N : NaN;
  const moderatePct = N ? (100 * moderate) / N : NaN;
  const badPct = N ? (100 * bad) / N : NaN;

  return {
    metric,
    parameter: `${label} (${unit})`,
    unit,
    count,
    captureN: N,
    capturePct,
    min: minV,
    avg: avgDiff,
    absAvg,
    median: med,
    stdAbs,
    p90,
    max: maxV,
    goodCount: good,
    moderateCount: moderate,
    badCount: bad,
    goodPct,
    moderatePct,
    badPct,
    thresholds: {
      good: `< ${a}`,
      moderate: `${a} - ${b}`,
      bad: `> ${b}`,
    },
  };
}
