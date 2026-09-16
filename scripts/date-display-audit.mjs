import fs from 'node:fs';
import path from 'node:path';

const ROOT=path.resolve('src');
const EXT=new Set(['.js','.jsx','.ts','.tsx']);
const findings=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(EXT.has(path.extname(p)))scan(p);}}
function scan(file){const text=fs.readFileSync(file,'utf8');const lines=text.split(/\r?\n/);lines.forEach((line,i)=>{
  const rawJsx=/\{\s*[\w?.]+(?:\.date|_date|_due)\s*\}/i.test(line);
  const rawTemplate=/\$\{[^}]{0,80}(?:\.date|_date|_due)[^}]*\}/i.test(line);
  const isoSlice=/\.date\?\.slice\(5\)|\.date\.slice\(5\)/i.test(line);
  const alreadySafe=/formatDate|formatDateShort|formatDateTime|formatDateText|type=["']date["']|toISOString|todayISO|dateISO|new Date\(/i.test(line);
  if((rawJsx||rawTemplate||isoSlice)&&!alreadySafe)findings.push(`${file}:${i+1}: ${line.trim().slice(0,220)}`);
});}
walk(ROOT);
console.log('\nCaseCue date display audit');
console.log('Display standard: MM/DD/YYYY (example 09/16/2026). Storage remains YYYY-MM-DD.\n');
if(!findings.length){console.log('✓ No obvious raw ISO date display leaks found by the static audit.');process.exit(0);}
console.log(`Review ${findings.length} possible raw date display location(s):\n`);
findings.forEach(x=>console.log(`- ${x}`));
console.log('\nUse formatDate(), formatDateShort(), formatDateTime(), or formatDateText() from src/lib/dateUtils.js at the UI/export boundary.');
