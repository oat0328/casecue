import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";

// CaseCue BIP Analyzer / FBA Assistant — reads an uploaded BIP or FBA document
// and returns a structured analysis for the teacher to review.

const BIP_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    target_behaviors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          behavior: { type: 'string' },
          definition: { type: 'string' },
          baseline: { type: 'string' }
        }
      }
    },
    behavior_patterns: { type: 'array', items: { type: 'string' } },
    triggers: { type: 'array', items: { type: 'string' } },
    replacement_behaviors: { type: 'array', items: { type: 'string' } },
    interventions: { type: 'array', items: { type: 'string' } },
    reinforcement: { type: 'array', items: { type: 'string' } },
    strengths: { type: 'array', items: { type: 'string' } },
    recommended_updates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          area: { type: 'string' },
          recommendation: { type: 'string' }
        }
      }
    },
    missing_information: { type: 'array', items: { type: 'string' } }
  },
  required: ['summary', 'target_behaviors', 'recommended_updates']
};

const FBA_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    behavior_functions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          behavior: { type: 'string' },
          hypothesized_function: { type: 'string' },
          evidence: { type: 'string' }
        }
      }
    },
    triggers: { type: 'array', items: { type: 'string' } },
    environmental_factors: { type: 'array', items: { type: 'string' } },
    data_trends: { type: 'array', items: { type: 'string' } },
    suggested_interventions: { type: 'array', items: { type: 'string' } },
    team_summary: { type: 'string' },
    missing_information: { type: 'array', items: { type: 'string' } }
  },
  required: ['summary', 'team_summary']
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const documentId = body.document_id;
    const analysisType = body.analysis_type === 'fba' ? 'fba' : 'bip';
    if (!documentId) return Response.json({ error: 'A document is required.' }, { status: 400 });

    const docs = await base44.entities.Document.filter({ id: documentId }, '-created_date', 1);
    const doc = (docs || [])[0];
    if (!doc) return Response.json({ error: 'Document not found.' }, { status: 404 });

    const svc = base44.asServiceRole;
    let fileUrl = doc.file_url;
    if (doc.is_private) {
      const signed = await svc.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_url, expires_in: 600 });
      fileUrl = signed.signed_url;
    }

    const isFba = analysisType === 'fba';
    const toolName = isFba ? 'FBA Assistant' : 'BIP Analyzer';
    const analysisTask = isFba
      ? `Analyze this Functional Behavior Assessment. Identify: each target behavior with its hypothesized function and the evidence in the document supporting that function, triggers, environmental factors, data trends, and suggested interventions. Also provide team_summary: a concise summary the IEP team can use, and missing_information for anything the assessment does not state.`
      : `Analyze this Behavior Intervention Plan. Identify: target behaviors (with their definitions and baseline data if stated), behavior patterns, triggers and antecedents, replacement behaviors, current interventions, reinforcement systems, strengths of the plan, and recommended_updates to improve effectiveness (each with an area and a recommendation). Also list missing_information for anything the BIP does not state.`;

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are running the CaseCue ${toolName}. ${analysisTask}

STRICT RULES:
- Only reference content actually found in the attached document — never invent data, scores, or observations.
- When something is absent from the document, say so (e.g. "not stated in the document") rather than guessing.
- Do not make legal or compliance claims; frame suggestions as "review recommended".
- Keep each array item to one clear sentence or short statement.

Return JSON matching the schema.`;

    const result = await svc.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      model: 'automatic',
      response_json_schema: isFba ? FBA_SCHEMA : BIP_SCHEMA
    });

    const analysis = typeof result === 'object' ? result : JSON.parse(result);
    return Response.json({ analysis });
  } catch (error) {
    console.error('analyzeBehaviorDoc failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}