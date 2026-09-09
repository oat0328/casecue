import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT, buildStudentContext } from "../../shared/casecueContext.ts";

// CaseCue BIP & FBA analysis: behavior summary, trigger/antecedent analysis,
// function of behavior, replacement behaviors, supports, and BIP drafts —
// grounded ONLY in uploaded behavior documents and the verified student record.

const BEHAVIOR_TYPES = ["BIP", "FBA", "Behavior Log", "Discipline Report", "Other"];

const SCHEMA = {
  type: 'object',
  properties: {
    behavior_summary: { type: 'string' },
    trigger_analysis: { type: 'string' },
    antecedent_analysis: { type: 'string' },
    function_of_behavior: { type: 'string' },
    replacement_behaviors: { type: 'array', items: { type: 'string' } },
    suggested_supports: { type: 'array', items: { type: 'string' } },
    bip_draft: { type: 'string' },
    data_gaps: { type: 'array', items: { type: 'string' } }
  },
  required: ['behavior_summary', 'trigger_analysis', 'antecedent_analysis', 'function_of_behavior', 'replacement_behaviors', 'suggested_supports', 'bip_draft', 'data_gaps']
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.student_id) return Response.json({ error: 'A student is required.' }, { status: 400 });
    const mode = ["analysis", "bip_draft", "bip_revision"].includes(body.mode) ? body.mode : "analysis";

    const student = await base44.entities.Student.get(body.student_id);
    const goals = await base44.entities.Goal.filter({ student_id: student.id });
    const docs = await base44.entities.Document.filter({ student_id: student.id });
    const behaviorDocs = (docs || []).filter((d) => BEHAVIOR_TYPES.includes(d.document_type));

    let docContext = "No behavior documents (FBA / BIP / behavior logs / discipline reports) have been uploaded yet.";
    if (behaviorDocs.length) {
      docContext = behaviorDocs.map((d) => {
        const extracted = d.processing_results ? JSON.stringify(d.processing_results).slice(0, 6000) : "(not yet processed)";
        return `--- ${d.document_type}: ${d.filename} (status: ${d.extraction_status}) ---\n${extracted}`;
      }).join("\n\n");
    }

    const modeInstruction = mode === "analysis"
      ? "Produce the behavior analysis (summary, triggers, antecedents, function, replacement behaviors, supports). Set bip_draft to an empty string."
      : mode === "bip_draft"
      ? "Write a complete NEW BIP draft in bip_draft, grounded in the FBA and behavior data provided. Include target behaviors, prevention strategies, teaching of replacement behaviors, response strategies, and data collection."
      : "Write a BIP REVISION draft in bip_draft: keep what the data shows is working, adjust what is not, and state what changed and why.";

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are analyzing behavior documentation for a special education student.
Use ONLY the verified record and uploaded document content below — never invent incidents, data, or hypotheses. If FBA/BIP content is missing, say so in data_gaps and base the analysis on what exists.

MODE: ${modeInstruction}

TEACHER CONTEXT / NOTES:
${(body.notes || "none provided").slice(0, 2000)}

VERIFIED STUDENT RECORD:
${buildStudentContext(student, goals, [])}

BEHAVIOR DOCUMENTS:
${docContext}

Return JSON matching the schema.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic',
      response_json_schema: SCHEMA
    });

    const analysis = typeof result === 'object' ? result : JSON.parse(result);
    return Response.json({ analysis });
  } catch (error) {
    console.error('behaviorAnalysis failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}