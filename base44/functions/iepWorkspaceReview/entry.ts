import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";
import { formatDraftSections, formatDraftGoals, formatDraftAccommodations, formatDraftServices, unresolvedDecisions, formatPlacement } from "../../shared/workspaceFormat.ts";

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

    const placement = workspace.placement || {};
    const draftLines = formatDraftSections(draft);
    const goalLines = formatDraftGoals(draft);
    const accomLines = formatDraftAccommodations(draft);
    const serviceLines = formatDraftServices(draft);
    const placementLine = formatPlacement(placement);
    const unresolved = unresolvedDecisions(draft);

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