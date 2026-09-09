import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT, buildStudentContext, buildCaseloadContext } from "../../shared/casecueContext.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const question = (body.question || '').toString().trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const studentId = body.student_id || null;
    const mode = body.mode || 'caseload';

    if (!question) return Response.json({ error: 'A question is required.' }, { status: 400 });

    let contextBlock = "";
    if (mode === 'single' && studentId) {
      const student = await base44.entities.Student.get(studentId);
      const goals = await base44.entities.Goal.filter({ student_id: studentId });
      const progress = await base44.entities.ProgressData.filter({ student_id: studentId }, '-date', 20);
      contextBlock = buildStudentContext(student, goals, progress);
    } else {
      const students = await base44.entities.Student.list('-updated_date', 100);
      const goals = await base44.entities.Goal.list('-updated_date', 200);
      contextBlock = buildCaseloadContext(students, goals);
    }

    const messages = [
      { role: 'system', content: CASECUE_SYSTEM_PROMPT + "\n\nVERIFIED CONTEXT (use only this — never invent):\n" + contextBlock },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: question }
    ];

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n"),
      model: 'automatic'
    });

    const answer = typeof result === 'string' ? result : (result?.output || result?.text || JSON.stringify(result));
    return Response.json({ answer });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}