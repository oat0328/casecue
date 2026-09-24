import fs from'node:fs';import path from'node:path';
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const schemas=walk('base44/entities').filter(x=>x.endsWith('.jsonc'));const sensitive=/Student|IEP|Iep|Goal|Document|Evidence|Grade|Session|Attendance|Meeting|Behavior|Para|Nurse|Speech|Progress|Family|Contact/i;
const noRls=[],noOrg=[];for(const f of schemas){const t=fs.readFileSync(f,'utf8');if(sensitive.test(path.basename(f))){if(!t.includes('"rls"'))noRls.push(f);if(!t.includes('"organization_id"')&&!/User|Noop/.test(f))noOrg.push(f)}}
const funcs=walk('base44/functions').filter(x=>x.endsWith('.ts'));const arbitrarySigner=[];for(const f of funcs){const t=fs.readFileSync(f,'utf8');if(t.includes('asServiceRole.integrations.Core.CreateFileSignedUrl')&&!/organization_id|organizationId|document_id|evidence_id|record_id/.test(t))arbitrarySigner.push(f)}
console.log(JSON.stringify({sensitive_schema_count:schemas.filter(f=>sensitive.test(path.basename(f))).length,sensitive_without_rls:noRls.length,sensitive_without_org_field:noOrg.length,service_signer_review:arbitrarySigner.length,top_missing_rls:noRls.slice(0,25),top_missing_org:noOrg.slice(0,25),signer_review:arbitrarySigner.slice(0,25)},null,2));
if(arbitrarySigner.length)process.exitCode=2;
