import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public endpoint: a visitor on the marketing site requests a demo without an account,
// so this runs as service role. Input is validated and bounded tightly.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const clean = (v: unknown, max: number): string =>
      typeof v === 'string' ? v.trim().slice(0, max) : '';

    const name = clean(body.name, 120);
    const email = clean(body.email, 200);
    const role = clean(body.role, 120);
    const organization = clean(body.organization, 160);
    const message = clean(body.message, 2000);

    if (!name || !EMAIL_RE.test(email)) {
      return Response.json({ error: 'Name and a valid email are required.' }, { status: 400 });
    }

    await base44.asServiceRole.entities.DemoRequest.create({
      name,
      email,
      role,
      organization,
      message,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('request-demo: failed to save demo request', error);
    return Response.json({ error: 'Could not submit request.' }, { status: 500 });
  }
}