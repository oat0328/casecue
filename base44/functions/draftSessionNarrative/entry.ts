import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";

// Session Tracker — drafts a professional qualitative narrative from information
// the teacher actually entered. Never invents behavior or performance.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { service_type, activity, status, quantitative, tags, notes } = body;
    if (!activity && !notes && !(tags || []).length) {
      return Response.json({ error: 'Enter the activity, tags, or a few notes first — CaseCue only drafts from what you actually entered.' }, { status: 400 });
    }

    const schema = {
      type: 'object',
      properties: {
        narrative: { type: 'string', description: 'One professional paragraph, 3-6 sentences' }
      },
      required: ['narrative']
    };

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are drafting a professional session narrative for a special education session log. The teacher has entered the information below. Rephrase it into one clear, professional paragraph (3-6 sentences) suitable for a session record.

ABSOLUTE RULES:
- Use ONLY the information the teacher entered. NEVER invent behavior, performance, responses, or anything not stated.
- If a category (engagement, behavior, prompting, etc.) has no entered information, simply omit it — do not fill it in.
- Keep the teacher's factual claims exactly as stated; do not strengthen or soften them.
- Do not add recommendations unless the teacher entered a next step.

TEACHER-ENTERED INFORMATION:
Service type: ${service_type || 'not specified'}
Activity/skill: ${activity || 'not specified'}
Session status: ${status || 'not specified'}
Quantitative data: ${quantitative ? JSON.stringify(quantitative) : 'none entered'}
Tags: ${(tags || []).join(', ') || 'none'}
Teacher notes: ${notes || 'none'}

Return JSON matching the schema.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'automatic',
      response_json_schema: schema
    });

    const parsed = typeof result === 'object' ? result : JSON.parse(result);
    return Response.json({ narrative: parsed.narrative, note: 'system-assisted draft — educator review required before saving.' });
  } catch (error) {
    console.error('draftSessionNarrative failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}