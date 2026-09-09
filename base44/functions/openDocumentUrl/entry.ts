import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Returns a viewable (signed) URL for a document stored in the app's private
// storage. Public legacy files pass through unchanged.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.document_id) return Response.json({ error: 'A document is required.' }, { status: 400 });

    const document = await base44.entities.Document.get(body.document_id);
    if (!document) return Response.json({ error: 'Document not found.' }, { status: 404 });
    if (!document.file_url) return Response.json({ error: 'This document has no stored file.' }, { status: 400 });

    // Legacy public uploads — already viewable.
    if (String(document.file_url).startsWith('http')) {
      return Response.json({ signed_url: document.file_url });
    }

    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: document.file_url,
      expires_in: 3600,
    });

    return Response.json({ signed_url });
  } catch (error) {
    console.error('openDocumentUrl failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}