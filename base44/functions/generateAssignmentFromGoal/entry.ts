import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { CASECUE_SYSTEM_PROMPT } from "../../shared/casecueContext.ts";

// Generate Work From Student Goal: creates a complete, printable practice
// assignment (activity/passage, practice items with answer key, and a
// progress-monitoring probe) aligned to one verified IEP goal.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const goalId = String(body.goal_id || '').trim();
    if (!goalId) return Response.json({ error: 'goal_id is required' }, { status: 400 });

    const goal = await base44.entities.Goal.get(goalId);
    const student = await base44.entities.Student.get(goal.student_id);

    const context = [
      `Student: ${student.first_name} ${student.last_name} (Grade ${student.grade || 'not recorded'})`,
      `Goal area: ${goal.goal_area || 'not recorded'}`,
      `Goal: ${goal.goal_text}`,
      `Baseline: ${goal.baseline || 'not recorded'}`,
      `Target: ${goal.target || 'not recorded'}`,
      `Condition: ${goal.condition || 'not recorded'}`,
      `Criterion: ${goal.criterion || 'not recorded'}`,
      `Measurement method: ${goal.measurement_method || 'not recorded'}`,
      `Accommodations on file: ${student.accommodations || 'not recorded'}`,
    ].join('\n');

    const prompt = `${CASECUE_SYSTEM_PROMPT}

You are creating a printable practice assignment that directly targets the student's IEP goal below. Use ONLY the verified goal and student information provided — never invent facts about the student. Create complete, ready-to-use materials pitched at the student's current performance level (the baseline), designed to move them toward the target.

${context}

Produce:
1. A complete student-facing activity or reading passage appropriate to the goal area and baseline level.
2. 5-10 practice items or questions with an answer key.
3. A simple progress-monitoring probe: a short repeatable task plus a plain-text one-week data table the teacher can fill in.
4. A short teacher note on how to run the activity and what to record.

Return JSON with keys: activity_title, skill_focus, teacher_note, activity (the full student-facing passage or activity text), items (array of {question, answer}), probe, accommodations_reminder.`;

    const assignment = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          activity_title: { type: 'string' },
          skill_focus: { type: 'string' },
          teacher_note: { type: 'string' },
          activity: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: { question: { type: 'string' }, answer: { type: 'string' } },
              required: ['question', 'answer'],
            },
          },
          probe: { type: 'string' },
          accommodations_reminder: { type: 'string' },
        },
        required: ['activity_title', 'skill_focus', 'activity', 'items', 'probe'],
      },
    });

    return Response.json({
      assignment,
      goal: { id: goal.id, goal_area: goal.goal_area, goal_text: goal.goal_text },
      student: { id: student.id, first_name: student.first_name, last_name: student.last_name },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}