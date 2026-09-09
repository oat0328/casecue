import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT, buildStudentContext } from "../../shared/casecueContext.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const studentId = body.student_id;

    if (!studentId) return Response.json({ error: 'A student is required.' }, { status: 400 });

    const student = await base44.entities.Student.get(studentId);
    const goals = await base44.entities.Goal.filter({ student_id: studentId });
    const progress = await base44.entities.ProgressData.filter({ student_id: studentId }, '-date', 30);
    const contextBlock = buildStudentContext(student, goals, progress);

    const schema = {
      type: "object",
      properties: {
        score: { type: "number" },
        category_scores: {
          type: "object",
          properties: {
            present_levels: { type: "number" },
            goals: { type: "number" },
            data_alignment: { type: "number" },
            services_accommodations: { type: "number" },
            progress_monitoring: { type: "number" },
            document_consistency: { type: "number" }
          }
        },
        findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string" },
              level: { type: "string", enum: ["good", "review", "missing"] },
              title: { type: "string" },
              what_found: { type: "string" },
              why_flagged: { type: "string" },
              where_found: { type: "string" },
              suggested_action: { type: "string" }
            }
          }
        },
        summary: { type: "string" }
      }
    };

    const prompt = `${CASECUE_SYSTEM_PROMPT}\n\nYou are running a CaseCue IEP Review. Analyze the IEP represented by the verified context for POTENTIAL issues only. Do NOT declare compliance or legality.\n\nCheck these categories: Present Levels, Goals, Data Alignment, Services & Accommodations, Progress Monitoring, Document Consistency.\nUse 3 finding levels: "good" (Looks Good), "review" (Review Recommended), "missing" (Missing / Potential Conflict).\nFor each finding, provide: category, level, title, what_found, why_flagged, where_found, suggested_action.\nProduce a score out of 100 and a per-category score out of 100. Provide a short summary including how many items need attention.\n\nVERIFIED CONTEXT:\n${contextBlock}\n\nReturn JSON matching the schema.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic',
      response_json_schema: schema
    });

    const review = typeof result === 'object' ? result : JSON.parse(result);
    return Response.json({ review });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}