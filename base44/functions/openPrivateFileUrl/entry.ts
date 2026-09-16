import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req:any){
  try{
    const base44=createClientFromRequest(req);
    const user=await base44.auth.me();
    if(!user)return Response.json({error:'Unauthorized'},{status:401});
    const body=await req.json();
    const fileUri=String(body?.file_uri||'');
    if(!fileUri)return Response.json({error:'A private file is required.'},{status:400});
    if(fileUri.startsWith('http'))return Response.json({signed_url:fileUri});
    const {signed_url}=await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:fileUri,expires_in:3600});
    return Response.json({signed_url});
  }catch(error:any){
    console.error('openPrivateFileUrl failed:',error);
    return Response.json({error:error.message},{status:500});
  }
}