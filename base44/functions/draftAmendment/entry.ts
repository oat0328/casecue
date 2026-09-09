import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT, buildStudentContext } from "../../shared/casecueContext.ts";

// CaseCue Amendment Drafting Tool — generates editable IEP amendment
// language for a specific change type, grounded in verified student records.

const AMENDMENT_SCHEMA = {
  type: 'object',
  properties: {
    reason_for_change: { type: 'string' },
    current_language: { type: 'string' },
    proposed_language: { type: 'string' },
    parent_communication_summary: { type: 'string' }
  },
  required: ['reason_for_change', 'proposed_language', 'parent_communication_summary']
};

const TYPE_LABELS = {
  add_service: 'Add a Service',
  remove_service: 'Remove a Service',
  update_goal: 'Update a Goal',
  update_accommodation: 'Update an Accommodation',
  update_placement: 'Update Placement',
  update_behavior_support: 'Update Behavior Support'
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const studentId = body.student_id;
    const amendmentType = TYPE_LABELS[body.amendment_type] ? body.amendment_type : null;
    const reason = String(body.reason || '').trim();
    const details = String(body.details || '').trim();
    const currentLanguage = String(body.current_language || '').trim();

    if (!studentId) return Response.json({ error: 'A student is required.' }, { status: 400 });
    if (!amendmentType) return Response.json({ error: 'A valid amendment type is required.' }, { status: 400 });
    if (!reason) return Response.json({ error: 'A reason for the change is required.' }, { status: 400 });

    const student = await base44.entities.Student.get(studentId);
    const goals = await base44.entities.Goal.filter({ student_id: studentId });
    const context = buildStudentContext(student, goals, null);

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are running the CaseCue Amendment Drafting Tool. Draft IEP amendment language for the change described below.

Amendment type: ${TYPE_LABELS[amendmentType]}
Reason for change (provided by the teacher): ${reason}
${details ? `Specifics provided by the teacher: ${details}` : 'No further specifics provided.'}
${currentLanguage ? `Current language being changed: """${currentLanguage}"""` : 'No current language was provided — in current_language, write "[Paste the current IEP language here]" as a placeholder for the team.'}

Rules:
- Ground every reference to the student in the VERIFIED CONTEXT below; never invent facts, dates, services, or scores.
- reason_for_change: restate the teacher's reason in clear, professional language.
- proposed_language: clean, complete amendment wording the teacher can present to the IEP team and edit.
- parent_communication_summary: a warm, plain-language summary a parent can easily understand.
- End each drafted field with the note: "Draft — Educator/IEP Team Review Required."

VERIFIED CONTEXT:
${context}

Return JSON matching the schema.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic',
      response_json_schema: AMENDMENT_SCHEMA
    });

    const amendment = typeof result === 'object' ? result : JSON.parse(result);
    return Response.json({ amendment });
  } catch (error) {
    console.error('draftAmendment failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}