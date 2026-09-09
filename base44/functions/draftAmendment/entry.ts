import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT, buildStudentContext } from "../../shared/casecueContext.ts";

// CaseCue Amendment drafter: compares the CURRENT IEP on file (student record
// + latest IEP workspace draft) against NEW information, and generates formal
// amendment language for goal / accommodation / service / placement / behavior
// changes. Educator review is always required.

const SCHEMA = {
  type: 'object',
  properties: {
    current_state: { type: 'string' },
    proposed_state: { type: 'string' },
    amendment_language: { type: 'string' },
    rationale: { type: 'string' },
    review_notes: { type: 'string' }
  },
  required: ['current_state', 'proposed_state', 'amendment_language', 'rationale', 'review_notes']
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.student_id) return Response.json({ error: 'A student is required.' }, { status: 400 });
    const amendmentType = ["goal", "accommodation", "service", "placement", "behavior"].includes(body.amendment_type)
      ? body.amendment_type : "goal";
    if (!body.change_description || !body.change_description.trim()) {
      return Response.json({ error: 'Describe the change being made.' }, { status: 400 });
    }

    const student = await base44.entities.Student.get(body.student_id);
    const goals = await base44.entities.Goal.filter({ student_id: student.id });
    const workspaces = await base44.entities.IepWorkspace.filter({ student_id: student.id }, '-created_date', 1);
    const workspace = workspaces && workspaces.length ? workspaces[0] : null;

    const currentIep = [
      buildStudentContext(student, goals, []),
      workspace && workspace.draft ? `\nLATEST IEP DRAFT ON FILE (JSON):\n${JSON.stringify(workspace.draft).slice(0, 8000)}` : "\nNo IEP workspace draft on file — use the student record as the current IEP state.",
      workspace && workspace.analysis ? `\nEXTRACTED DOCUMENT ANALYSIS:\n${JSON.stringify(workspace.analysis).slice(0, 4000)}` : ""
    ].join("\n");

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are drafting an IEP AMENDMENT for a special education student.

Task: Compare the CURRENT IEP information below against the NEW INFORMATION the case manager provided, then generate formal amendment language an IEP team could review and adopt.

Amendment type: ${amendmentType}
New information / requested change: ${body.change_description.slice(0, 3000)}

Steps:
1. current_state — summarize what the current IEP/record says about this area (quote it if present). If nothing is on file, say so.
2. proposed_state — state the proposed change clearly.
3. amendment_language — the formal amendment statement (e.g., "The IEP team agrees to amend..."), written so the team can review, edit, and adopt it. Use [bracketed placeholders] for any decision the team must make.
4. rationale — a short, data-grounded explanation of why the change is proposed, citing only the information provided.
5. review_notes — what the case manager must verify or collect before the amendment is finalized (e.g., parent consent, meeting requirements).

CURRENT IEP / VERIFIED RECORD:
${currentIep}

Return JSON matching the schema.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic',
      response_json_schema: SCHEMA
    });

    const amendment = typeof result === 'object' ? result : JSON.parse(result);
    return Response.json({ amendment });
  } catch (error) {
    console.error('draftAmendment failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}