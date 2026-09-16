import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";

// CaseCue Auto-Fill Engine: reads every PROCESSED document on file for a
// student, extracts the structured IEP profile (eligibility, strengths, needs,
// present levels, accommodations, modifications, SDI, services, goals,
// progress, behavior), pre-fills the student record where fields are empty,
// creates draft goals when none exist, and saves the full extraction to the
// IEP workspace. Teacher review is always required — nothing is finalized.

// Confidence metadata shape reused for every extracted field.
const CONF_META = {
  type: 'object',
  properties: {
    level: { type: 'string', enum: ['high', 'medium', 'low', 'missing'] },
    flags: { type: 'array', items: { type: 'string', enum: ['missing', 'conflicting', 'incomplete', 'unverified'] } },
    sources: { type: 'array', items: { type: 'string' } }
  }
};

const SCHEMA = {
  type: 'object',
  properties: {
    student_first_name: { type: 'string' },
    student_last_name: { type: 'string' },
    student_grade: { type: 'string' },
    eligibility_category: { type: 'string' },
    eligibility_categories: { type: 'array', items: { type: 'string' }, maxItems: 50 },
    iep_date: { type: 'string' },
    annual_review_due: { type: 'string' },
    reevaluation_due: { type: 'string' },
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
    parent_concerns: { type: 'string' },
    data_gaps: { type: 'array', items: { type: 'string' } },
    confidence: {
      type: 'object',
      properties: {
        eligibility_category: CONF_META,
        strengths: CONF_META,
        areas_of_need: CONF_META,
        present_levels: CONF_META,
        accommodations: CONF_META,
        sdi: CONF_META,
        services: CONF_META,
        goals: CONF_META,
        progress_information: CONF_META,
        behavior_information: CONF_META,
        parent_concerns: CONF_META
      }
    }
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

    // Build document context from the complete saved page extraction. Preserve a
    // generous per-document window so long MDT/IEP reports do not silently lose
    // later pages before profile/draft generation.
    const docContext = processed.map((d) => {
      const content = JSON.stringify(d.processing_results).slice(0, 24000);
      return `===== ${d.document_type}: ${d.filename} =====\n${content}`;
    }).join("\n\n").slice(0, 120000);

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are the CaseCue Auto-Fill Engine. Extract the student's IEP profile from the PROCESSED DOCUMENT CONTENT below.

STRICT EXTRACTION RULES:
- Use ONLY what is literally in the documents. Never invent, infer, or estimate facts.
- Quote or closely paraphrase the source wording.
- This is NOT IEP-only. Source documents may be an IEP, MDT/MET 1/MET 2, evaluation, reevaluation, eligibility report, psychological report, 504, BIP/FBA, progress report, assessment, service-provider report, medical report, transition assessment, or another student record.
- student_first_name, student_last_name, student_grade: extract only when explicitly documented in the uploaded records. These fields allow non-IEP records such as MDT/MET/evaluation documents to help build the student profile.
- eligibility_category: return the primary explicitly documented IDEA disability/eligibility category when one is clearly identified.
- eligibility_categories: return every explicitly documented disability/eligibility category found across the source records, de-duplicated. Preserve every explicitly documented eligibility/disability category; do not impose an arbitrary five- or ten-category cap. Include categories such as Other Health Impairment only when the source actually identifies the student with that category; do not infer a disability from a diagnosis, symptom, medication, recommendation, or suspected condition.
- Search the ENTIRE source set for eligibility/disability information, especially eligibility/disability, student information, special education eligibility, evaluation/MDT/MET summary, and services pages. Accept an explicitly documented IDEA disability category even when the page does not use the exact label "Eligibility Category". Do not call eligibility missing merely because the exact phrase "eligibility category" is absent.
- If a field has no information in any document, return an empty string (or empty array) and name the gap in data_gaps.
- services: list each service exactly as documented (e.g. "Speech — 30 min/week").
- goals: one entry per ANNUAL IEP GOAL found, with its documented baseline, target, criterion, and measurement method. Do NOT create separate goals from benchmarks, objectives, progress-report rows, criteria, or repeated continuation pages. Benchmarks/objectives belong inside the parent annual goal context. If the source has 4 annual goals with multiple benchmarks, return 4 goals, not the benchmarks as additional goals.
- iep_date, annual_review_due, reevaluation_due: return ISO YYYY-MM-DD only when explicitly documented. Keep empty when not documented.
- progress_information: any progress data, scores, or growth statements found.
- behavior_information: any behavior, FBA, or BIP content found.
- parent_concerns: any parent concerns or parent input documented.
- For MDT, evaluation, reevaluation, psychological, eligibility, and assessment reports: use documented test results, observations, educational impact, strengths, needs, and measurable findings to build a DRAFT present level. Do not merely say the report exists.
- When evaluation evidence documents a measurable skill deficit and baseline, include enough detail in present_levels and areas_of_need for the IEP Builder to draft aligned measurable goals later.
- Never turn an evaluation recommendation into a final team decision. Recommendations remain source information for educator/team review.
- Review all saved questions_and_answers from every page. Preserve explicit answers and identify unanswered prompts in data_gaps rather than guessing.

CONFIDENCE RULES (confidence object — one entry per field in the confidence schema):
- level: "high" ONLY when the information is explicitly and clearly stated in a source document; "medium" when stated once with ambiguous wording or scattered across documents; "low" when pieced together from indirect references; "missing" when not found.
- flags: "conflicting" if documents give different values; "incomplete" if only partial information exists; "unverified" if the wording cannot be quoted from the source.
- sources: list each supporting document as "document_type - filename" exactly as labeled in the content below.
- Never mark a field "high" unless it is literally stated in the documents.

PROCESSED DOCUMENT CONTENT:
${docContext}

Return JSON matching the schema.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic',
      response_json_schema: SCHEMA
    });
    const extracted = typeof result === 'object' ? result : JSON.parse(result);

    // Deterministic recovery from the saved page extraction. This protects against
    // an LLM summary pass accidentally calling information "missing" when the page
    // reader already found it. We only reuse literal facts already stored in the
    // processed document; we never infer or calculate new IEP facts here.
    const pageFacts = processed.flatMap((d) => (d.processing_results?.pages || []).flatMap((p) =>
      (p.important_facts || []).map((fact) => ({
        fact: String(fact || '').trim(),
        page: p.page_number,
        section: String(p.section_name || ''),
        document_type: d.document_type,
        filename: d.filename,
      }))
    )).filter((x) => x.fact);
    // Recover an explicitly documented disability/eligibility category from any
    // IEP page if the summary model missed it. We only accept recognized IDEA
    // category wording that appears literally in a saved page fact.
    const eligibilityPatterns = [
      ['Specific Learning Disability', /\b(?:specific learning disability|learning disability|\bSLD\b)\b/i],
      ['Autism', /\bautism(?: spectrum disorder)?\b/i],
      ['Intellectual Disability', /\bintellectual disabilit(?:y|ies)\b/i],
      ['Emotional Disturbance', /\bemotional disturbance\b/i],
      ['Other Health Impairment', /\bother health impairment|\bOHI\b/i],
      ['Speech or Language Impairment', /\bspeech (?:or|and) language impairment|\bspeech\/language impairment\b/i],
      ['Visual Impairment', /\bvisual impairment\b/i],
      ['Hearing Impairment', /\bhearing impairment\b/i],
      ['Deafness', /\bdeafness\b/i],
      ['Deaf-Blindness', /\bdeaf[- ]blindness\b/i],
      ['Orthopedic Impairment', /\borthopedic impairment\b/i],
      ['Multiple Disabilities', /\bmultiple disabilities\b/i],
      ['Traumatic Brain Injury', /\btraumatic brain injury|\bTBI\b/i],
      ['Developmental Delay', /\bdevelopmental delay\b/i],
    ];
    const likelyEligibilityFacts = pageFacts.filter((x) => /eligib|disabil|exceptional|special education/i.test(`${x.section} ${x.fact}`));
    const recoveredCategories = eligibilityPatterns
      .filter(([, pattern]) => likelyEligibilityFacts.some((x) => pattern.test(x.fact)))
      .map(([label]) => label);
    extracted.eligibility_categories = [...new Set([...(extracted.eligibility_categories || []), ...recoveredCategories])].filter(Boolean).slice(0, 50);
    if (!(extracted.eligibility_category || '').trim() && extracted.eligibility_categories.length) {
      extracted.eligibility_category = extracted.eligibility_categories[0];
      const [label, pattern] = eligibilityPatterns.find(([candidate]) => candidate === extracted.eligibility_category) || [];
      const hit = pattern ? likelyEligibilityFacts.find((x) => pattern.test(x.fact)) : null;
      extracted.confidence = extracted.confidence || {};
      if (hit) extracted.confidence.eligibility_category = { level: 'high', flags: [], sources: [`${hit.document_type} - ${hit.filename}, p.${hit.page}`] };
    }
    const serviceFacts = pageFacts.filter((x) =>
      /service/i.test(x.section) && /(?:service|minutes?\s*\/\s*(?:week|month)|minutes? per (?:week|month)|specialized instruction)/i.test(x.fact)
    );
    if ((!Array.isArray(extracted.services) || extracted.services.length === 0) && serviceFacts.length) {
      extracted.services = [...new Set(serviceFacts
        .filter((x) => !/^total specialized instruction/i.test(x.fact))
        .map((x) => `${x.fact} (${x.document_type} p.${x.page})`))];
      extracted.confidence = extracted.confidence || {};
      extracted.confidence.services = {
        level: 'high', flags: [],
        sources: [...new Set(serviceFacts.map((x) => `${x.document_type} - ${x.filename}, p.${x.page}`))]
      };
    }
    const accommodationFacts = pageFacts.filter((x) =>
      /supplementary|accommodation/i.test(x.section) && /accommodation|small group|break|overlay|chunk|organizer|chart/i.test(x.fact)
    );
    if (!(extracted.accommodations || '').trim() && accommodationFacts.length) {
      extracted.accommodations = accommodationFacts.map((x) => `${x.fact} (${x.document_type} p.${x.page})`).join('; ');
    }
    if (Array.isArray(extracted.data_gaps) && serviceFacts.length) {
      extracted.data_gaps = [...new Set(extracted.data_gaps.filter((gap) => {
        const text = String(gap || '');
        // Do not label service frequency/duration/minutes as missing when the
        // page-level extraction already found explicit service-minute facts.
        return !/(service.*(?:minute|frequency|duration)|(?:minute|frequency|duration).*service)/i.test(text);
      }).filter(Boolean))];
    }

    // A document may omit something that is already present in the student's
    // verified profile or in another structured record. Do not tell the educator
    // the STUDENT is missing that information merely because this extraction pass
    // did not repeat it. Keep document gaps separate from profile gaps.
    const profileHas = (field) => student[field] != null && String(student[field]).trim() !== '';
    const extractedGoals = Array.isArray(extracted.goals) ? extracted.goals : [];
    const effectiveHas = {
      eligibility_category: profileHas('eligibility_category') || !!String(extracted.eligibility_category || '').trim(),
      annual_review_due: profileHas('annual_review_due') || !!String(extracted.annual_review_due || '').trim(),
      reevaluation_due: profileHas('reevaluation_due') || !!String(extracted.reevaluation_due || '').trim(),
      iep_date: profileHas('iep_date') || !!String(extracted.iep_date || '').trim(),
      goals: extractedGoals.length > 0,
    };
    const documentGaps = Array.isArray(extracted.data_gaps) ? [...new Set(extracted.data_gaps.filter(Boolean))] : [];
    const profileGaps = documentGaps.filter((gap) => {
      const text = String(gap || '').toLowerCase();
      if (effectiveHas.eligibility_category && /eligib|disabilit(?:y|ies).*categor|categor.*disabilit/i.test(text)) return false;
      if (effectiveHas.annual_review_due && /annual.*(?:review|iep).*(?:due|date)|(?:due|date).*annual.*(?:review|iep)/i.test(text)) return false;
      if (effectiveHas.reevaluation_due && /re-?evaluation|reevaluation/i.test(text) && /due|date/i.test(text)) return false;
      if (effectiveHas.iep_date && /iep.*date|date.*iep/i.test(text)) return false;
      return true;
    });

    // Date fields are source-controlled by the uploaded CURRENT IEP/evaluation record.
    // Unlike narrative fields, verified dates should replace stale Student 360 dates when
    // a newer authoritative uploaded record explicitly documents them.
    const currentIepDocs = processed.filter((d) => d.document_type === 'IEP' && ['current','final'].includes(d.iep_role));
    const evaluationDocs = processed.filter((d) => ['Evaluation','Reevaluation','Eligibility Report','MDT Report','Psychological Report'].includes(d.document_type));
    const dateSourceDocs = [...currentIepDocs, ...evaluationDocs];
    const hasDateSource = dateSourceDocs.length > 0;

    // Pre-fill narrative student fields only where empty; dates below use verified source replacement.
    const filled = [];
    const kept = [];
    const patch = {};
    const textFields = [
      ['first_name', 'First name', 'student_first_name'],
      ['last_name', 'Last name', 'student_last_name'],
      ['grade', 'Grade', 'student_grade'],
      ['eligibility_category', 'Primary eligibility / disability category', 'eligibility_category'],
      ['strengths', 'Strengths'],
      ['areas_of_need', 'Areas of need'],
      ['present_levels', 'Present levels'],
      ['accommodations', 'Accommodations'],
    ];
    textFields.forEach(([field, label, sourceField = field]) => {
      const value = (extracted[sourceField] || "").trim();
      if (!value) return;
      if (student[field] && String(student[field]).trim()) {
        kept.push(label);
      } else {
        patch[field] = value;
        filled.push(label);
      }
    });
    if (Array.isArray(extracted.eligibility_categories) && extracted.eligibility_categories.length) {
      const existing = Array.isArray(student.eligibility_categories) ? student.eligibility_categories : [];
      const merged = [...new Set([...existing, ...extracted.eligibility_categories])].filter(Boolean).slice(0, 50);
      if (JSON.stringify(existing) !== JSON.stringify(merged)) {
        patch.eligibility_categories = merged;
        filled.push('Eligibility / disability categories');
      }
    }
    const isoDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '').trim()) ? String(v).trim() : '';
    const verifiedDates = [
      ['iep_date', 'IEP date'],
      ['annual_review_due', 'Annual review due'],
      ['reevaluation_due', 'Reevaluation due'],
    ];
    if (hasDateSource) {
      for (const [field, label] of verifiedDates) {
        const value = isoDate(extracted[field]);
        if (!value) continue;
        if (String(student[field] || '') !== value) {
          patch[field] = value;
          filled.push(label);
        } else {
          kept.push(label);
        }
      }
    }
    if (Array.isArray(extracted.services) && extracted.services.length && !(student.services && student.services.length)) {
      patch.services = extracted.services;
      filled.push("Services");
    } else if (student.services && student.services.length) {
      kept.push("Services");
    }

    if (Object.keys(patch).length) {
      await base44.entities.Student.update(student.id, patch);
    }

    // IMPORTANT: document analysis must never mutate the student's active Goal ledger.
    // Uploaded IEPs may be historical, and evaluation/MDT recommendations are not adopted
    // annual goals. Keep extracted annual goals in the workspace as source evidence/draft
    // material; the educator explicitly adopts/edits goals in the IEP Builder.
    const existingGoals = await base44.entities.Goal.filter({ student_id: student.id });
    const goalsCreated = 0;

    // Save the full extraction to the IEP workspace so the IEP Builder,
    // accommodations, amendments, and meeting tools can use it.
    const workspaces = await base44.entities.IepWorkspace.filter({ student_id: student.id }, '-created_date', 1);
    const workspace = workspaces && workspaces.length ? workspaces[0]
      : await base44.entities.IepWorkspace.create({ student_id: student.id, status: "documents" });
    await base44.entities.IepWorkspace.update(workspace.id, {
      analysis: {
        auto_extracted: extracted,
        confidence: extracted.confidence || {},
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
      eligibility_categories: extracted.eligibility_categories || [],
      strengths_found: listCount(extracted.strengths),
      needs_found: listCount(extracted.areas_of_need),
      // This is the number of annual-goal candidates found in the uploaded source documents.
      // They are NOT silently written to the active Goal ledger.
      goals_found: Array.isArray(extracted.goals) ? extracted.goals.length : 0,
      accommodations_found: listCount(extracted.accommodations),
      services_found: Array.isArray(extracted.services) ? extracted.services.length : 0,
      behavior_supports_found: !!extracted.behavior_information,
      parent_concerns_found: !!extracted.parent_concerns,
      progress_information_found: !!String(extracted.progress_information || '').trim(),
      // `missing` means missing from the effective student profile, not merely
      // absent from one uploaded document. `document_gaps` preserves the latter.
      missing: profileGaps,
      document_gaps: documentGaps,
    };

    return Response.json({
      filled,
      confidence: extracted.confidence || {},
      kept,
      goals_created: goalsCreated,
      data_gaps: profileGaps,
      document_gaps: documentGaps,
      snapshot,
      workspace_id: workspace.id,
    });
  } catch (error) {
    console.error('autoBuildProfile failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}