import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const planType = body.plan_type || 'daily';
    const date = body.date || '';

    const students = await base44.entities.Student.list('-updated_date', 100);
    const lessons = await base44.entities.Lesson.list('-date', 10);
    const meetings = await base44.entities.Meeting.filter({ status: 'scheduled' }, 'date', 10);

    const lines = ["CASeload & SCHEDULE INFO:"];
    students.forEach((s) => {
      lines.push(`- ${s.first_name} ${s.last_name} (Grade ${s.grade || "?"}): Services: ${(s.services || []).join(", ") || "—"} | Minutes: ${s.service_minutes || "—"} | Accommodations: ${s.accommodations || "—"}`);
    });
    if (lessons.length) lines.push("RECENT LESSONS: " + lessons.map((l) => l.title).join(", "));
    lines.push("Plan type: " + planType + (date ? " | Date: " + date : ""));

    const prompt = `${CASECUE_SYSTEM_PROMPT}\n\nGenerate a substitute teacher plan using ONLY the verified caseload and schedule info below. Include: overview, student groups with supports/accommodations, lesson directions, progress monitoring instructions, and para/staff notes (if available). Keep it clear and practical for a substitute who does not know the students.\n\n${lines.join("\n")}\n\nReturn the plan as structured markdown text. End with "Draft — Educator Review Required."`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, model: 'automatic' });
    const content = typeof result === 'string' ? result : (result?.output || result?.text || JSON.stringify(result));
    return Response.json({ content });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}