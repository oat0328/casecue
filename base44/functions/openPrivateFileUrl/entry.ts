import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
export default async function(req:any){try{
 const base44=createClientFromRequest(req),user=await base44.auth.me();if(!user)return Response.json({error:'Unauthorized'},{status:401});
 const body=await req.json(),fileUri=String(body?.file_uri||'');if(!fileUri)return Response.json({error:'A private file is required.'},{status:400});
 // SECURITY: never turn an arbitrary client-supplied URI into a service-role signed URL.
 // Callers must supply a record reference so ownership/org scope can be verified first.
 const org=String(user.organization_id||user.data?.organization_id||'');if(!org)return Response.json({error:'Organization access is required.'},{status:403});
 const type=String(body?.record_type||''),id=String(body?.record_id||'');if(!type||!id)return Response.json({error:'A verified record reference is required to open private files.'},{status:400});
 const allowed:any={WorkEvidence:'WorkEvidence',GradebookAssignment:'GradebookAssignment',WorkspaceNote:'WorkspaceNote',StudentNote:'StudentNote',SessionRecord:'SessionRecord'};
 const entity=allowed[type];if(!entity)return Response.json({error:'Unsupported private record type.'},{status:400});
 const record=await (base44.entities as any)[entity].get(id);if(!record||String(record.organization_id||'')!==org)return Response.json({error:'File not found.'},{status:404});
 const candidates=[record.file_url,record.attachment_url,record.file_uri].filter(Boolean).map(String);
 if(!candidates.includes(fileUri))return Response.json({error:'File is not linked to the verified record.'},{status:403});
 if(/^https?:\/\//i.test(fileUri))return Response.json({error:'Legacy public file URLs are blocked by the privacy gate. Re-upload this file to private storage.'},{status:409});
 const {signed_url}=await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:fileUri,expires_in:900});return Response.json({signed_url});
}catch(error:any){console.error('openPrivateFileUrl failed:',error);return Response.json({error:error.message},{status:500})}}
