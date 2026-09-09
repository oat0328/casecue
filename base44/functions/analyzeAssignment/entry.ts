import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";
import { ASSIGNMENT_ANALYSIS_SCHEMA } from "../../shared/lessonPlanFormat.ts";

// Analyzes a teacher-uploaded assignment (file, pasted text, or webpage/video URL)
// and returns a structured, citable analysis the teacher can correct before
// lesson generation. Never invents content the source does not contain.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const fileUrl = typeof body.file_url === 'string' ? body.file_url.trim() : '';
    const pastedText = typeof body.pasted_text === 'string' ? body.pasted_text.slice(0, 20000) : '';
    const pageUrl = typeof body.page_url === 'string' ? body.page_url.trim() : '';
    const gradeHint = typeof body.grade_hint === 'string' ? body.grade_hint.slice(0, 50) : '';
    const subjectHint = typeof body.subject_hint === 'string' ? body.subject_hint.slice(0, 50) : '';

    if (!fileUrl && !pastedText && !pageUrl) {
      return Response.json({ error: 'Provide an uploaded file, pasted text, or a webpage/YouTube URL.' }, { status: 400 });
    }
    if (pageUrl && !/^https?:\/\//i.test(pageUrl)) {
      return Response.json({ error: 'The link must start with http:// or https://' }, { status: 400 });
    }

    const sourceParts = [];
    if (pastedText) sourceParts.push('PASTED ASSIGNMENT TEXT:\n' + pastedText);
    if (pageUrl) sourceParts.push('READ THIS LINK (if it is a YouTube video, use its title, description and transcript): ' + pageUrl);
    if (fileUrl) sourceParts.push('The complete assignment file is attached. Read EVERY page — including scanned pages and images (use OCR) — and cite page numbers in the analysis.');

    const prompt = `${CASECUE_SYSTEM_PROMPT}

A special education teacher uploaded a classroom assignment. Analyze it so the teacher can build an IEP-aligned lesson plan from it.

STRICT RULES:
- Base every field ONLY on what the source actually contains. If something cannot be determined, write "Not detected" — never guess.
- For scanned or multi-page files, work page by page: the page_summary must have one entry per page.
- In citations, give the source for each key finding (e.g. "Page 2", "Pasted text", "Linked page").
- Suggested accommodations are IDEAS for the IEP team to review — never present them as required or IEP-mandated.

Return JSON matching the schema exactly.

GRADE LEVEL HINT: ${gradeHint || 'none provided — infer from the source or write "Not detected"'}
SUBJECT HINT: ${subjectHint || 'none provided — infer from the source or write "Not detected"'}

ASSIGNMENT SOURCE:
${sourceParts.join('\n\n')}`;

    const useInternet = !!pageUrl;
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: useInternet ? 'gemini_3_flash' : 'automatic',
      add_context_from_internet: useInternet,
      file_urls: fileUrl ? [fileUrl] : undefined,
      response_json_schema: ASSIGNMENT_ANALYSIS_SCHEMA
    });
    const analysis = typeof result === 'object' ? result : JSON.parse(result);
    return Response.json({ analysis });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}