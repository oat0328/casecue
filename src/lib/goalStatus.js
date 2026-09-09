// Goal status engine — computes visual progress status for IEP goals from
// logged progress points. Pure functions shared by student views.

export function parseTargetPct(goal) {
  for (const raw of [goal?.target, goal?.criterion]) {
    if (!raw) continue;
    const s = String(raw);
    let m = s.match(/(\d+(?:\.\d+)?)\s*%/);
    if (m) return Math.min(100, parseFloat(m[1]));
    m = s.match(/(\d+)\s*(?:\/|out of)\s*(\d+)/i);
    if (m) return Math.min(100, (parseFloat(m[1]) / parseFloat(m[2])) * 100);
    m = s.match(/(\d+(?:\.\d+)?)/);
    if (m) return Math.min(100, parseFloat(m[1]));
  }
  return 80;
}

const LABELS = {
  met: "Goal Met",
  on_track: "On Track",
  progressing: "Making Progress",
  intervention: "Needs Intervention",
  at_risk: "At Risk",
  no_data: "No Data",
};
const TONES = {
  met: "green",
  on_track: "green",
  progressing: "yellow",
  intervention: "amber",
  at_risk: "red",
  no_data: "gray",
};

// goal: Goal record; points: [{ date, percentage }]; reviewDate: ISO date the
// goal is being worked toward (annual review), used for the projection.
export function computeGoalStatus(goal, points, reviewDate) {
  const round1 = (n) => Math.round(n * 10) / 10;
  const pts = (points || [])
    .filter((p) => p.percentage != null && p.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  const targetPct = round1(parseTargetPct(goal));

  if (pts.length === 0) {
    return { key: "no_data", label: LABELS.no_data, tone: TONES.no_data, targetPct, dataPoints: 0, points: [] };
  }

  const lastN = pts.slice(-3);
  const latest = round1(lastN.reduce((s, p) => s + p.percentage, 0) / lastN.length);
  const prior = pts.length > 3 ? pts.slice(0, pts.length - 3) : pts.slice(0, 1);
  const priorAvg = prior.reduce((s, p) => s + p.percentage, 0) / prior.length;
  const trend = round1(latest - priorAvg);

  let key;
  if (latest >= targetPct) key = "met";
  else if (trend <= -5) key = "at_risk";
  else if (latest < targetPct * 0.6 && pts.length >= 3) key = "intervention";
  else if (latest >= targetPct * 0.8) key = "on_track";
  else key = "progressing";

  // Linear projection toward the review date (fallback: 90 days after the last point)
  const dayMs = 86400000;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const elapsed = Math.max(1, (new Date(last.date) - new Date(first.date)) / dayMs);
  const slope = (last.percentage - first.percentage) / elapsed;
  let horizonDays = 90;
  if (reviewDate) {
    const left = (new Date(reviewDate) - new Date(last.date)) / dayMs;
    if (!isNaN(left)) horizonDays = Math.max(0, left);
  }
  const projected = Math.max(0, Math.min(100, round1(latest + slope * horizonDays)));

  return {
    key,
    label: LABELS[key],
    tone: TONES[key],
    targetPct,
    latest,
    trend,
    projected,
    growthNeeded: round1(Math.max(0, targetPct - latest)),
    dataPoints: pts.length,
    points: pts,
  };
}

export const GOAL_STATUS_ORDER = ["met", "on_track", "progressing", "intervention", "at_risk", "no_data"];