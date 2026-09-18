import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const enc = new TextEncoder();
function bytesToHex(bytes) { return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(''); }
async function sha256(value) { return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value)))); }
const norm = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const subjectTokens = (value) => {
  const text = norm(value);
  const out = new Set(text.split(' ').filter(x => x.length > 2));
  if (/math|algebra|geometry|computation|number/.test(text)) out.add('math');
  if (/reading|ela|english|literature|literacy|comprehension|phonics|decoding/.test(text)) out.add('reading');
  if (/writing|written expression|composition/.test(text)) out.add('writing');
  return out;
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    const accessCode = String(body.access_code || '').trim();
    if (!token || token.length < 40) return Response.json({ error: 'Invalid or expired link.' }, { status: 404 });
    const hash = await sha256(token);
    const svc = base44.asServiceRole;
    const shares = await svc.entities.ParentShare.filter({ token_hash: hash }, '-created_date', 1);
    const share = (shares || [])[0];
    if (!share || share.status !== 'active' || !share.expires_at || new Date(share.expires_at) <= new Date()) {
      return Response.json({ error: 'This family link is invalid, expired, or has been revoked.' }, { status: 404 });
    }
    if (share.locked_until && new Date(share.locked_until) > new Date()) {
      return Response.json({ error: 'Too many incorrect access-code attempts. Try again later.' }, { status: 429 });
    }
    if (share.access_code_hash) {
      if (!/^\d{6}$/.test(accessCode)) return Response.json({ error: 'Enter the 6-digit family access code.' }, { status: 401 });
      const codeHash = await sha256(accessCode);
      if (codeHash !== share.access_code_hash) {
        const fails = Number(share.failed_attempt_count || 0) + 1;
        const patch:any = { failed_attempt_count:fails };
        if (fails >= 5) patch.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await svc.entities.ParentShare.update(share.id, patch);
        return Response.json({ error: fails >= 5 ? 'Too many incorrect access-code attempts. Try again in 15 minutes.' : 'That access code is not correct.' }, { status: 401 });
      }
      if (share.failed_attempt_count || share.locked_until) await svc.entities.ParentShare.update(share.id,{failed_attempt_count:0,locked_until:null});
    }
    const student = await svc.entities.Student.get(share.student_id);
    if (!student || student.organization_id !== share.organization_id) return Response.json({ error: 'Shared view is unavailable.' }, { status: 404 });
    const allowed = new Set(share.allowed_sections || []);
    const payload:any = {
      student: { first_name: student.first_name, last_initial: share.include_last_name ? student.last_name : (student.last_name ? `${student.last_name[0]}.` : ''), grade: student.grade || '' },
      expires_at: share.expires_at,
      sections: Array.from(allowed),
    };

    let goals = [];
    if (allowed.has('goals') || allowed.has('progress') || allowed.has('academic_snapshot')) {
      goals = await svc.entities.Goal.filter({ student_id: student.id }, '-updated_date', 30);
    }
    if (allowed.has('goals') || allowed.has('progress')) {
      const points = await svc.entities.ProgressData.filter({ student_id: student.id }, 'date', 200);
      if (allowed.has('goals')) payload.goals = (goals || []).map(g => ({ id:g.id, goal_area:g.goal_area || 'Goal', goal_text:g.goal_text || '', target:g.target || '', measurement_method:g.measurement_method || '' }));
      if (allowed.has('progress')) payload.progress = (goals || []).map(g => ({
        goal_id:g.id, goal_area:g.goal_area || 'Goal',
        points:(points || []).filter(p=>p.goal_id===g.id).map(p=>({ date:p.date, percentage:p.percentage, correct:p.correct, total:p.total })).slice(-12)
      }));
    }

    if (allowed.has('academic_snapshot')) {
      const rows = await svc.entities.GradebookAssignment.filter({ student_id: student.id }, '-date', 500);
      const safeRows = (rows || []).filter(r => !r.organization_id || r.organization_id === share.organization_id);
      const serviceText = [ ...(student.services || []), ...(goals || []).map(g => g.goal_area || '') ].join(' ');
      const serviceSet = subjectTokens(serviceText);
      const byCourse = new Map();
      for (const row of safeRows) {
        const course = String(row.course || '').trim() || 'General Education';
        const key = norm(course) || 'general education';
        if (!byCourse.has(key)) byCourse.set(key, { course, rows:[] });
        byCourse.get(key).rows.push(row);
      }
      payload.academic_snapshot = Array.from(byCourse.values()).map(({course,rows}:any) => {
        const sorted = rows.slice().sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')));
        const gradeRow = sorted.find(r => r.current_grade_percent != null || r.current_grade_letter) || sorted[0] || {};
        const cTokens = subjectTokens(course);
        const service_focus = Array.from(cTokens).some(t => serviceSet.has(t));
        return {
          course,
          teacher: gradeRow.gen_ed_teacher || '',
          percent: gradeRow.current_grade_percent ?? null,
          letter: gradeRow.current_grade_letter || '',
          term: gradeRow.term || '',
          missing_assignments: rows.filter(r => r.missing_assignment).length,
          service_focus,
          latest_date: gradeRow.date || '',
        };
      }).sort((a,b) => Number(b.service_focus)-Number(a.service_focus) || a.course.localeCompare(b.course));
      payload.academic_note = 'All uploaded Gen Ed classes are shown for the whole-school picture. Highlighted service-area classes are context for SPED planning; Gen Ed grades are not counted as IEP-goal progress by themselves.';
    }

    if (allowed.has('resources')) {
      const resources = await svc.entities.ParentResource.filter({ organization_id: share.organization_id, active: true }, '-created_date', 100);
      payload.resources = (resources || []).filter(r => !r.student_id || r.student_id === student.id).map(r => ({ title:r.title, description:r.description || '', url:r.url || '', category:r.category || 'Resource' }));
    }
    if (allowed.has('upcoming_meetings')) {
      const meetings = await svc.entities.Meeting.filter({ student_id: student.id, status:'scheduled' }, 'date', 20);
      payload.meetings = (meetings || []).map(m => ({ title:m.title || m.meeting_type || 'Meeting', date:m.date, time:m.time || '' })).filter(m => m.date && new Date(`${m.date}T23:59:59`) >= new Date());
    }
    await svc.entities.ParentShare.update(share.id, { last_accessed_at:new Date().toISOString(), access_count:Number(share.access_count || 0)+1 });
    await svc.entities.AuditLog.create({ action:'parent_share_viewed', entity_type:'ParentShare', entity_id:share.id, details:'Read-only parent portal link accessed.' });
    return Response.json(payload, { headers: { 'Cache-Control':'no-store, private', 'Pragma':'no-cache', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer' } });
  } catch (error) {
    console.error('parentPortalView failed:', error);
    return Response.json({ error:'Unable to open this shared view.' }, { status:500 });
  }
}