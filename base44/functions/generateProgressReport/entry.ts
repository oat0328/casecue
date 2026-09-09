import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";

// Generates an AI-drafted quarterly progress report for one student.
// Uses ONLY verified goal + progress data. Bounded: max 20 goals, 200 data points.

const MAX_GOALS = 20;
const MAX_DATA_POINTS = 200;

function computeStats(goal, points) {
  const pct = points.map((p) => (typeof p.percentage === 'number' ? p.percentage : null)).filter((v) => v !== null);
  const latest = points.length ? points[points.length - 1] : null;
  const firstPct = pct.length ? pct[0] : null;
  const latestPct = pct.length ? pct[pct.length - 1] : null;
  const avgPct = pct.length ? Math.round((pct.reduce((a, b) => a + b, 0) / pct.length) * 10) / 10 : null;
  return {
    goal_id: goal.id,
    goal_area: goal.goal_area || 'General',
    goal_text: goal.goal_text || '',
    baseline: goal.baseline || null,
    target: goal.target || null,
    criterion: goal.criterion || null,
    measurement_method: goal.measurement_method || null,
    status: goal.status || 'active',
    data_points: points.length,
    first_percentage: firstPct,
    latest_percentage: latestPct,
    latest_date: latest ? latest.date : null,
    latest_score: latest ? `${latest.correct ?? '?'}/${latest.total ?? '?'}` : null,
    average_percentage: avgPct,
    trend: firstPct !== null && latestPct !== null ? Math.round((latestPct - firstPct) * 10) / 10 : null,
    prompting_level: latest ? latest.prompting_level : null,
    recent_notes: points.slice(-3).map((p) => p.observation_notes || p.qualitative_notes).filter(Boolean).slice(0, 3),
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const studentId = (body.student_id || '').toString().trim();
    if (!studentId) return Response.json({ error: 'A student is required.' }, { status: 400 });

    const student = await base44.entities.Student.get(studentId);
    const goals = (await base44.entities.Goal.filter({ student_id: studentId })).slice(0, MAX_GOALS);
    const progress = await base44.entities.ProgressData.filter({ student_id: studentId }, 'date', MAX_DATA_POINTS);

    if (!goals.length) {
      return Response.json({ error: 'This student has no goals yet. Add goals first.' }, { status: 400 });
    }

    const stats = goals.map((g) => computeStats(g, progress.filter((p) => p.goal_id === g.id)));
    const unassigned = progress.filter((p) => !p.goal_id).slice(-10);

    const contextLines = [
      `STUDENT: ${student.first_name} ${student.last_name}, Grade ${student.grade || '?'}, ${student.eligibility_category || 'eligibility not on file'}`,
      `REPORTING PERIOD DATA (use only this — never invent):`,
    ];
    stats.forEach((s) => {
      contextLines.push(`GOAL [${s.goal_area}] "${s.goal_text}"`);
      contextLines.push(`  Baseline: ${s.baseline || 'not recorded'} | Target: ${s.target || 'not recorded'} | Criterion: ${s.criterion || 'not recorded'} | Measure: ${s.measurement_method || 'not recorded'} | Status: ${s.status}`);
      if (s.data_points > 0) {
        contextLines.push(`  Data points: ${s.data_points} | First %: ${s.first_percentage} | Latest %: ${s.latest_percentage} (on ${s.latest_date}, score ${s.latest_score}) | Average %: ${s.average_percentage} | Change since first: ${s.trend !== null ? s.trend : 'n/a'} | Latest prompting: ${s.prompting_level}`);
      } else {
        contextLines.push(`  NO progress data recorded for this goal.`);
      }
      if (s.recent_notes.length) contextLines.push(`  Recent teacher notes: ${s.recent_notes.join(' | ')}`);
    });
    if (unassigned.length) {
      contextLines.push(`ADDITIONAL PROGRESS ENTRIES NOT LINKED TO A GOAL:`);
      unassigned.forEach((p) => contextLines.push(`  ${p.date}: ${p.correct ?? '?'}/${p.total ?? '?'} (${p.percentage ?? '?'}%) — ${p.observation_notes || ''}`));
    }

    const prompt = `${CASECUE_SYSTEM_PROMPT}

VERIFIED CONTEXT (use only this — never invent):
${contextLines.join('\n')}

TASK: Draft a quarterly progress report for this student's IEP goals.
- For each goal above (same order, use the goal area as the title), write a 2-4 sentence parent-friendly progress statement: baseline, where the student is now, whether they are making progress toward the target, and the measurement basis.
- If a goal has no data, say exactly that there is not enough progress data recorded yet to report on it — do not guess.
- Then write an overall_summary of 3-5 sentences for the whole report, warm and professional, suitable to share with parents after educator review.
- Never state the student has met or not met a goal unless the data clearly shows it.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic',
      response_json_schema: {
        type: 'object',
        properties: {
          goal_reports: {
            type: 'array',
            items: {
              type: 'object',
              properties: { goal_area: { type: 'string' }, statement: { type: 'string' } },
              required: ['goal_area', 'statement'],
            },
          },
          overall_summary: { type: 'string' },
        },
        required: ['goal_reports', 'overall_summary'],
      },
    });

    const llm = result && typeof result === 'object' && !Array.isArray(result) ? result : {};
    const goal_reports = Array.isArray(llm.goal_reports) ? llm.goal_reports.slice(0, MAX_GOALS) : [];
    const overall_summary = (llm.overall_summary || '').toString();

    return Response.json({
      student: { first_name: student.first_name, last_name: student.last_name, grade: student.grade || '' },
      generated_at: new Date().toISOString().slice(0, 10),
      stats,
      goal_reports,
      overall_summary,
    });
  } catch (error) {
    console.error('generateProgressReport: failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}