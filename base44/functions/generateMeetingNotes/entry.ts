import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT, buildStudentContext } from "../../shared/casecueContext.ts";

// CaseCue Meeting Notes Generator — drafts formal meeting notes for a
// scheduled/completed meeting, grounded in the verified student record, with
// clearly bracketed placeholders where the case manager must record outcomes.

const SCHEMA = {
  type: 'object',
  properties: {
    meeting_notes: { type: 'string' },
    parent_participation_notes: { type: 'string' },
    team_discussion_summary: { type: 'string' },
    decisions_made: { type: 'array', items: { type: 'string' } },
    next_steps: { type: 'array', items: { type: 'string' } },
    action_items: { type: 'array', items: { type: 'string' } }
  },
  required: ['meeting_notes', 'parent_participation_notes', 'team_discussion_summary', 'decisions_made', 'next_steps', 'action_items']
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.meeting_id) return Response.json({ error: 'A meeting is required.' }, { status: 400 });

    const meeting = await base44.entities.Meeting.get(body.meeting_id);

    let student = null;
    let goals = [];
    let progress = [];
    if (meeting.student_id) {
      student = await base44.entities.Student.get(meeting.student_id).catch(() => null);
      goals = await base44.entities.Goal.filter({ student_id: meeting.student_id });
      progress = await base44.entities.ProgressData.filter({ student_id: meeting.student_id }, 'date', 20);
    }

    const context = buildStudentContext(student, goals, progress);
    const meetingInfo = `Meeting: "${meeting.title}" (${meeting.meeting_type}) on ${meeting.date}${meeting.time ? ` at ${meeting.time}` : ''}${meeting.location ? ` at ${meeting.location}` : ''}.
Agenda: ${meeting.agenda || 'not specified'}
Parent concerns on file: ${meeting.parent_concerns || 'none recorded'}
Teacher concerns on file: ${meeting.teacher_concerns || 'none recorded'}`;

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are drafting meeting notes for the meeting described below. Use the VERIFIED CONTEXT for the student snapshot, goals, and progress — never invent facts, scores, or observations.

Structure the draft as:
- meeting_notes: a formal notes draft — meeting purpose, an attendees placeholder, a student snapshot drawn only from the verified record, and clearly bracketed placeholders like [Record team discussion] where meeting outcomes must be filled in by the case manager.
- parent_participation_notes: a short draft with a bracketed placeholder for how the parent participated and any concerns on file.
- team_discussion_summary: a draft of key discussion points grounded in the agenda and concerns on file, with bracketed placeholders for live discussion.
- decisions_made: bracketed placeholder prompts for the team to record decisions (e.g., "[Record decision about services]").
- next_steps: 3-5 practical next steps grounded in the data on file.
- action_items: bracketed action items with owner and due-date placeholders.

MEETING:
${meetingInfo}

VERIFIED CONTEXT:
${context}

Return JSON matching the schema.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic',
      response_json_schema: SCHEMA
    });

    const notes = typeof result === 'object' ? result : JSON.parse(result);
    return Response.json({ notes });
  } catch (error) {
    console.error('generateMeetingNotes failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}