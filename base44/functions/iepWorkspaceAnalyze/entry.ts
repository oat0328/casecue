import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";

// New IEP Workspace — step 1: extract verified facts with citations from the
// student's uploaded documents, plus gaps and conflicts. Never invents facts.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.workspace_id) return Response.json({ error: 'A workspace is required.' }, { status: 400 });

    const workspace = await base44.entities.IepWorkspace.get(body.workspace_id);
    if (!workspace) return Response.json({ error: 'Workspace not found.' }, { status: 404 });

    const student = await base44.entities.Student.get(workspace.student_id);
    const documents = (await base44.entities.Document.filter({ student_id: workspace.student_id }, '-date_uploaded', 50))
      .filter((d) => d.extraction_status === 'processed');
    if (!documents || !documents.length) {
      return Response.json({ error: 'Upload at least one document (the current IEP or the latest evaluation report) before extraction.' }, { status: 400 });
    }

    const docIndex = documents.map((d, i) => {
      const pages = d.processing_results?.pages || [];
      const savedExtraction = JSON.stringify({ pages }).slice(0, 24000);
      return `DOCUMENT ${i + 1}: "${d.filename}" (${d.document_type})\nSAVED PAGE EXTRACTION:\n${savedExtraction}`;
    }).join('\n\n').slice(0, 120000);

    const schema = {
      type: 'object',
      properties: {
        facts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'e.g. eligibility, evaluation, academic, functional, services, accommodations, dates' },
              fact: { type: 'string' },
              source_document: { type: 'string', description: 'exact filename from the document list' },
              page: { type: 'string' },
              excerpt: { type: 'string', description: 'short supporting quote from the document' },
              confidence: { type: 'string', enum: ['high', 'medium', 'low'] }
            },
            required: ['fact', 'source_document', 'page', 'excerpt']
          }
        },
        gaps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              issue: { type: 'string' },
              detail: { type: 'string' },
              suggested_action: { type: 'string' }
            },
            required: ['issue']
          }
        },
        conflicts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              documents_involved: { type: 'string' },
              suggested_action: { type: 'string' }
            },
            required: ['description']
          }
        }
      },
      required: ['facts', 'gaps', 'conflicts']
    };

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are running the document extraction step of CaseCue's New IEP Workspace. A teacher is preparing a new IEP draft and has uploaded this student's documents.

STRICT EXTRACTION RULES:
- Extract ONLY facts stated in the attached documents. NEVER invent, infer, or guess.
- For EVERY fact, cite: source_document (exact filename from the list below), page (best-known page number, or "unpaginated"), and a short supporting excerpt quoted from the document.
- Anything an IEP needs that the documents do not cover goes under gaps — never invent it.
- If two documents disagree on something, list it under conflicts.
- Keep each fact concise and factual: dates, scores, service minutes, accommodations, statements, eligibility, evaluation findings.
- Read and extract ALL saved page content, including questions_and_answers, present_level_evidence, goal_evidence, and evaluation_findings.
- For MDT/evaluation reports, extract each measurable finding that can support present levels and aligned goals. Do not convert recommendations into team decisions.
- Explicitly extract unanswered document prompts as gaps instead of inventing an answer.

DOCUMENTS:
${docIndex}

STUDENT RECORD ON FILE (verified CaseCue data): ${student.first_name} ${student.last_name}${student.grade ? `, grade ${student.grade}` : ''}${student.eligibility_category ? `, eligibility: ${student.eligibility_category}` : ''}.

Return JSON matching the schema.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic',
      response_json_schema: schema
    });

    const analysis = typeof result === 'object' ? result : JSON.parse(result);
    analysis.facts = (analysis.facts || []).map((f) => ({ ...f, verified: false }));

    await base44.entities.IepWorkspace.update(body.workspace_id, { analysis, status: 'analysis' });
    await base44.entities.Document.bulkUpdate(
      documents.map((d) => ({ id: d.id, extraction_status: 'processed' }))
    );

    return Response.json({ analysis });
  } catch (error) {
    console.error('iepWorkspaceAnalyze failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}