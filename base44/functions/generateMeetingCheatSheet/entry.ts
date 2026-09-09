import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";
import { formatDraftSections, formatDraftGoals, formatDraftAccommodations, formatDraftServices, unresolvedDecisions, formatPlacement, formatReviewFindings } from "../../shared/workspaceFormat.ts";

// IEP Meeting Navigator — generates the fixed 32-section meeting guide filled with
// verified student data. Never invents; flags missing info for the meeting.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.student_id) return Response.json({ error: 'A student is required.' }, { status: 400 });

    const student = await base44.entities.Student.get(body.student_id);
    if (!student) return Response.json({ error: 'Student not found.' }, { status: 404 });

    const goals = await base44.entities.Goal.filter({ student_id: student.id });
    const progress = await base44.entities.ProgressData.filter({ student_id: student.id }, '-date', 30);
    const sessions = await base44.entities.SessionRecord.filter({ student_id: student.id }, '-date', 60);
    const documents = await base44.entities.Document.filter({ student_id: student.id }, '-date_uploaded', 10);
    const workspaces = await base44.entities.IepWorkspace.filter({ student_id: student.id }, '-created_date', 1);
    const workspace = workspaces && workspaces.length ? workspaces[0] : null;

    // --- Verified session context (Stage 11 connection) ---
    const now = new Date();
    const recent = (sessions || []).filter((s) => {
      const d = new Date(`${s.date}T00:00:00`);
      return !isNaN(d) && (now - d) / 86400000 <= 30;
    });
    const delivered = recent.filter((s) => ['completed', 'partially_completed', 'makeup_session'].includes(s.status))
      .reduce((sum, s) => sum + (Number(s.delivered_minutes) || 0), 0);
    const missedCount = recent.filter((s) => ['student_absent', 'provider_absent', 'refused', 'school_activity'].includes(s.status)).length;
    const makeupCount = recent.filter((s) => s.status === 'makeup_session').length;

    const goalLines = (goals || []).map((g, i) => {
      const pts = (progress || []).filter((p) => p.goal_id === g.id);
      const pct = pts.map((p) => p.percentage).filter((v) => v != null);
      const avg = pct.length ? Math.round((pct.reduce((a, b) => a + b, 0) / pct.length) * 10) / 10 : null;
      const range = pts.length ? `${pts[pts.length - 1].date} back to ${pts[0].date}` : 'no data recorded';
      return `Goal ${i + 1} (${g.goal_area || 'General'}, status ${g.status || 'active'}): ${g.goal_text || g.action || '—'}
  Baseline: ${g.baseline || 'not recorded'} | Target: ${g.target || 'not recorded'} | Measurement: ${g.measurement_method || 'not recorded'}
  Progress data: ${pts.length} points (${range})${avg != null ? `, average ${avg}%` : ''}${pts.length ? '' : ' — INSUFFICIENT DATA: do not describe as progress or lack of progress'}`;
    }).join('\n');

    const sessionLine = `Sessions (last 30 days): ${recent.length} recorded · ${delivered} minutes delivered · ${missedCount} missed · ${makeupCount} makeup.
Required weekly minutes per student record: ${student.service_minutes || 'not recorded'}.`;

    const docLines = (documents || []).map((d) => `- ${d.filename} (${d.document_type}, uploaded ${d.date_uploaded})`).join('\n');

    const ws = workspace || {};
    const factLines = (ws.analysis?.facts || []).filter((f) => !f.rejected)
      .map((f) => `${f.verified ? '[VERIFIED]' : '[UNVERIFIED]'} ${f.fact} (Source: ${f.source_document}, p.${f.page})`).join('\n');
    const draft = ws.draft || {};
    const sectionLines = formatDraftSections(draft).slice(0, 12000);
    const draftGoalLines = formatDraftGoals(draft);
    const accomLines = formatDraftAccommodations(draft);
    const serviceLines = formatDraftServices(draft);
    const unresolved = unresolvedDecisions(draft);
    const placement = ws.placement || {};
    const placementLine = formatPlacement(placement);
    const findingsLine = formatReviewFindings(ws.review || {});

    const schema = {
      type: 'object',
      properties: {
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              index: { type: 'number' },
              title: { type: 'string' },
              key_info: { type: 'string', description: 'Information extracted from the records for this step' },
              talking_points: { type: 'array', items: { type: 'string' }, description: '2-3 short suggested talking points' },
              source: { type: 'string', description: 'Source document and page, or "verified CaseCue record", or "not documented"' },
              questions: { type: 'array', items: { type: 'string' }, description: '1-2 questions the teacher should ask' },
              documented_decisions: { type: 'string', description: 'Decisions already documented in records, or "none documented"' },
              required_decisions: { type: 'string', description: 'Decisions the team still must make, or "none"' }
            },
            required: ['index', 'title', 'key_info', 'talking_points']
          }
        }
      },
      required: ['steps']
    };

    const titles = [
      'Welcome and introductions', 'Meeting purpose', 'Procedural safeguards confirmation', 'Parent concerns',
      'Student strengths and interests', 'Eligibility', 'MDT/evaluation findings', 'Academic present levels',
      'Functional present levels', 'Previous goal progress', 'Current areas of need', 'Proposed annual goals',
      'Progress measurement', 'Accommodations', 'Modifications', 'Supplementary aids', 'Behavior considerations',
      'Assistive technology', 'Special education services', 'Related services', 'Frequency and service minutes',
      'Testing participation', 'Extended School Year consideration', 'Transportation consideration',
      'Least Restrictive Environment discussion', 'Placement and participation percentage', 'Transition planning',
      'Progress-reporting schedule', 'Unresolved decisions', 'Parent questions', 'Agreement and next steps',
      'Signatures and completion'
    ];

    const pageLines = (ws.page_summaries?.pages || []).map(
      (p) => `Page ${p.page_number} (${p.section_name || 'unlabeled'}): ${(p.important_facts || []).join(' | ') || p.summary || 'no facts extracted'}`
    ).join('\n');

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are building the IEP MEETING NAVIGATOR — a 32-section guided workspace so a teacher can move confidently through the entire IEP meeting without reading the full document during the meeting. The teacher presents; the team decides. You never diagnose, never finalize an IEP, and never make a placement decision.

Return a "steps" array with EXACTLY ${titles.length} steps, in this exact order with these exact titles:
${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

For each step fill: key_info (facts extracted from the records below), talking_points (2-3 short suggested phrases the teacher can say), source (document + page, "verified CaseCue record", or "not documented"), questions (1-2 questions to ask the team or parent), documented_decisions, required_decisions.

STRICT RULES:
- Use ONLY the records provided. NEVER invent scores, dates, services, or statements.
- Missing information: use "Not documented — capture during the meeting." Never guess.
- For previous goal progress, report the actual data points, count, and date range. If data is insufficient, say so — never describe it as progress or as lack of progress.
- Separate facts from suggestions: key_info = facts; talking_points = suggestions.
- Placement and ESY are TEAM decisions — present options and the worksheet inputs, never a recommendation as decided.

STUDENT RECORD: ${student.first_name} ${student.last_name}${student.grade ? `, grade ${student.grade}` : ''}${student.eligibility_category ? `, eligibility: ${student.eligibility_category}` : ''}. Strengths: ${student.strengths || 'not recorded'}. Needs: ${student.areas_of_need || 'not recorded'}. Present levels on file: ${student.present_levels || 'not recorded'}. Accommodations on file: ${student.accommodations || 'not recorded'}. Key dates: IEP ${student.iep_date || '—'}, annual review ${student.annual_review_due || '—'}, reevaluation ${student.reevaluation_due || '—'}.

GOALS AND PROGRESS:
${goalLines || 'No goals recorded.'}

SESSION DATA (verified, last 30 days):
${sessionLine}

DOCUMENTS ON FILE:
${docLines || 'No documents uploaded.'}

EXTRACTED DOCUMENT FACTS:
${factLines || 'No document extraction available.'}

PAGE-BY-PAGE IEP SUMMARIES (from processed documents):
${pageLines || 'No page summaries generated yet.'}

WORKING IEP DRAFT SECTIONS (from the New IEP Workspace, statuses shown):
${sectionLines || 'No draft generated.'}

DRAFT GOALS: ${draftGoalLines || 'None.'}
DRAFT ACCOMMODATIONS: ${accomLines || 'None.'}
DRAFT SERVICES: ${serviceLines || 'None.'}
${placementLine}
UNRESOLVED TEAM DECISIONS: ${unresolved || 'None listed.'}
CASECUE REVIEW FINDINGS: ${findingsLine || 'No review run yet.'}

Return JSON matching the schema.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic',
      response_json_schema: schema
    });

    const parsed = typeof result === 'object' ? result : JSON.parse(result);
    let steps = (parsed.steps || []).slice(0, 32).map((s, i) => ({
      index: s.index || i + 1,
      title: s.title || titles[i],
      key_info: s.key_info || 'Not documented — capture during the meeting.',
      talking_points: s.talking_points || [],
      source: s.source || 'not documented',
      questions: s.questions || [],
      documented_decisions: s.documented_decisions || 'none documented',
      required_decisions: s.required_decisions || 'none',
      presenter_notes: '',
      team_notes: '',
      parent_notes: [],
      decisions: [],
      flagged: false,
      discussed: false,
    }));

    const payload = {
      student_id: student.id,
      workspace_id: workspace ? workspace.id : null,
      status: 'draft',
      current_step: 0,
      steps,
      meeting_data: {},
      organization_id: student.organization_id || undefined,
    };

    const existing = await base44.entities.MeetingCheatSheet.filter({ student_id: student.id }, '-created_date', 1);
    let record;
    if (existing && existing.length) {
      record = await base44.entities.MeetingCheatSheet.update(existing[0].id, payload);
    } else {
      record = await base44.entities.MeetingCheatSheet.create(payload);
    }

    return Response.json({ cheat_sheet: record });
  } catch (error) {
    console.error('generateMeetingCheatSheet failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}