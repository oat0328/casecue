export function parseLessonTable(text){
 if(!text)return null;let value=String(text),parsed;try{parsed=JSON.parse(value);}catch{}
 if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)){const headers=Object.keys(parsed);if(headers.length&&headers.every(h=>Array.isArray(parsed[h])))return {headers,rows:Array.from({length:Math.max(...headers.map(h=>parsed[h].length))},(_,i)=>headers.map(h=>String(parsed[h][i]??'')))};}
 let lines=value.split('\n').map(l=>l.trim()).filter(l=>l.includes('|'));if(lines.length<2)return null;
 const cells=l=>l.replace(/^\|/,'').replace(/\|$/,'').split('|').map(v=>v.trim());
 const rows=lines.map(cells).filter(r=>!r.every(c=>!c||/^:?-{2,}:?$/.test(c)));if(rows.length<2)return null;return {headers:rows[0],rows:rows.slice(1).map(r=>rows[0].map((_,i)=>r[i]||''))};
}
