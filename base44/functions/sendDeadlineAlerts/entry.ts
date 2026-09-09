import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Scheduled task (called by the Daily Deadline Alerts workflow): no app user in the
// request, so it runs as service role and emails each teacher a digest of THEIR OWN
// students' upcoming deadlines. Bounded: one email per teacher per run, max 200
// teachers, deadlines within 30 days, max 25 items per email.

const DAY_MS = 86400000;
const WINDOW_DAYS = 30;
const MAX_USERS = 200;
const MAX_ITEMS = 25;

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / DAY_MS);
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;

    const [students, users] = await Promise.all([
      service.entities.Student.list('-created_date', 1000),
      service.entities.User.list(200),
    ]);

    const emailById = new Map((users || []).map((u) => [u.id, u.email]));
    const byTeacher = new Map();

    for (const s of students || []) {
      const teacherId = s.created_by_id;
      if (!teacherId || !emailById.get(teacherId)) continue;
      if (s.status === 'exited') continue;

      const alerts = [];
      const reviewDays = daysUntil(s.annual_review_due);
      const reevalDays = daysUntil(s.reevaluation_due);
      if (reviewDays !== null && reviewDays <= WINDOW_DAYS) {
        alerts.push({ student: `${s.first_name} ${s.last_name}`, kind: 'Annual IEP review', date: s.annual_review_due, days: reviewDays });
      }
      if (reevalDays !== null && reevalDays <= WINDOW_DAYS) {
        alerts.push({ student: `${s.first_name} ${s.last_name}`, kind: 'Reevaluation', date: s.reevaluation_due, days: reevalDays });
      }
      if (!alerts.length) continue;

      if (!byTeacher.has(teacherId)) byTeacher.set(teacherId, []);
      byTeacher.get(teacherId).push(...alerts);
    }

    let emailsSent = 0;
    for (const [teacherId, items] of byTeacher) {
      if (emailsSent >= MAX_USERS) break;
      try {
        const sorted = items.sort((a, b) => a.days - b.days).slice(0, MAX_ITEMS);
        const rows = sorted
          .map((a) => {
            const when = a.days < 0 ? `<strong style="color:#b91c1c">overdue (was due ${esc(a.date)})</strong>` : `in ${a.days} day${a.days === 1 ? '' : 's'} (${esc(a.date)})`;
            return `<tr><td style="padding:6px 12px 6px 0">${esc(a.student)}</td><td style="padding:6px 12px 6px 0">${esc(a.kind)}</td><td style="padding:6px 0">${when}</td></tr>`;
          })
          .join('');
        const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
          <h2 style="color:#6d28d9">CaseCue deadline digest</h2>
          <p>Here are the upcoming compliance deadlines for your caseload:</p>
          <table style="border-collapse:collapse;font-size:14px">${rows}</table>
          <p style="font-size:13px;color:#666">Sign in to CaseCue to review each student's timeline.</p>
          <p style="font-size:12px;color:#999">You're receiving this because deadline alerts are on. Manage them any time in Settings.</p>
        </div>`;
        await service.integrations.Core.SendEmail({
          to: emailById.get(teacherId),
          subject: `CaseCue: ${sorted.length} upcoming deadline${sorted.length === 1 ? '' : 's'} on your caseload`,
          html,
        });
        emailsSent++;
      } catch (error) {
        console.error('sendDeadlineAlerts: email failed for user', teacherId, error);
      }
    }

    return Response.json({ ok: true, teachers_with_alerts: byTeacher.size, emails_sent: emailsSent });
  } catch (error) {
    console.error('sendDeadlineAlerts: failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}