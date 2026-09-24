import fs from'node:fs';import path from'node:path';
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const sourceFiles=['src','base44/functions'].flatMap(d=>walk(d)).filter(f=>/\.(js|jsx|ts|tsx|mjs)$/.test(f));
const source=sourceFiles.map(f=>fs.readFileSync(f,'utf8')).join('\n');
const active=new Set([...source.matchAll(/(?:entities|entity)\.([A-Z][A-Za-z0-9_]+)/g)].map(m=>m[1]));
const schemas=walk('base44/entities').filter(x=>x.endsWith('.jsonc'));const sensitive=/Student|IEP|Iep|Goal|Document|Evidence|Grade|Session|Attendance|Meeting|Behavior|Para|Nurse|Speech|Progress|Family|Contact/i;
const activeNoRls=[],activeNoOrg=[],dormantNoRls=[];
for(const f of schemas){if(!sensitive.test(path.basename(f)))continue;const t=fs.readFileSync(f,'utf8'),name=(t.match(/"name"\s*:\s*"([^"]+)"/)||[])[1]||path.basename(f,'.jsonc'),isActive=active.has(name);
 if(!t.includes('"rls"'))(isActive?activeNoRls:dormantNoRls).push(f);if(isActive&&!t.includes('"organization_id"'))activeNoOrg.push(f);
}
const funcs=walk('base44/functions').filter(x=>x.endsWith('.ts'));const arbitrarySigner=[];
for(const f of funcs){const t=fs.readFileSync(f,'utf8');if(t.includes('asServiceRole.integrations.Core.CreateFileSignedUrl')&&!/organization_id|organizationId|document_id|evidence_id|record_id|isPrivateUploadUri/.test(t))arbitrarySigner.push(f)}
console.log(JSON.stringify({sensitive_schema_count:schemas.filter(f=>sensitive.test(path.basename(f))).length,active_sensitive_without_rls:activeNoRls.length,active_sensitive_without_org_field:activeNoOrg.length,dormant_or_unreferenced_sensitive_without_rls:dormantNoRls.length,service_signer_review:arbitrarySigner.length,active_missing_rls:activeNoRls,active_missing_org:activeNoOrg,signer_review:arbitrarySigner},null,2));
if(activeNoRls.length||activeNoOrg.length||arbitrarySigner.length)process.exitCode=2;
