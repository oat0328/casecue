import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";

// CaseCue Auto-Fill Engine: reads every PROCESSED document on file for a
// student, extracts the structured IEP profile (eligibility, strengths, needs,
// present levels, accommodations, modifications, SDI, services, goals,
// progress, behavior), pre-fills the student record where fields are empty,
// creates draft goals when none exist, and saves the full extraction to the
// IEP workspace. Teacher review is always required — nothing is finalized.

const SCHEMA = {
  type: 'object',
  properties: {
    eligibility_category: { type: 'string' },
    strengths: { type: 'string' },
    areas_of_need: { type: 'string' },
    present_levels: { type: 'string' },
    accommodations: { type: 'string' },
    modifications: { type: 'string' },
    sdi: { type: 'string' },
    services: { type: 'array', items: { type: 'string' } },
    goals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          goal_area: { type: 'string' },
          goal_text: { type: 'string' },
          baseline: { type: 'string' },
          target: { type: 'string' },
          criterion: { type: 'string' },
          measurement_method: { type: 'string' }
        },
        required: ['goal_text']
      }
    },
    progress_information: { type: 'string' },
    behavior_information: { type: 'string' },
    data_gaps: { type: 'array', items: { type: 'string' } }
  },
  required: ['strengths', 'areas_of_need', 'present_levels', 'accommodations', 'services', 'goals', 'progress_information', 'behavior_information', 'data_gaps']
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body.student_id) return Response.json({ error: 'A student is required.' }, { status: 400 });

    const student = await base44.entities.Student.get(body.student_id);
    const docs = await base44.entities.Document.filter({ student_id: student.id });
    const processed = (docs || []).filter((d) => d.extraction_status === "processed" && d.processing_results);

    if (!processed.length) {
      return Response.json({ error: 'No processed documents yet. Upload and process documents first — analysis reads what has already been extracted.' }, { status: 400 });
    }

    // Build the document context from saved extraction results (bounded).
    const docContext = processed.map((d) => {
      const content = JSON.stringify(d.processing_results).slice(0, 8000);
      return `===== ${d.document_type}: ${d.filename} =====\n${content}`;
    }).join("\n\n").slice(0, 45000);

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are the CaseCue Auto-Fill Engine. Extract the student's IEP profile from the PROCESSED DOCUMENT CONTENT below.

STRICT EXTRACTION RULES:
- Use ONLY what is literally in the documents. Never invent, infer, or estimate facts.
- Quote or closely paraphrase the source wording.
- If a field has no information in any document, return an empty string (or empty array) and name the gap in data_gaps.
- services: list each service exactly as documented (e.g. "Speech — 30 min/week").
- goals: one entry per IEP goal found, with its documented baseline, target, criterion, and measurement method.
- progress_information: any progress data, scores, or growth statements found.
- behavior_information: any behavior, FBA, or BIP content found.

PROCESSED DOCUMENT CONTENT:
${docContext}

Return JSON matching the schema.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic',
      response_json_schema: SCHEMA
    });
    const extracted = typeof result === 'object' ? result : JSON.parse(result);

    // Pre-fill the student record — only where fields are empty, so teacher-
    // entered data is never overwritten.
    const filled = [];
    const kept = [];
    const patch = {};
    const textFields = [
      ['eligibility_category', 'Eligibility / disability category'],
      ['strengths', 'Strengths'],
      ['areas_of_need', 'Areas of need'],
      ['present_levels', 'Present levels'],
      ['accommodations', 'Accommodations'],
    ];
    textFields.forEach(([field, label]) => {
      const value = (extracted[field] || "").trim();
      if (!value) return;
      if (student[field] && String(student[field]).trim()) {
        kept.push(label);
      } else {
        patch[field] = value;
        filled.push(label);
      }
    });
    if (Array.isArray(extracted.services) && extracted.services.length && !(student.services && student.services.length)) {
      patch.services = extracted.services;
      filled.push("Services");
    } else if (student.services && student.services.length) {
      kept.push("Services");
    }

    if (Object.keys(patch).length) {
      await base44.entities.Student.update(student.id, patch);
    }

    // Draft goals — created only when the student has none on file.
    const existingGoals = await base44.entities.Goal.filter({ student_id: student.id });
    let goalsCreated = 0;
    if (!(existingGoals || []).length && Array.isArray(extracted.goals) && extracted.goals.length) {
      const goalRecords = extracted.goals
        .filter((g) => (g.goal_text || "").trim())
        .slice(0, 20)
        .map((g) => ({
          student_id: student.id,
          goal_area: g.goal_area || "",
          goal_text: g.goal_text,
          baseline: g.baseline || "",
          target: g.target || "",
          criterion: g.criterion || "",
          measurement_method: g.measurement_method || "",
          status: "active",
          notes: "Extracted from uploaded documents — educator review required."
        }));
      if (goalRecords.length) {
        await base44.entities.Goal.bulkCreate(goalRecords);
        goalsCreated = goalRecords.length;
      }
    }

    // Save the full extraction to the IEP workspace so the IEP Builder,
    // accommodations, amendments, and meeting tools can use it.
    const workspaces = await base44.entities.IepWorkspace.filter({ student_id: student.id }, '-created_date', 1);
    const workspace = workspaces && workspaces.length ? workspaces[0]
      : await base44.entities.IepWorkspace.create({ student_id: student.id, status: "documents" });
    await base44.entities.IepWorkspace.update(workspace.id, {
      analysis: {
        auto_extracted: extracted,
        extracted_at: new Date().toISOString(),
        source_documents: processed.map((d) => d.id),
      },
    });

    // Snapshot of what was found, for the Upload Center's summary view.
    const listCount = (v) =>
      Array.isArray(v) ? v.length
      : (typeof v === 'string' && v.trim()) ? v.trim().split(/\r?\n|;|\u2022/).filter(Boolean).length
      : 0;
    const snapshot = {
      eligibility: extracted.eligibility_category || '',
      strengths_found: listCount(extracted.strengths),
      needs_found: listCount(extracted.areas_of_need),
      goals_found: Array.isArray(extracted.goals) ? extracted.goals.length : 0,
      accommodations_found: listCount(extracted.accommodations),
      services_found: Array.isArray(extracted.services) ? extracted.services.length : 0,
      behavior_supports_found: !!extracted.behavior_information,
      missing: extracted.data_gaps || [],
    };

    return Response.json({
      filled,
      kept,
      goals_created: goalsCreated,
      data_gaps: extracted.data_gaps || [],
      snapshot,
      workspace_id: workspace.id,
    });
  } catch (error) {
    console.error('autoBuildProfile failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}