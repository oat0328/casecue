import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";

// New IEP Workspace — step 3: CaseCue Review of the working draft.
// Reports potential issues only — never declares compliance or makes decisions.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.workspace_id) return Response.json({ error: 'A workspace is required.' }, { status: 400 });

    const workspace = await base44.entities.IepWorkspace.get(body.workspace_id);
    if (!workspace || !workspace.draft) {
      return Response.json({ error: 'Generate an IEP draft before running the review.' }, { status: 400 });
    }

    const student = await base44.entities.Student.get(workspace.student_id);
    const draft = workspace.draft;

    const draftLines = (draft.sections || []).map((s) =>
      `## ${s.title} [${s.status || 'draft'}]\n${s.content}`
    ).join('\n\n');
    const goalLines = (draft.goals || []).map((g, i) =>
      `Goal ${i + 1} [${g.status || 'draft'}]: ${g.goal_area} — ${g.conditions || ''} ${g.action || ''} | Baseline: ${g.baseline || 'MISSING'} | Target: ${g.target || 'MISSING'} | Criterion: ${g.criterion || 'MISSING'} | Measurement: ${g.measurement_method || 'MISSING'} | Schedule: ${g.data_schedule || 'MISSING'}`
    ).join('\n');
    const accomLines = (draft.accommodations || []).map((a) =>
      `- ${a.accommodation} [${a.change_type}] need: ${a.need_addressed || '—'} source: ${a.source || '—'}`
    ).join('\n');
    const serviceLines = (draft.services || []).map((s) =>
      `- ${s.service}: ${s.minutes_per_session ?? '?'} min x ${s.sessions_per_week ?? '?'}/wk, ${s.delivery || '?'} ${s.service_type || 'direct'}, provider: ${s.provider || '—'}, need: ${s.need_or_goal || '—'}`
    ).join('\n');
    const placement = workspace.placement || {};
    const placementLine = placement.instructional_minutes_per_day
      ? `Placement worksheet (teacher inputs, for team verification): instructional ${placement.instructional_minutes_per_day}/day x ${placement.instructional_days_per_week} days; inside GE ${placement.minutes_inside_ge} min; outside GE ${placement.minutes_outside_ge} min.`
      : 'Placement worksheet: not completed yet.';
    const unresolved = (draft.unresolved_decisions || []).join('; ');

    const schema = {
      type: 'object',
      properties: {
        score: { type: 'number' },
        category_scores: {
          type: 'object',
          properties: {
            present_levels: { type: 'number' },
            goals: { type: 'number' },
            data_alignment: { type: 'number' },
            services_accommodations: { type: 'number' },
            progress_monitoring: { type: 'number' },
            document_consistency: { type: 'number' }
          }
        },
        findings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              level: { type: 'string', enum: ['good', 'review', 'missing'] },
              title: { type: 'string' },
              what_found: { type: 'string' },
              why_flagged: { type: 'string' },
              where_found: { type: 'string' },
              suggested_action: { type: 'string' }
            },
            required: ['category', 'level', 'title', 'what_found', 'why_flagged']
          }
        },
        summary: { type: 'string' }
      },
      required: ['score', 'findings', 'summary']
    };

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are running CaseCue Review on a working IEP draft in the New IEP Workspace. Report POTENTIAL issues only. Never declare the draft compliant, legal, or complete, and never make a placement or eligibility decision.

CHECK FOR:
- Missing IEP sections (any section left as "Needs verification" or "Team decision required")
- Conflicting student information between sections
- Expired data (old evaluation dates relative to today)
- Goals without baselines or with unmeasurable targets
- Goals disconnected from present levels or evaluation findings
- Unsupported or vague accommodations; possible modifications mislabeled as accommodations
- Services disconnected from documented needs; duplicate or overlapping services
- Incorrect service-minute totals (weekly minutes vs stated frequency)
- Placement-percentage errors against the teacher's worksheet inputs
- Unsupported statements and blank team-decision fields

Use 3 finding levels: "good" (Looks Good), "review" (Review Recommended), "missing" (Missing / Potential Conflict).
For each finding: category, level, title, what_found, why_flagged, where_found, suggested_action.
Produce a score out of 100 and per-category scores out of 100, plus a short summary of how many items need attention.

STUDENT: ${student.first_name} ${student.last_name}${student.grade ? `, grade ${student.grade}` : ''}

IEP DRAFT SECTIONS:
${draftLines || 'None.'}

GOALS:
${goalLines || 'None.'}

ACCOMMODATIONS:
${accomLines || 'None.'}

SERVICES:
${serviceLines || 'None.'}

${placementLine}
UNRESOLVED TEAM DECISIONS: ${unresolved || 'None listed.'}

Return JSON matching the schema.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic',
      response_json_schema: schema
    });

    const review = typeof result === 'object' ? result : JSON.parse(result);
    await base44.entities.IepWorkspace.update(body.workspace_id, { review, status: 'review' });
    return Response.json({ review });
  } catch (error) {
    console.error('iepWorkspaceReview failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}