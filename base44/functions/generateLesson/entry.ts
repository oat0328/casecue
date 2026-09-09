import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const studentIds = Array.isArray(body.student_ids) ? body.student_ids : (body.student_id ? [body.student_id] : []);
    const topic = (body.topic || '').toString().trim();
    const objective = (body.objective || '').toString().trim();

    let contextBlock = "No specific students selected. Create a general lesson.";
    if (studentIds.length) {
      const students = [];
      for (const sid of studentIds) {
        try { students.push(await base44.entities.Student.get(sid)); } catch {}
      }
      const goals = await base44.entities.Goal.list('-updated_date', 200);
      const relevantGoals = goals.filter((g) => studentIds.includes(g.student_id));
      const lines = ["TARGET STUDENTS & GOALS:"];
      students.forEach((s) => lines.push(`- ${s.first_name} ${s.last_name} (Grade ${s.grade || "?"}): ${s.accommodations || "no accommodations on file"}`));
      relevantGoals.forEach((g) => lines.push(`  Goal: ${g.goal_text} (Baseline: ${g.baseline || "—"})`));
      contextBlock = lines.join("\n");
    }

    const schema = {
      type: "object",
      properties: {
        title: { type: "string" },
        objective: { type: "string" },
        essential_question: { type: "string" },
        real_world_connection: { type: "string" },
        mini_lecture: { type: "string" },
        warm_up: { type: "string" },
        i_do: { type: "string" },
        we_do: { type: "string" },
        you_do: { type: "string" },
        accommodations: { type: "string" },
        data_collection: { type: "string" }
      }
    };

    const prompt = `${CASECUE_SYSTEM_PROMPT}\n\nCreate a complete lesson plan connected to the students' IEP goals. Use the template: Objective, Essential Question, Real-World Connection, Mini-Lecture, Warm-Up, I Do, We Do, You Do, Accommodations, Data Collection.\n${topic ? "Topic/subject: " + topic : ""}\n${objective ? "Objective hint: " + objective : ""}\n\nVERIFIED CONTEXT:\n${contextBlock}\n\nReturn JSON matching the schema. End the accommodations field with "Draft — Educator/IEP Team Review Required."`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt, model: 'automatic', response_json_schema: schema
    });
    const lesson = typeof result === 'object' ? result : JSON.parse(result);
    return Response.json({ lesson });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}