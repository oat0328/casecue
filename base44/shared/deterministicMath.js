const EPS=1e-9;

export function normalizeMathText(value=''){
  return String(value??'')
    .replace(/[−–—]/g,'-')
    .replace(/[×·]/g,'*')
    .replace(/÷/g,'/')
    .replace(/,/g,'')
    .replace(/\s+/g,' ')
    .trim();
}

function tokenize(expr){
  const s=normalizeMathText(expr).replace(/\s+/g,'');
  const tokens=[]; let i=0;
  while(i<s.length){
    const c=s[i];
    if(/[0-9.]/.test(c)){
      let j=i+1; while(j<s.length&&/[0-9.]/.test(s[j]))j++;
      const n=Number(s.slice(i,j)); if(!Number.isFinite(n))return null;
      tokens.push({t:'n',v:n}); i=j; continue;
    }
    if('+-*/()'.includes(c)){tokens.push({t:c});i++;continue;}
    return null;
  }
  return tokens;
}

function evalTokens(tokens){
  if(!tokens)return null; let i=0;
  const peek=()=>tokens[i];
  const eat=t=>peek()?.t===t?(i++,true):false;
  function primary(){
    if(eat('+')) return primary();
    if(eat('-')){const v=primary();return v==null?null:-v;}
    if(eat('(')){const v=expr();if(v==null||!eat(')'))return null;return v;}
    const tok=peek(); if(tok?.t==='n'){i++;return tok.v;} return null;
  }
  function term(){
    let v=primary(); if(v==null)return null;
    while(peek()?.t==='*'||peek()?.t==='/'){
      const op=tokens[i++].t, r=primary(); if(r==null)return null;
      if(op==='/'&&Math.abs(r)<EPS)return null;
      v=op==='*'?v*r:v/r;
    }
    return v;
  }
  function expr(){
    let v=term(); if(v==null)return null;
    while(peek()?.t==='+'||peek()?.t==='-'){
      const op=tokens[i++].t, r=term(); if(r==null)return null;
      v=op==='+'?v+r:v-r;
    }
    return v;
  }
  const out=expr(); return out!=null&&i===tokens.length&&Number.isFinite(out)?out:null;
}

export function evaluateExpression(raw=''){
  let s=normalizeMathText(raw)
    .replace(/^[^:=]*:\s*/,'')
    .replace(/\?+$/,'')
    .replace(/=\s*[_\s]*$/,'')
    .trim();
  const percent=s.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))%\s+of\s+([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/i);
  if(percent)return Number(percent[1])/100*Number(percent[2]);
  if(/[a-z]/i.test(s)){
    const eq=solveSimpleEquation(s); if(eq!=null)return eq;
    return null;
  }
  return evalTokens(tokenize(s));
}

export function solveSimpleEquation(raw=''){
  const s=normalizeMathText(raw).toLowerCase().replace(/\s+/g,'');
  if(!s.includes('=')||!s.includes('x'))return null;
  const parts=s.split('='); if(parts.length!==2)return null;
  const [left,right]=parts;
  const rightVal=evalTokens(tokenize(right)); if(rightVal==null)return null;

  let m=left.match(/^x([+-])(\d+(?:\.\d+)?)$/);
  if(m)return m[1]==='+'?rightVal-Number(m[2]):rightVal+Number(m[2]);
  m=left.match(/^(\d+(?:\.\d+)?)x$/);
  if(m&&Number(m[1])!==0)return rightVal/Number(m[1]);
  m=left.match(/^x\/(\d+(?:\.\d+)?)$/);
  if(m)return rightVal*Number(m[1]);
  m=left.match(/^(\d+(?:\.\d+)?)\*?x([+-])(\d+(?:\.\d+)?)$/);
  if(m&&Number(m[1])!==0){
    const a=Number(m[1]),b=Number(m[3]);
    return m[2]==='+'?(rightVal-b)/a:(rightVal+b)/a;
  }
  return null;
}

function extractComparable(raw=''){
  let s=normalizeMathText(raw);
  if(!s)return null;
  if(s.includes('='))s=s.split('=').pop().trim();
  s=s.replace(/^[^0-9+\-.(]*|[^0-9)%/.*+\-]*$/g,'').trim();
  if(!s)return null;
  if(/^[-+]?\d+(?:\.\d+)?%$/.test(s))return Number(s.replace('%',''))/100;
  const mixed=s.match(/^([+-]?\d+)\s+(\d+)\/(\d+)$/);
  if(mixed&&Number(mixed[3])!==0){
    const whole=Number(mixed[1]),frac=Number(mixed[2])/Number(mixed[3]);
    return whole<0?whole-frac:whole+frac;
  }
  return evaluateExpression(s);
}

export function answersEquivalent(studentRaw,correctValue,tolerance=1e-6){
  const student=extractComparable(studentRaw);
  if(student==null||correctValue==null||!Number.isFinite(Number(correctValue)))return false;
  return Math.abs(Number(student)-Number(correctValue))<=tolerance*Math.max(1,Math.abs(Number(correctValue)));
}

export function gradeDeterministicRows(rows=[]){
  let deterministicCount=0,reviewCount=0;
  const graded=(Array.isArray(rows)?rows:[]).map((row,index)=>{
    const problem=String(row.problem_text||row.problem||row.expression||row.question||'').trim();
    const existingPossible=Number(row.possible||row.point_value||0);
    const solved=evaluateExpression(problem);
    if(solved==null){
      if(String(row.status||'').toLowerCase().includes('review'))reviewCount++;
      return {...row,item:row.item||row.label||String(index+1)};
    }
    deterministicCount++;
    const p=existingPossible>0?existingPossible:1;
    const response=String(row.student_response??row.student_answer??'').trim();
    const blank=!response;
    const correct=!blank&&answersEquivalent(response,solved);
    const e=correct?p:0;
    return {
      ...row,
      item:row.item||row.label||String(index+1),
      problem_text:problem,
      student_response:response,
      correct_answer:String(Number.isInteger(solved)?solved:Number(solved.toFixed(8))),
      earned:e,
      possible:p,
      status:blank?'blank':correct?'correct':'incorrect',
      deterministic:true,
      note:blank?'No visible student response.':correct?'Deterministic solver verified the response.':'Deterministic solver found a different correct answer.'
    };
  });
  const finalized=graded.filter(row=>{const status=String(row.status||'').toLowerCase();return Number(row.possible)>0&&Number.isFinite(Number(row.earned))&&!['needs_review','unreadable'].includes(status);});
  const earned=finalized.reduce((n,row)=>n+Number(row.earned||0),0);
  const possible=finalized.reduce((n,row)=>n+Number(row.possible||0),0);
  return {rows:graded,deterministicCount,earned,possible,percentage:possible>0?Math.round(earned/possible*1000)/10:0,reviewCount,finalizedCount:finalized.length};
}

export function comparePassRows(pass1=[],pass2=[]){
  const a=Array.isArray(pass1)?pass1:[],b=Array.isArray(pass2)?pass2:[];
  const discrepancies=[];
  if(a.length!==b.length)discrepancies.push({type:'question_count',item:'assignment',pass_1_value:a.length,pass_2_value:b.length});
  const max=Math.max(a.length,b.length);
  for(let i=0;i<max;i++){
    const x=a[i],y=b[i]; if(!x||!y)continue;
    const item=x.item||x.label||String(i+1);
    const checks=[
      ['problem_text',x.problem_text||x.problem||'',y.problem_text||y.problem||''],
      ['student_answer',x.student_response||'',y.student_response||''],
      ['expected_answer',x.correct_answer||'',y.correct_answer||''],
      ['score',`${Number(x.earned||0)}/${Number(x.possible||0)}`,`${Number(y.earned||0)}/${Number(y.possible||0)}`]
    ];
    for(const [type,v1,v2] of checks){
      if(normalizeMathText(v1)!==normalizeMathText(v2))discrepancies.push({type,item,pass_1_value:String(v1),pass_2_value:String(v2)});
    }
  }
  return discrepancies;
}
