import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Page-by-page IEP summary: reads one uploaded document and summarizes EVERY page,
// including blank, signature, and procedural pages — labeled accurately.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.document_id) return Response.json({ error: 'Select a document to summarize.' }, { status: 400 });

    const document = await base44.entities.Document.get(body.document_id);
    if (!document) return Response.json({ error: 'Document not found.' }, { status: 404 });
    if (!document.file_url) return Response.json({ error: 'This document has no stored file.' }, { status: 400 });

    const schema = {
      type: 'object',
      properties: {
        pages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              page_number: { type: 'number' },
              page_type: { type: 'string', enum: ['content', 'blank', 'signature', 'procedural'], description: 'content = substantive IEP content' },
              section_name: { type: 'string' },
              summary: { type: 'string', description: 'Plain-language summary of this page' },
              important_facts: { type: 'array', items: { type: 'string' } },
              dates: { type: 'array', items: { type: 'string' } },
              scores_baselines: { type: 'array', items: { type: 'string' } },
              goals: { type: 'array', items: { type: 'string' } },
              accommodations: { type: 'array', items: { type: 'string' } },
              services_minutes: { type: 'array', items: { type: 'string' } },
              concerns: { type: 'array', items: { type: 'string' }, description: 'Potential concerns noticed on this page' },
              decisions_required: { type: 'array', items: { type: 'string' } },
              questions: { type: 'array', items: { type: 'string' }, description: 'Questions the teacher should ask about this page' }
            },
            required: ['page_number', 'page_type', 'section_name', 'summary']
          }
        }
      },
      required: ['pages']
    };

    const prompt = `You are summarizing an IEP document page by page for a special education teacher who needs to understand it quickly.

STRICT RULES:
- Cover EVERY page of the document in order, preserving the document's own page numbers. Do NOT skip repetitive, blank, signature, or procedural pages — label them accurately with page_type (content, blank, signature, procedural).
- Use ONLY what is on the page. NEVER invent facts, scores, or names.
- For each content page: plain-language summary, important facts, dates, scores and baselines, goals, accommodations, services and minutes found on that page. Include potential concerns (e.g. missing signatures, outdated dates, vague goals, unreadable sections) — report them as potential issues for educator review, never as compliance determinations.
- For blank, unreadable, or missing-content pages, say so plainly in the summary.
- Each page: list decisions still required and questions the teacher should ask.

Return JSON matching the schema.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [document.file_url],
      model: 'automatic',
      response_json_schema: schema
    });

    const parsed = typeof result === 'object' ? result : JSON.parse(result);
    const pages = (parsed.pages || []).sort((a, b) => (a.page_number || 0) - (b.page_number || 0));

    const page_summaries = {
      document_id: document.id,
      document_name: document.filename,
      pages,
      generated_at: new Date().toISOString(),
      disclaimer: 'Page summaries are system-assisted drafts for educator review — verify against the original document.',
    };

    if (body.workspace_id) {
      await base44.entities.IepWorkspace.update(body.workspace_id, { page_summaries });
    }

    return Response.json({ page_summaries });
  } catch (error) {
    console.error('iepPageSummaries failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}