import {createClientFromRequest} from'npm:@base44/sdk@0.8.44';
import {validatePromo} from'../../shared/promoValidation.ts';
const isoDate=(d:Date)=>d.toISOString().slice(0,10);
export default async function(req:any){try{
 const base44=createClientFromRequest(req),user=await base44.auth.me();if(!user)return Response.json({error:'Unauthorized'},{status:401});
 const body=await req.json().catch(()=>({}));const check=await validatePromo(base44,String(body.code||''),user);if(!check.ok)return Response.json({ok:false,reason:check.reason},{status:400});
 const promo:any=check.promo;if(promo.discount_type!=='trial_extension')return Response.json({ok:false,reason:'This promo applies at checkout.'},{status:400});
 const userOrg=String(user.organization_id||user.data?.organization_id||'');
 const memberships=await base44.entities.OrganizationMembership.filter({user_id:user.id,status:'active'},'-created_date',25);
 const orgIds=[...new Set([userOrg,...(memberships||[]).map((m:any)=>String(m.organization_id||''))].filter(Boolean))];
 if(!orgIds.length)return Response.json({error:'No active workspace organization found.'},{status:403});
 const targets:any[]=[];for(const organization_id of orgIds){const subs=await base44.asServiceRole.entities.Subscription.filter({organization_id},'-created_date',1);if(subs?.[0])targets.push({organization_id,sub:subs[0]});}
 if(!targets.length)return Response.json({error:'No subscription record found for your workspace.'},{status:404});
 const days=Math.max(1,Math.floor(Number(promo.value)||0));const today=new Date();today.setHours(0,0,0,0);let latestEnd='';
 for(const {organization_id,sub} of targets){let base=today;if(sub.trial_end){const existing=new Date(`${sub.trial_end}T00:00:00`);if(!Number.isNaN(existing.getTime())&&existing>base)base=existing;}const end=new Date(base);end.setDate(end.getDate()+days);latestEnd=isoDate(end);await base44.asServiceRole.entities.Subscription.update(sub.id,{status:'trialing',previous_status:sub.status||'expired',trial_end:latestEnd,internal_note:`Promo ${promo.code}: +${days} trial days redeemed ${new Date().toISOString()} for all workspace routes in org ${organization_id}`});}
 await base44.asServiceRole.entities.PromoCode.update(promo.id,{redemptions:[...(promo.redemptions||[]),{user_id:user.id,user_email:user.email||'',redeemed_at:new Date().toISOString(),checkout_id:'ACCESS_EXTENSION'}]});
 await base44.asServiceRole.entities.AuditLog.create({action:'promo_access_redeemed',entity_type:'PromoCode',entity_id:promo.id,details:`${promo.code} granted +${days} trial days across ${targets.length} authorized organization subscription record(s); latest trial through ${latestEnd}`}).catch(()=>{});
 return Response.json({ok:true,code:promo.code,days,trial_end:latestEnd,organizations_updated:targets.length,message:`Access restored across your CaseCue workspaces through ${latestEnd}.`});
}catch(e:any){console.error('redeemPromoAccess failed',e);return Response.json({error:e.message||'Could not redeem promo access'},{status:500})}}
