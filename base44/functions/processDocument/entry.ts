import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// OCR document processing — reads an uploaded student document page by page and
// saves the extraction results to the Document record.
// Status lifecycle: queued -> processing -> ocr_processing -> processed | failed.
// Guards against duplicate processing (in-flight check) and records the error
// reason so the teacher sees exactly why a file failed and can retry.

const PAGE_SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    pages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          page_number: { type: 'number' },
          section_name: { type: 'string' },
          summary: { type: 'string' },
          important_facts: { type: 'array', items: { type: 'string' } },
          measurable_statements: { type: 'array', items: { type: 'string' } },
          action_items: { type: 'array', items: { type: 'string' } },
          questions_and_answers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                answer: { type: 'string' },
                evidence: { type: 'string' }
              },
              required: ['question', 'answer']
            }
          },
          present_level_evidence: { type: 'array', items: { type: 'string' } },
          goal_evidence: { type: 'array', items: { type: 'string' } },
          evaluation_findings: { type: 'array', items: { type: 'string' } }
        },
        required: ['page_number', 'summary']
      }
    }
  },
  required: ['pages']
};

export default async function(req) {
  let docId = null;
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    docId = body.document_id;
    if (!docId) return Response.json({ error: 'Missing document_id' }, { status: 400 });

    // RLS-scoped read: only this organization's documents are visible.
    const docs = await base44.entities.Document.filter({ id: docId }, '-created_date', 1);
    const doc = (docs || [])[0];
    if (!doc) return Response.json({ error: 'Document not found.' }, { status: 404 });

    const svc = base44.asServiceRole;

    // Duplicate-processing prevention: if already in flight, don't start again.
    if (doc.extraction_status === 'processing' || doc.extraction_status === 'ocr_processing') {
      return Response.json({ error: 'This document is already processing.' }, { status: 409 });
    }

    const now = new Date().toISOString();
    await base44.entities.Document.update(docId, {
      extraction_status: 'processing',
      error_reason: null,
      last_attempted: now,
    });

    // Resolve a readable URL (private files need a short-lived signed URL).
    let fileUrl = doc.file_url;
    if (doc.is_private) {
      const signed = await svc.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_url, expires_in: 600 });
      fileUrl = signed.signed_url;
    }

    await base44.entities.Document.update(docId, { extraction_status: 'ocr_processing' });

    const result = await svc.integrations.Core.InvokeLLM({
      prompt: `You are a careful special-education document reader. Read every page of this document and summarize it page by page.

For each page:
- page_number: the page number in the document
- section_name: the section this page belongs to (e.g. "Present Levels", "Goals", "Services")
- summary: 1-2 sentences describing what the page contains
- important_facts: specific, verifiable statements found on the page (dates, scores, names of services, minutes, accommodations). Never invent anything not written.
- measurable_statements: any measurable or quantified statements quoted or closely paraphrased
- action_items: any action items, responsibilities, or follow-ups mentioned
- questions_and_answers: capture EVERY explicit form question, prompt, checkbox question, or labeled field on the page and its documented answer/value. If the page asks a question but no answer is provided, use "Not answered in document". Do not skip questions just because they seem procedural.
- present_level_evidence: scores, observations, classroom performance, assessment findings, strengths, needs, disability impact, grade-level comparisons, and other facts that could support a present-level draft
- goal_evidence: measurable baselines, skill deficits, prior-goal progress, frequency/accuracy/duration data, and assessment findings that could support a measurable goal
- evaluation_findings: MDT/evaluation/reevaluation findings, tests, standard scores, percentiles, observations, eligibility evidence, recommendations, and educational impact statements

COMPLETENESS RULE: read the ENTIRE document, including tables, checkboxes, form prompts, headers, footers, signature/procedural pages, and attachments. The saved page extraction must preserve enough information for CaseCue to answer the document's questions later without reopening or guessing.

If a page is unreadable or the file is not a document, say so in that page's summary instead of guessing.`,
      file_urls: [fileUrl],
      response_json_schema: PAGE_SUMMARY_SCHEMA,
    });

    const pages = result?.pages || [];
    await base44.entities.Document.update(docId, {
      extraction_status: 'processed',
      processing_results: { pages },
      last_attempted: now,
    });

    // Persist the document's explicit questions/answers so IEP Studio can surface
    // and reuse them independently of the page-summary UI.
    const qaRows = pages.flatMap((p) => (p.questions_and_answers || []).map((qa) => ({
      student_id: doc.student_id,
      document_id: docId,
      page_number: p.page_number,
      question: qa.question,
      answer: qa.answer,
      evidence: qa.evidence || '',
      status: /not answered in document/i.test(String(qa.answer || '')) ? 'not_answered' : 'documented',
    }))).filter((qa) => qa.question && qa.answer);
    if (qaRows.length) await svc.entities.IepDocumentAnswer.bulkCreate(qaRows);
    await svc.entities.IepQuestionCoverage.create({
      student_id: doc.student_id,
      document_id: docId,
      total_questions: qaRows.length,
      answered_questions: qaRows.filter((qa) => qa.status === 'documented').length,
      unanswered_questions: qaRows.filter((qa) => qa.status === 'not_answered').length,
      generated_at: now,
    });

    const evidenceRows = pages.flatMap((p) => [
      ...(p.present_level_evidence || []).map((text) => ({ evidence_type: 'present_level', text })),
      ...(p.goal_evidence || []).map((text) => ({ evidence_type: 'goal', text })),
      ...(p.evaluation_findings || []).map((text) => ({ evidence_type: 'evaluation', text })),
    ].map((item) => ({
      student_id: doc.student_id,
      document_id: docId,
      page_number: p.page_number,
      evidence_type: item.evidence_type,
      text: item.text,
      source_label: `${doc.document_type} - ${doc.filename}, p.${p.page_number}`,
    }))).filter((row) => row.text);
    if (evidenceRows.length) await svc.entities.IepSourceEvidence.bulkCreate(evidenceRows);
    await svc.entities.IepStudioProcessingVersion.create({
      student_id: doc.student_id,
      document_id: docId,
      version: 'full-document-v2',
      processed_at: now,
      notes: `Captured ${pages.length} pages, ${qaRows.length} question/answer items, and ${evidenceRows.length} evidence items.`,
    });

    await svc.entities.AuditLog.create({
      action: 'document_processed',
      entity_type: 'Document',
      entity_id: docId,
      details: `Document "${doc.filename}" processed (${pages.length} pages) by ${user.email}`,
    });

    return Response.json({ ok: true, pages });
  } catch (error) {
    console.error('processDocument failed:', error);
    try {
      const base44 = createClientFromRequest(req);
      if (docId) {
        await base44.entities.Document.update(docId, {
          extraction_status: 'failed',
          error_reason: String(error.message || error).slice(0, 300),
          last_attempted: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error('processDocument: could not mark document as failed', e);
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
}