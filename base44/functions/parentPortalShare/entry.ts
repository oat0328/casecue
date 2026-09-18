import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const enc = new TextEncoder();
function bytesToHex(bytes) { return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(''); }
async function sha256(value) { return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value)))); }
function randomToken() { const bytes = new Uint8Array(32); crypto.getRandomValues(bytes); return bytesToHex(bytes); }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list';
    const orgId = user?.data?.organization_id;
    if (!orgId) return Response.json({ error: 'Organization is required.' }, { status: 400 });
    const workspaces = Array.isArray(user?.workspaces) ? user.workspaces : (Array.isArray(user?.data?.workspaces) ? user.data.workspaces : []);
    const canManageFamilyShares = user?.role === 'admin' || workspaces.includes('sped');
    if (!canManageFamilyShares) return Response.json({ error: 'Family sharing is limited to authorized SPED or administrator accounts.' }, { status: 403 });

    if (action === 'list') {
      const shares = await base44.entities.ParentShare.filter({ organization_id: orgId }, '-created_date', 100);
      return Response.json({ shares: (shares || []).map(({ token_hash, ...safe }) => safe) });
    }

    if (action === 'create') {
      if (!body.student_id) return Response.json({ error: 'Student is required.' }, { status: 400 });
      const studentRows = await base44.entities.Student.filter({ id: body.student_id }, '-created_date', 1);
      const student = (studentRows || [])[0];
      if (!student || student.organization_id !== orgId) return Response.json({ error: 'Student not found.' }, { status: 404 });
      const allowed = Array.isArray(body.allowed_sections) ? body.allowed_sections.filter((x) => ['academic_snapshot','progress','goals','resources','upcoming_meetings'].includes(x)) : ['academic_snapshot','progress','goals','resources'];
      const token = randomToken();
      const tokenHash = await sha256(token);
      const days = Math.max(1, Math.min(Number(body.expires_in_days) || 7, 90));
      const expires = new Date(Date.now() + days * 86400000).toISOString();
      const record = await base44.entities.ParentShare.create({
        student_id: student.id, organization_id: orgId, label: body.label || 'Parent view', token_hash: tokenHash,
        allowed_sections: allowed, status: 'active', expires_at: expires, created_by_name: user.full_name || user.email || 'CaseCue educator',
        access_count: 0, include_last_name: !!body.include_last_name,
      });
      await base44.asServiceRole.entities.AuditLog.create({ action: 'parent_share_created', entity_type: 'ParentShare', entity_id: record.id, details: `Read-only parent share created for student ${student.id} by ${user.email}` });
      return Response.json({ share: { id: record.id, expires_at: expires, allowed_sections: allowed }, token });
    }

    if (action === 'revoke') {
      if (!body.share_id) return Response.json({ error: 'Share is required.' }, { status: 400 });
      const rows = await base44.entities.ParentShare.filter({ id: body.share_id, organization_id: orgId }, '-created_date', 1);
      const share = (rows || [])[0];
      if (!share) return Response.json({ error: 'Share not found.' }, { status: 404 });
      await base44.entities.ParentShare.update(share.id, { status: 'revoked' });
      await base44.asServiceRole.entities.AuditLog.create({ action: 'parent_share_revoked', entity_type: 'ParentShare', entity_id: share.id, details: `Read-only parent share revoked by ${user.email}` });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (error) {
    console.error('parentPortalShare failed:', error);
    return Response.json({ error: 'Unable to manage parent sharing.' }, { status: 500 });
  }
}