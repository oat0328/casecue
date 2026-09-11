import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const enc = new TextEncoder();
function bytesToHex(bytes) { return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(''); }
async function sha256(value) { return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value)))); }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    if (!token || token.length < 40) return Response.json({ error: 'Invalid or expired link.' }, { status: 404 });
    const hash = await sha256(token);
    const svc = base44.asServiceRole;
    const shares = await svc.entities.ParentShare.filter({ token_hash: hash }, '-created_date', 1);
    const share = (shares || [])[0];
    if (!share || share.status !== 'active' || !share.expires_at || new Date(share.expires_at) <= new Date()) {
      return Response.json({ error: 'This parent link is invalid, expired, or has been revoked.' }, { status: 404 });
    }
    const student = await svc.entities.Student.get(share.student_id);
    if (!student || student.organization_id !== share.organization_id) return Response.json({ error: 'Shared view is unavailable.' }, { status: 404 });
    const allowed = new Set(share.allowed_sections || []);
    const payload = {
      student: { first_name: student.first_name, last_initial: share.include_last_name ? student.last_name : (student.last_name ? `${student.last_name[0]}.` : ''), grade: student.grade || '' },
      expires_at: share.expires_at,
      sections: Array.from(allowed),
    };
    if (allowed.has('goals') || allowed.has('progress')) {
      const goals = await svc.entities.Goal.filter({ student_id: student.id }, '-updated_date', 30);
      const points = await svc.entities.ProgressData.filter({ student_id: student.id }, 'date', 200);
      if (allowed.has('goals')) payload.goals = (goals || []).map(g => ({ id:g.id, goal_area:g.goal_area || 'Goal', goal_text:g.goal_text || '', target:g.target || '', measurement_method:g.measurement_method || '' }));
      if (allowed.has('progress')) payload.progress = (goals || []).map(g => ({
        goal_id:g.id, goal_area:g.goal_area || 'Goal',
        points:(points || []).filter(p=>p.goal_id===g.id).map(p=>({ date:p.date, percentage:p.percentage, correct:p.correct, total:p.total })).slice(-12)
      }));
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