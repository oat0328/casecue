import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT, buildStudentContext } from "../../shared/casecueContext.ts";

// New IEP Workspace — step 2: generate a full editable IEP draft from verified
// extracted facts and the student's records. Marks missing evidence instead of inventing.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.workspace_id) return Response.json({ error: 'A workspace is required.' }, { status: 400 });

    const workspace = await base44.entities.IepWorkspace.get(body.workspace_id);
    if (!workspace) return Response.json({ error: 'Workspace not found.' }, { status: 404 });

    const student = await base44.entities.Student.get(workspace.student_id);
    const goals = await base44.entities.Goal.filter({ student_id: workspace.student_id });
    const progress = await base44.entities.ProgressData.filter({ student_id: workspace.student_id }, '-date', 30);
    const studentContext = buildStudentContext(student, goals, progress);

    const analysis = workspace.analysis || {};
    const usableFacts = (analysis.facts || []).filter((f) => !f.rejected);
    const factLines = usableFacts.map((f) =>
      `${f.verified ? '[VERIFIED by teacher]' : '[UNVERIFIED — teacher review]'} ${f.category || 'general'}: ${f.fact} (Source: ${f.source_document}, p.${f.page})`
    ).join('\n');
    const gapLines = (analysis.gaps || []).map((g) => `- ${g.issue}${g.detail ? `: ${g.detail}` : ''}`).join('\n');
    const conflictLines = (analysis.conflicts || []).map((c) => `- ${c.description}`).join('\n');

    const schema = {
      type: 'object',
      properties: {
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              title: { type: 'string' },
              content: { type: 'string' },
              citations: { type: 'array', items: { type: 'string' } }
            },
            required: ['key', 'title', 'content']
          }
        },
        goals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              goal_area: { type: 'string' },
              conditions: { type: 'string' },
              action: { type: 'string' },
              baseline: { type: 'string' },
              target: { type: 'string' },
              criterion: { type: 'string' },
              measurement_method: { type: 'string' },
              data_schedule: { type: 'string' },
              present_level_link: { type: 'string' },
              evaluation_link: { type: 'string' }
            },
            required: ['goal_area', 'conditions', 'action', 'baseline', 'target', 'criterion']
          }
        },
        accommodations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              accommodation: { type: 'string' },
              need_addressed: { type: 'string' },
              source: { type: 'string' },
              setting: { type: 'string' },
              frequency: { type: 'string' },
              responsible_staff: { type: 'string' },
              change_type: { type: 'string', enum: ['existing', 'revised', 'new', 'proposed_for_removal'] }
            },
            required: ['accommodation', 'need_addressed', 'change_type']
          }
        },
        services: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              service: { type: 'string' },
              need_or_goal: { type: 'string' },
              provider: { type: 'string' },
              delivery: { type: 'string', enum: ['individual', 'group'] },
              frequency: { type: 'string' },
              minutes_per_session: { type: 'number' },
              sessions_per_week: { type: 'number' },
              location: { type: 'string' },
              service_type: { type: 'string', enum: ['direct', 'indirect', 'consultation'] },
              start_date: { type: 'string' },
              end_date: { type: 'string' },
              rationale: { type: 'string' }
            },
            required: ['service', 'need_or_goal', 'minutes_per_session', 'sessions_per_week']
          }
        },
        unresolved_decisions: { type: 'array', items: { type: 'string' } }
      },
      required: ['sections', 'goals', 'accommodations', 'services', 'unresolved_decisions']
    };

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are generating the IEP DRAFT for CaseCue's New IEP Workspace. The teacher has reviewed extracted document facts and now needs a complete, editable draft. This is a teacher-controlled drafting assistant — the draft is never final.

DRAFTING RULES:
- Use ONLY the extracted facts (verified and unverified), gaps, conflicts, and the verified student record. NEVER invent data, scores, dates, or services.
- When evidence for a statement is missing, write exactly "Needs verification — <what is missing>" in place of the statement.
- When something is a team decision (e.g. placement, ESY, service changes), write "Team decision required — <the question for the team>".
- Every section must include a citations array listing its supporting sources (document name + page, or "verified CaseCue record").

The "sections" array MUST contain exactly these 25 sections with these keys (titles may be human-readable):
student_profile, parent_concerns, strengths, evaluation_summary, eligibility_summary, academic_present_levels, functional_present_levels, disability_impact, special_factors, progress_measurement, modifications, supplementary_aids, special_ed_services, related_services, service_frequency, testing_accommodations, behavior_supports, assistive_technology, esy_consideration, transportation, lre_discussion, placement_info, participation_percentages, transition_services, progress_reporting_schedule.

PRESENT LEVELS sections (academic_present_levels, functional_present_levels) must each contain, labeled line by line: Strength; Measurable baseline (with source and date, or "Needs verification"); Grade-level comparison; Relevant evaluation findings; Progress on the previous goal; Educational/functional impact; Identified need. Flag any present level without a measurable baseline or reliable source with "Needs verification".
- When the source is an MDT/evaluation/reevaluation, turn its documented measurable findings into readable educator-ready DRAFT present-level language while preserving the actual scores, dates, observations, and source citation.
- Cover each documented area of need separately (for example reading, writing, math, behavior, communication, executive functioning) instead of collapsing unrelated findings into a vague paragraph.

GOALS: suggest measurable annual goals only where a present level and evidence exist. Each goal must include: goal_area, conditions, observable action, baseline, measurable target, criterion (accuracy/frequency/duration/quality), measurement_method, data_schedule, present_level_link (which present level it connects to), evaluation_link (which evaluation finding supports it).

ACCOMMODATIONS: for each, state need_addressed, source (document + page or "Needs verification"), setting, frequency, responsible_staff, and change_type (existing / revised / new / proposed_for_removal). Flag duplicates, vague wording, and anything unsupported in unresolved_decisions.

SERVICES: propose a service table only from documented needs; each row needs service, need_or_goal, provider (or "Team decision required"), delivery, frequency, minutes_per_session, sessions_per_week, location, service_type, start_date, end_date, rationale. Do NOT total or decide services that lack supporting evidence — mark them "Team decision required".

unresolved_decisions: list every open team decision, conflict, and gap the team must resolve.

VERIFIED STUDENT RECORD:
${studentContext}

EXTRACTED DOCUMENT FACTS:
${factLines || 'None yet — no document extraction available. Draft only from the verified student record and mark everything else "Needs verification".'}

IDENTIFIED GAPS:
${gapLines || 'None recorded.'}

IDENTIFIED CONFLICTS:
${conflictLines || 'None recorded.'}

Return JSON matching the schema.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic',
      response_json_schema: schema
    });

    const parsed = typeof result === 'object' ? result : JSON.parse(result);
    const draft = {
      ...parsed,
      sections: (parsed.sections || []).map((s) => ({ ...s, status: 'draft' })),
      goals: (parsed.goals || []).map((g) => ({ ...g, status: 'draft' })),
      accommodations: parsed.accommodations || [],
      services: parsed.services || [],
      unresolved_decisions: parsed.unresolved_decisions || [],
      generated_at: new Date().toISOString(),
    };

    await base44.entities.IepWorkspace.update(body.workspace_id, { draft, status: 'draft' });
    const sourceDocumentIds = Array.isArray(workspace.analysis?.source_documents) ? workspace.analysis.source_documents : [];
    const artifact = await base44.asServiceRole.entities.IepDraftArtifact.create({
      student_id: workspace.student_id,
      workspace_id: body.workspace_id,
      source_document_ids: sourceDocumentIds,
      draft_type: 'full_iep',
      content: draft,
      status: 'draft',
      generated_at: new Date().toISOString(),
    });
    if (sourceDocumentIds.length) {
      await base44.asServiceRole.entities.IepDraftSourceLink.bulkCreate(sourceDocumentIds.map((source_document_id) => ({
        student_id: workspace.student_id,
        workspace_id: body.workspace_id,
        draft_artifact_id: artifact.id,
        source_document_id,
      })));
    }
    await base44.asServiceRole.entities.IepDraftReviewState.create({
      student_id: workspace.student_id,
      draft_artifact_id: artifact.id,
      review_status: 'educator_review_required',
    });
    return Response.json({ draft, draft_artifact_id: artifact.id });
  } catch (error) {
    console.error('iepWorkspaceDraft failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}