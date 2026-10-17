export function makeWordSearch(raw){
 const words=[...new Set(String(raw||'').split(/[,;\n]+/).map(w=>w.trim().toUpperCase()).filter(w=>/^[A-Z]{3,18}$/.test(w)))];
 if(words.length!==10)throw new Error('Enter exactly 10 unique assignment words, 3–18 letters each.');
 const size=Math.max(15,...words.map(w=>w.length));const grid=Array.from({length:size},()=>Array(size).fill(''));const placements=[];
 // A unique row per word guarantees placement without erasing another word.
 words.forEach((word,i)=>{const row=(i*7)%size;let actual=row;while(placements.some(p=>p.row===actual))actual=(actual+1)%size;const col=(i*3)%(size-word.length+1);word.split('').forEach((c,j)=>grid[actual][col+j]=c);placements.push({word,row:actual,col});});
 let seed=words.join('').split('').reduce((s,c)=>s+c.charCodeAt(0),17);const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 grid.forEach(row=>row.forEach((c,j)=>{if(!c)row[j]=String.fromCharCode(65+Math.floor(rand()*26));}));
 return{words,grid,placements};
}
