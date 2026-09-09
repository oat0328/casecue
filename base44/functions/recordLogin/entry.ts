import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Records a signup or login in the audit log. Invoked by the
// "User Activity Tracking" workflow — no user auth context, so the
// user is verified against the database before anything is written.
export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.user_id;
    const eventType = body.event_type === 'signup' ? 'signup' : 'login';
    if (!userId || typeof userId !== 'string' || userId.length > 64) {
      return Response.json({ error: 'Invalid user' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    try {
      await base44.asServiceRole.entities.User.get(userId);
    } catch (e) {
      return Response.json({ error: 'Unknown user' }, { status: 400 });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      action: eventType,
      entity_type: 'User',
      entity_id: userId,
      details: JSON.stringify({
        email: typeof body.email === 'string' ? body.email.slice(0, 120) : null,
        auth_method: typeof body.auth_method === 'string' ? body.auth_method.slice(0, 30) : null,
      }),
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}