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
    opening: { type: 'string' },
    page_flow: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          page_number: { type: 'number' },
          section_name: { type: 'string' },
          say_this: { type: 'string' },
          ask_team: { type: 'array', items: { type: 'string' } },
          facilitator_note: { type: 'string' },
          source: { type: 'string' }
        },
        required: ['page_number', 'section_name', 'say_this']
      }
    },
    closing: { type: 'string' },
    script: { type: 'string' },
    talking_points: { type: 'array', items: { type: 'string' } },
    important_changes: { type: 'array', items: { type: 'string' } }
  },
  required: ['packet', 'opening', 'page_flow', 'closing', 'script', 'talking_points', 'important_changes']
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

    // Meeting facilitation must be driven by the actual current IEP page order.
    // If a workspace page summary has not been generated yet, use the saved full-page
    // extraction from the newest processed IEP rather than pretending a page flow exists.
    const documents = await base44.entities.Document.filter({ student_id: student.id }, '-date_uploaded', 50);
    const currentIep = (documents || []).find((d) => d.extraction_status === 'processed' && /iep/i.test(`${d.document_type || ''} ${d.filename || ''}`));
    const fallbackPages = currentIep?.processing_results?.pages || [];
    const pageSummarySource = workspace?.page_summaries?.pages?.length
      ? workspace.page_summaries
      : (fallbackPages.length ? { document_id: currentIep.id, document_name: currentIep.filename, pages: fallbackPages } : null);
    const pageSummaries = pageSummarySource
      ? JSON.stringify(pageSummarySource).slice(0, 90000)
      : "No page-by-page IEP evidence is available. Do not invent a page walkthrough; tell the educator to upload/process the current IEP first.";

    const currentDraft = workspace && workspace.draft
      ? JSON.stringify(workspace.draft).slice(0, 8000)
      : "No IEP draft on file.";

    const meetingInfo = meetings && meetings.length
      ? `Upcoming/last meeting on file: "${meetings[0].title}" (${meetings[0].meeting_type}) on ${meetings[0].date}. Parent concerns on file: ${meetings[0].parent_concerns || "none recorded"}. Teacher concerns: ${meetings[0].teacher_concerns || "none recorded"}.`
      : "No meeting type is verified on file. Do NOT assume annual review, MET, reevaluation, eligibility, amendment, or any other meeting type. Use neutral purpose language and leave the exact meeting type for the educator to confirm.";

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are preparing the IEP Meeting Command Center materials for this student: a complete MEETING PACKET and a FULL MEETING SCRIPT.

PART 1 — MEETING PACKET. Fill every packet field using ONLY the verified context below. If a field has no verified information, write exactly what is missing (e.g., "No verified services on file") — never invent content.

PART 2 — FACILITATOR SCRIPT. Act like an excellent, warm IEP case-manager FACILITATOR. Create a script that is easy to read aloud in a real meeting, not a legalistic summary.

OPENING:
- Start with a short natural greeting: "Good afternoon, everyone. Thank you for being here. My name is [case manager name if known], and I am [Student]'s special education teacher/case manager." If the facilitator's name/role is not verified, use a bracketed editable placeholder instead of guessing.
- Thank the parent/guardian and team.
- State the purpose in one or two simple sentences ONLY when the meeting type is verified. If it is not verified, say: "We are here today to review [Student]'s information, talk through the IEP together, and make sure the team has a chance to share input." Do not label it annual/MET/reevaluation/eligibility/amendment.
- Invite introductions and parent input early.
- Keep the opening short enough to actually say in a meeting. No robotic language.

PAGE FLOW:
- Walk through the CURRENT IEP from page 1 through the final page in exact order. Produce ONE page_flow item for EVERY source page, including procedural/signature/blank pages.
- Never combine page ranges such as "pages 4-6." Say "Page 4", then "Page 5", then "Page 6" separately.
- For every page provide: page_number, section_name, say_this, ask_team, facilitator_note, and source.
- say_this must be a REAL facilitator script, not a one-sentence page caption. For substantive pages, use roughly 3-7 short spoken sentences: (1) orient the team to the page/section, (2) explain the important information in easy words, (3) state the key verified numbers/details, and (4) connect it to why the information matters for the student's IEP when the source supports that connection.
- Preserve all important facts, dates, assessment names/scores, goal skill/condition/criterion, services/minutes/frequency/location, accommodations, placement/LRE information, procedural information, and documented decisions. Never reduce a detailed page to only "this page reviews..." when the source contains useful specifics.
- Present levels must include the actual current-performance evidence available, not only test names and scores. Goals must explain what skill is being worked on and the measurable criterion. Services must state minutes/frequency and setting when documented. Accommodations should be grouped/explained in practical language rather than dumped as a comma list.
- When recent progress data is available in the verified student record but is newer than the source IEP, clearly label it as "current progress since this IEP" and use it at the most relevant goal/present-level page; never pretend it was printed on the old IEP page.
- Do not read boilerplate word-for-word when a short parent-friendly explanation preserves its meaning. For procedural/legal pages, explain what the page is for in plain language and identify any action/signature documented.
- If a page is blank or has no substantive content, say that briefly and move on; never fabricate content.
- At natural decision points, pause and ask the parent/team a short, useful question. Examples: "Does that match what you're seeing at home?" "Teacher, is this still accurate in class?" "Does anyone have anything to add before we move on?" Do not force a question onto every page, and never answer for the parent or team.
- If the source says a parent did not attend a PRIOR meeting, do not speak as if the current parent is absent. If the source records prior disagreement, say exactly that it was documented previously and invite the parent/team to clarify the concern today; do not claim it was resolved.
- Explain acronyms the first time in plain language (for example, LRE, SDI, ESY) without turning the meeting into a lecture.
- Clearly distinguish CURRENT DOCUMENTED information from PROPOSED/DRAFT changes. Never present a CaseCue draft as already agreed to by the team.
- Do not call a recommendation a team decision. Placement, services changes, ESY, eligibility changes, and other team decisions remain questions for the team unless the source IEP already documents the prior decision.

CLOSING:
- Because this script is generated BEFORE/DURING the meeting, do not claim today's team "addressed," "agreed," "decided," or "resolved" anything unless those decisions were actually captured during the current meeting. Recap what was reviewed, identify items that still need team discussion, and leave editable pauses for current-meeting decisions.
- Ask whether the parent/guardian or team has any final questions or concerns.
- End warmly and professionally.

SCRIPT: concatenate the opening, each page in order with clear "Page X" transitions, and closing into one read-aloud script.
- talking_points: 5-8 short bullets for quick reference during the meeting.
- important_changes: only changes supported by a comparison/source; otherwise say there is not enough verified prior/current evidence to identify changes.

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
    // Refuse to present a partial page walk-through as complete.
    const expectedPages = Array.isArray(pageSummarySource?.pages) ? pageSummarySource.pages.length : 0;
    const generatedPages = Array.isArray(data.page_flow) ? data.page_flow.length : 0;
    if (expectedPages && generatedPages !== expectedPages) {
      return Response.json({ error: `Meeting facilitator generated ${generatedPages} of ${expectedPages} pages. Please regenerate; CaseCue will not label a partial walkthrough complete.` }, { status: 422 });
    }
    await base44.asServiceRole.entities.MeetingFacilitatorRun.create({
      student_id: student.id,
      meeting_id: meetings?.[0]?.id || '',
      document_id: pageSummarySource?.document_id || '',
      generated_at: new Date().toISOString(),
      page_count: generatedPages,
      opening: data.opening || '',
      page_flow: data.page_flow || [],
      closing: data.closing || '',
      status: 'draft'
    });
    return Response.json(data);
  } catch (error) {
    console.error('generateMeetingScript failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}