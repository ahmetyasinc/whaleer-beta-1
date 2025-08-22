// src/utils/performance.js
// snapshots: [{timestamp: "2025-08-20T14:35:00", usd_value: 4.0}, ...]
function parseTs(s) { return new Date(s); }

function pct(a, b) {
  // b -> a değişimi (yeni - eski)/eski * 100
  if (b === 0 || b == null) return 0;
  return ((a - b) / b) * 100;
}

function nearestStartValue(points, fromDate) {
  // fromDate'ten ÖNCEKİ son değeri bul; yoksa ilk değeri al
  let chosen = points[0]?.y ?? 0, chosenT = points[0]?.x ?? null;
  for (let i = 0; i < points.length; i++) {
    const t = points[i].x;
    if (t <= fromDate) { chosen = points[i].y; chosenT = t; } else { break; }
  }
  return { value: chosen, at: chosenT };
}

export function normalizeSnapshots(snapshots) {
  const pts = (snapshots || [])
    .map(s => ({ x: parseTs(s.timestamp), y: Number(s.usd_value || 0) }))
    .sort((a, b) => a.x - b.x);
  return pts;
}

export function computePerfSummary(snapshots) {
  const pts = normalizeSnapshots(snapshots);
  if (pts.length === 0) return { daily: 0, weekly: 0, monthly: 0 };

  const last = pts[pts.length - 1].y;
  const now = pts[pts.length - 1].x;

  const d1 = new Date(now); d1.setDate(d1.getDate() - 1);
  const w1 = new Date(now); w1.setDate(w1.getDate() - 7);
  const m1 = new Date(now); m1.setMonth(m1.getMonth() - 1);

  const dBase = nearestStartValue(pts, d1).value;
  const wBase = nearestStartValue(pts, w1).value;
  const mBase = nearestStartValue(pts, m1).value;

  return {
    daily: Number(pct(last, dBase).toFixed(2)),
    weekly: Number(pct(last, wBase).toFixed(2)),
    monthly: Number(pct(last, mBase).toFixed(2)),
  };
}
