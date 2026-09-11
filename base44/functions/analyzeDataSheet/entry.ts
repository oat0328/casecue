import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";

const SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    detected_date: { type: 'string' },
    rows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          goal_area: { type: 'string' },
          correct: { type: ['number','null'] },
          total: { type: ['number','null'] },
          percentage: { type: ['number','null'] },
          prompting_level: { type: 'string' },
          qualitative_notes: { type: 'string' },
          source: { type: 'string' }
        },
        required: ['date','goal_area','prompting_level','qualitative_notes','source']
      }
    },
    warnings: { type: 'array', items: { type: 'string' } }
  },
  required: ['summary','rows','warnings']
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const studentId = String(body.student_id || '').trim();
    const fileUrl = String(body.file_url || '').trim();
    if (!studentId || !fileUrl) return Response.json({ error: 'Student and uploaded data sheet are required.' }, { status: 400 });
    const student = await base44.entities.Student.get(studentId);
    if (!student) return Response.json({ error: 'Student not found.' }, { status: 404 });
    const goals = await base44.entities.Goal.filter({ student_id: studentId }, '-updated_date', 100);
    const goalContext = (goals || []).map(g => `- ${g.goal_area || 'Goal'}: ${g.goal_text || ''} | measurement: ${g.measurement_method || 'not on file'}`).join('\n');

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are running CaseCue Data Sheet Scan for one teacher-selected student. Read the attached progress-monitoring/data sheet page by page.

STRICT RULES:
- Extract only values that are visibly present. Never infer a score that is not on the sheet.
- Do not return student names, IDs, addresses, parent information, or any unrelated PII.
- If multiple students appear, extract only rows that can be confidently associated with the selected student's data; otherwise add a warning and omit the ambiguous row.
- Dates must be YYYY-MM-DD when the source supports the date. If no date is visible, use an empty string and add a warning.
- Percentage is 0-100. If correct and total are visible, you may calculate percentage exactly. Do not estimate from a graph or handwriting when unreadable.
- prompting_level must be one of: independent, verbal, visual, physical, full. If not shown, use independent only when the source explicitly indicates independence; otherwise leave qualitative_notes explaining that prompt level was not detected and use verbal only if a verbal prompt is visibly stated. If no prompt information exists, use independent as a neutral system default but add a warning.
- goal_area should match one of the verified goals below when the sheet clearly maps to it; otherwise use the source skill label exactly.
- source must identify the page/section, such as "Page 1, row 4".
- CaseCue is preparing a review draft only. The educator must approve every row before it is saved.

VERIFIED GOALS FOR THE SELECTED STUDENT:
${goalContext || '- No goals on file.'}

Return JSON matching the schema exactly.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic',
      file_urls: [fileUrl],
      response_json_schema: SCHEMA
    });
    const analysis = typeof result === 'object' ? result : JSON.parse(result);
    return Response.json({ analysis });
  } catch (error) {
    console.error('analyzeDataSheet failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
