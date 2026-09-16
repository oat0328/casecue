import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Returns a short-lived view URL for a private WorkEvidence worksheet.
// The browser never calls CreateFileSignedUrl directly; signing stays server-side.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.evidence_id) return Response.json({ error: 'Evidence is required.' }, { status: 400 });

    const evidence = await base44.entities.WorkEvidence.get(body.evidence_id);
    if (!evidence) return Response.json({ error: 'Evidence not found.' }, { status: 404 });
    if (!evidence.file_url) return Response.json({ error: 'This work sample has no stored worksheet file.' }, { status: 400 });

    if (String(evidence.file_url).startsWith('http')) {
      return Response.json({ signed_url: evidence.file_url });
    }

    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: evidence.file_url,
      expires_in: 3600,
    });
    return Response.json({ signed_url });
  } catch (error) {
    console.error('openEvidenceUrl failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
