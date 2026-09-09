import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT, buildStudentContext } from "../../shared/casecueContext.ts";

// CaseCue Goal Analyzer — AI review of a student's goals and progress data:
// goals likely met, goals at risk (with suggested interventions), growth and
// regression areas, and practical next steps. Grounded in verified records only.

const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    goals_likely_met: { type: 'array', items: { type: 'string' } },
    goals_at_risk: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          goal: { type: 'string' },
          finding: { type: 'string' },
          recommended_intervention: { type: 'string' }
        }
      }
    },
    growth_areas: { type: 'array', items: { type: 'string' } },
    regression_areas: { type: 'array', items: { type: 'string' } },
    teacher_recommendations: { type: 'array', items: { type: 'string' } }
  },
  required: ['summary', 'goals_at_risk', 'teacher_recommendations']
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const studentId = body.student_id;
    if (!studentId) return Response.json({ error: 'A student is required.' }, { status: 400 });

    const student = await base44.entities.Student.get(studentId);
    const goals = await base44.entities.Goal.filter({ student_id: studentId });
    const progress = await base44.entities.ProgressData.filter({ student_id: studentId }, 'date', 100);
    if (!goals || goals.length === 0) {
      return Response.json({ error: 'No goals on file for this student yet — add goals first.' }, { status: 400 });
    }

    const context = buildStudentContext(student, goals, progress);

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are running the CaseCue Goal Analyzer. Review the student's goals and progress-monitoring data in the VERIFIED CONTEXT below.

Identify:
- goals_likely_met: goals the progress data suggests are at or near their targets
- goals_at_risk: goals showing regression or insufficient progress toward target — for each give a finding based ONLY on the logged data and one concrete intervention a teacher could try
- growth_areas: skill areas showing measurable growth
- regression_areas: skill areas showing regression
- summary: 3-5 sentences a teacher could read before an IEP meeting
- teacher_recommendations: short, practical next steps

STRICT RULES:
- Ground every conclusion in the provided progress data; never invent scores, dates, or observations.
- If progress data is missing or too sparse to judge a goal, say exactly that instead of guessing.
- Frame everything as supporting educator review — no compliance claims.

VERIFIED CONTEXT:
${context}

Return JSON matching the schema.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic',
      response_json_schema: SCHEMA
    });

    const analysis = typeof result === 'object' ? result : JSON.parse(result);
    return Response.json({ analysis });
  } catch (error) {
    console.error('analyzeGoalProgress failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}