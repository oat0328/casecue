import jsPDF from'jspdf';

const safe=v=>String(v??'').replace(/[\u0000-\u001f]/g,' ').replace(/[^\x20-\x7E]/g,' ');
const name=v=>String(v||'casecue-analytics').replace(/[^a-z0-9-_]+/gi,'-').replace(/^-+|-+$/g,'')||'casecue-analytics';
const COLORS=[[37,99,235],[124,58,237],[5,150,105],[217,119,6],[225,29,72],[8,145,178]];

export function exportAnalyticsPdf({title='CaseCue Analytics',subtitle='',filename='casecue-analytics',metrics=[],charts=[],sections=[],notes=[]}){
 const doc=new jsPDF({unit:'pt',format:'letter'}),W=612,H=792,M=40,CW=W-M*2;
 let y=M;
 const pageFooter=()=>{};
 const ensure=h=>{if(y+h>H-55){doc.addPage();y=M}};

 doc.setFillColor(7,16,31);doc.roundedRect(M,y,CW,86,14,14,'F');
 doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(125,211,252);doc.text('CASECUE INTELLIGENCE',M+16,y+19);
 doc.setFontSize(19);doc.setTextColor(255,255,255);doc.text(doc.splitTextToSize(safe(title),CW-160),M+16,y+43);
 doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(203,213,225);if(subtitle)doc.text(doc.splitTextToSize(safe(subtitle),CW-160),M+16,y+67);
 const printed=new Date().toLocaleDateString('en-US',{month:'2-digit',day:'2-digit',year:'numeric'});
 doc.setFont('helvetica','bold');doc.setTextColor(255,255,255);doc.text('PRINTED',W-M-70,y+22);doc.setFont('helvetica','normal');doc.setTextColor(203,213,225);doc.text(printed,W-M-70,y+37);
 y+=103;

 if(metrics.length){
  const cols=Math.min(4,metrics.length),gap=8,w=(CW-gap*(cols-1))/cols;
  metrics.slice(0,8).forEach((m,i)=>{if(i&&i%cols===0)y+=64;const x=M+(i%cols)*(w+gap);doc.setFillColor(248,250,252);doc.setDrawColor(226,232,240);doc.roundedRect(x,y,w,54,9,9,'FD');doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(100,116,139);doc.text(safe(m.label).toUpperCase(),x+9,y+14);doc.setFontSize(16);doc.setTextColor(15,23,42);doc.text(safe(m.value),x+9,y+36);if(m.detail){doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(100,116,139);doc.text(doc.splitTextToSize(safe(m.detail),w-18),x+9,y+47)}});
  y+=70;
 }

 const drawTitle=(c,index)=>{doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(37,99,235);doc.text(`CHART ${String(index+1).padStart(2,'0')}`,M,y+9);doc.setFontSize(13);doc.setTextColor(15,23,42);doc.text(safe(c.title||'Analytics'),M,y+26);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100,116,139);if(c.subtitle)doc.text(doc.splitTextToSize(safe(c.subtitle),CW),M,y+40);y+=50};
 const drawBar=(c)=>{
  const data=c.data||[],series=c.series?.[0]||{key:'value',label:'Value'};if(!data.length)return;
  const x=M+18,w=CW-36,h=150,base=y+h,max=Math.max(1,...data.map(d=>Number(d[series.key]||0))),barW=Math.max(8,(w/data.length)*.55),step=w/data.length;
  doc.setDrawColor(226,232,240);for(let i=0;i<4;i++){const gy=y+i*h/3;doc.line(x,gy,x+w,gy)}
  data.forEach((d,i)=>{const val=Number(d[series.key]||0),bh=h*(val/max),bx=x+i*step+(step-barW)/2;doc.setFillColor(...COLORS[0]);doc.roundedRect(bx,base-bh,barW,bh,3,3,'F');doc.setFontSize(6.5);doc.setTextColor(100,116,139);doc.text(safe(d.name||''),bx+barW/2,base+11,{align:'center'});doc.setTextColor(15,23,42);doc.text(safe(val),bx+barW/2,base-bh-4,{align:'center'})});y=base+25;
 };
 const drawLine=(c)=>{
  const data=c.data||[],series=c.series||[];if(data.length<1||!series.length)return;
  const x=M+18,w=CW-36,h=145,base=y+h,max=Math.max(1,...data.flatMap(d=>series.map(s=>Number(d[s.key]||0))));
  doc.setDrawColor(226,232,240);for(let i=0;i<4;i++){const gy=y+i*h/3;doc.line(x,gy,x+w,gy)}
  series.forEach((s,si)=>{doc.setDrawColor(...COLORS[si%COLORS.length]);doc.setLineWidth(2);let prev=null;data.forEach((d,i)=>{const val=Number(d[s.key]||0),px=x+(data.length===1?w/2:i*w/(data.length-1)),py=base-h*(val/max);if(prev)doc.line(prev.x,prev.y,px,py);doc.setFillColor(...COLORS[si%COLORS.length]);doc.circle(px,py,2.5,'F');prev={x:px,y:py}})});
  data.forEach((d,i)=>{const px=x+(data.length===1?w/2:i*w/(data.length-1));doc.setFontSize(6.5);doc.setTextColor(100,116,139);doc.text(safe(d.name||''),px,base+11,{align:'center'})});
  y=base+26;
 };
 const drawDonutAsBars=(c)=>{
  const data=(c.data||[]).filter(d=>Number(d.value)>0),total=data.reduce((n,d)=>n+Number(d.value||0),0);if(!data.length)return;
  data.forEach((d,i)=>{ensure(27);const val=Number(d.value||0),pct=total?Math.round(val/total*100):0;doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(51,65,85);doc.text(safe(d.name),M,y+9);doc.setFont('helvetica','normal');doc.setTextColor(100,116,139);doc.text(`${val} · ${pct}%`,W-M,y+9,{align:'right'});doc.setFillColor(226,232,240);doc.roundedRect(M,y+14,CW,8,4,4,'F');doc.setFillColor(...COLORS[i%COLORS.length]);doc.roundedRect(M,y+14,Math.max(2,CW*pct/100),8,4,4,'F');y+=31});
 };
 charts.forEach((c,index)=>{ensure(235);doc.setDrawColor(226,232,240);doc.roundedRect(M,y,CW,Math.min(225,H-y-60),12,12,'S');const top=y+12;y=top;drawTitle(c,index);if(c.type==='line')drawLine(c);else if(c.type==='donut')drawDonutAsBars(c);else drawBar(c);y+=12});

 for(const section of sections||[]){const body=safe(section?.body||'');if(!body)continue;ensure(70);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(15,23,42);doc.text(safe(section.heading||'Summary'),M,y+12);y+=22;doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(51,65,85);const lines=doc.splitTextToSize(body,CW);for(const line of lines){ensure(14);doc.text(line,M,y);y+=12}y+=10;}

 if(notes.length){ensure(70);doc.setFillColor(239,246,255);doc.setDrawColor(191,219,254);const text=notes.map(n=>`• ${safe(n)}`).join('\n');const lines=doc.splitTextToSize(text,CW-22);doc.roundedRect(M,y,CW,lines.length*11+24,10,10,'FD');doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(30,64,175);doc.text('REVIEW NOTES',M+11,y+14);doc.setFont('helvetica','normal');doc.setTextColor(51,65,85);doc.text(lines,M+11,y+29)}

 const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);doc.setDrawColor(226,232,240);doc.line(M,H-31,W-M,H-31);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(100,116,139);doc.text('CaseCue · getcasecue.com',M,H-18);doc.text(`Printed ${printed} · Page ${p} of ${pages}`,W-M,H-18,{align:'right'})}
 doc.save(`${name(filename)}.pdf`);
}
