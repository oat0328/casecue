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
    if (!document.file_url) return Response.json({ error: 'This document has no stored file.' }, { status: 400 });\n    const org=String(user.organization_id||user.data?.organization_id||'');\n    if(!org||String(document.organization_id||'')!==org)return Response.json({error:'Document not found.'},{status:404});

    // Legacy public uploads — already viewable.
    if (String(document.file_url).startsWith('http')) {
      return Response.json({ signed_url: document.file_url });
    }

    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: document.file_url,
      expires_in: 900,
    });

    await base44.entities.SecurityAuditEvent.create({organization_id:org,actor_user_id:user.id,actor_email:user.email||'',action:'document_view',resource_type:'Document',resource_id:document.id,student_id:document.student_id||'',workspace:user.active_workspace||'sped',detail:'Private student document opened with short-lived signed access.',occurred_at:new Date().toISOString(),severity:'info'}).catch(()=>{});\n    return Response.json({ signed_url });
  } catch (error) {
    console.error('openDocumentUrl failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}