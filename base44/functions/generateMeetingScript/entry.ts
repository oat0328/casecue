import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT, buildStudentContext } from "../../shared/casecueContext.ts";

// CaseCue IEP Meeting Command Center: generates (1) a complete Meeting Packet
// (snapshot, eligibility, strengths, needs, present levels, goals, services,
// accommodations, behavior supports, parent concerns, progress summary, team
// recommendations, discussion questions) and (2) a FULL spoken meeting script
// that walks through EVERY page of the uploaded IEP in order, in natural
// read-aloud language, without skipping sections.

const SCHEMA = {
  type: 'object',
  properties: {
    packet: {
      type: 'object',
      properties: {
        student_snapshot: { type: 'string' },
        eligibility: { type: 'string' },
        strengths: { type: 'string' },
        areas_of_need: { type: 'string' },
        present_levels: { type: 'string' },
        goals: { type: 'string' },
        services: { type: 'string' },
        accommodations: { type: 'string' },
        behavior_supports: { type: 'string' },
        parent_concerns: { type: 'string' },
        progress_summary: { type: 'string' },
        team_recommendations: { type: 'string' },
        questions_for_discussion: { type: 'string' }
      },
      required: ['student_snapshot', 'eligibility', 'strengths', 'areas_of_need', 'present_levels', 'goals', 'services', 'accommodations', 'behavior_supports', 'parent_concerns', 'progress_summary', 'team_recommendations', 'questions_for_discussion']
    },
    script: { type: 'string' },
    talking_points: { type: 'array', items: { type: 'string' } },
    important_changes: { type: 'array', items: { type: 'string' } }
  },
  required: ['packet', 'script', 'talking_points', 'important_changes']
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.student_id) return Response.json({ error: 'A student is required.' }, { status: 400 });

    const student = await base44.entities.Student.get(body.student_id);
    const goals = await base44.entities.Goal.filter({ student_id: student.id });
    const progress = await base44.entities.ProgressData.filter({ student_id: student.id }, 'date', 20);
    const meetings = await base44.entities.Meeting.filter({ student_id: student.id }, '-created_date', 1);
    const workspaces = await base44.entities.IepWorkspace.filter({ student_id: student.id }, '-created_date', 1);
    const workspace = workspaces && workspaces.length ? workspaces[0] : null;

    const context = buildStudentContext(student, goals, progress);

    const pageSummaries = workspace && workspace.page_summaries
      ? JSON.stringify(workspace.page_summaries).slice(0, 20000)
      : "No page-by-page IEP summary on file. Generate the script from the verified student record and IEP draft, and note that a page-level walkthrough requires uploading the current IEP and generating its page summary first.";

    const currentDraft = workspace && workspace.draft
      ? JSON.stringify(workspace.draft).slice(0, 8000)
      : "No IEP draft on file.";

    const meetingInfo = meetings && meetings.length
      ? `Upcoming/last meeting on file: "${meetings[0].title}" (${meetings[0].meeting_type}) on ${meetings[0].date}. Parent concerns on file: ${meetings[0].parent_concerns || "none recorded"}. Teacher concerns: ${meetings[0].teacher_concerns || "none recorded"}.`
      : "No meeting on file — assume this is the annual review meeting.";

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are preparing the IEP Meeting Command Center materials for this student: a complete MEETING PACKET and a FULL MEETING SCRIPT.

PART 1 — MEETING PACKET. Fill every packet field using ONLY the verified context below. If a field has no verified information, write exactly what is missing (e.g., "No verified services on file") — never invent content.

PART 2 — MEETING SCRIPT. Write a complete, natural-speaking script the case manager can read aloud to walk the team through the ENTIRE IEP:
- Read the PAGE-BY-PAGE SUMMARY below in order, page by page. Do NOT skip any page or section.
- For each page, speak in conversational language, e.g., "On this page we reviewed [Student]'s reading performance. Based on classroom assessments and progress monitoring, [Student] continues to demonstrate strengths in..."
- Cover present levels, goals, services, accommodations, behavior supports, progress data, and any changes from the previous IEP.
- End with next steps and an invitation for parent/team questions.
- Be case-manager friendly: clear pacing cues, no jargon where parent-friendly wording works better.
- talking_points: 5-8 short bullets for quick reference during the meeting.
- important_changes: anything that changed from the prior IEP (or "no prior IEP on file to compare").

MEETING INFO:
${meetingInfo}

VERIFIED STUDENT RECORD:
${context}

LATEST IEP DRAFT:
${currentDraft}

PAGE-BY-PAGE IEP SUMMARY (walk through EVERY page, in order):
${pageSummaries}

Return JSON matching the schema.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic',
      response_json_schema: SCHEMA
    });

    const data = typeof result === 'object' ? result : JSON.parse(result);
    return Response.json(data);
  } catch (error) {
    console.error('generateMeetingScript failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}