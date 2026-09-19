const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const lines=arr=>(arr||[]).filter(Boolean).map(x=>`<li>${esc(x)}</li>`).join('');
const categoryLabel=v=>({presentation:'Presentation',response:'Response',setting:'Setting',timing_scheduling:'Timing / Scheduling',instructional_support:'Instructional Support',organization:'Organization',other:'Other'}[v]||'Support');
const confidenceLabel=v=>({high:'High evidence match',medium:'Moderate evidence match',low:'Needs more data'}[v]||'Teacher review');

function goalCard(g,index){
 const objectives=(g.objectives||[]).map((o,i)=>`<li><span>${i+1}</span>${esc(o)}</li>`).join('');
 return `<section class="goal-card avoid">
  <div class="goal-top"><div><div class="eyebrow">DRAFT GOAL ${String(index+1).padStart(2,'0')}</div><h3>${esc(g.goal_area||'Instructional Goal')}</h3></div><div class="confidence">${esc(confidenceLabel(g.confidence))}</div></div>
  <p class="goal-text">${esc(g.goal_text||'')}</p>
  <div class="twocol">
   <div class="mini"><b>Baseline</b><p>${esc(g.baseline||'Needs verification')}</p></div>
   <div class="mini"><b>Suggested target</b><p>${esc(g.target||g.criterion||'Needs team review')}</p></div>
  </div>
  ${g.condition?`<div class="detail-row"><b>Condition</b><span>${esc(g.condition)}</span></div>`:''}
  ${g.criterion?`<div class="detail-row"><b>Criterion</b><span>${esc(g.criterion)}</span></div>`:''}
  ${objectives?`<div class="objectives"><b>Short-term objectives</b><ol>${objectives}</ol></div>`:''}
  <div class="goal-footer"><span><b>Measure:</b> ${esc(g.measurement_method||'Teacher-selected measure')}</span><span><b>Progress monitoring:</b> ${esc(g.progress_monitoring_method||'Teacher review')}</span></div>
 </section>`;
}

function supportCard(s,index){
 return `<article class="support-card avoid">
  <div class="support-number">${String(index+1).padStart(2,'0')}</div>
  <div class="support-main">
   <div class="support-head"><div><div class="eyebrow">${esc(categoryLabel(s.category))}</div><h3>${esc(s.support||'Support consideration')}</h3></div><span class="confidence">${esc(confidenceLabel(s.confidence))}</span></div>
   <div class="support-grid">
    <div><b>Assessment evidence</b><p>${esc(s.evidence||'Evidence needs teacher review.')}</p></div>
    <div><b>When it may help</b><p>${esc(s.when_helpful||'Teacher-selected instructional setting.')}</p></div>
   </div>
   <div class="rationale"><b>Why CaseCue surfaced it</b><p>${esc(s.rationale||'')}</p></div>
  </div>
 </article>`;
}

export function buildParaBaselinePacketHtml({student,assessmentTitle,packet,result,date}){
 const studentName=student?`${student.first_name||''} ${student.last_name||''}`.trim():'Student';
 const score=packet?.score_summary||(`${result?.score_earned??'—'}/${result?.score_possible??'—'}`);
 const pct=Number(result?.percentage);
 const percentage=Number.isFinite(pct)?`${Math.round(pct*10)/10}%`:'—';
 const supports=(packet?.support_recommendations||[]);
 const legacy=(packet?.accommodation_observations||[]);
 const supportHtml=supports.length?supports.map(supportCard).join(''):legacy.length?`<section class="panel"><div class="section-title"><span>05</span><div><div class="eyebrow">SUPPORT REVIEW</div><h2>Supports & Accommodation Considerations</h2></div></div><ul class="clean-list">${lines(legacy)}</ul><p class="section-note">Legacy packet format: teacher/IEP-team review is required before any support is adopted.</p></section>`:'';
 const goalHtml=(packet?.goal_drafts||[]).map(goalCard).join('')||'<div class="empty">No defensible goal draft was generated from this assessment. Collect additional data before drafting a measurable annual goal.</div>';
 const cautions=(packet?.cautions||[]).length?`<section class="review-box avoid"><div class="review-icon">!</div><div><div class="eyebrow">REVIEW REQUIRED</div><h2>Teacher Review Notes</h2><ul>${lines(packet.cautions)}</ul></div></section>`:'';

 return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(studentName)} · CaseCue Para Baseline Teacher Packet</title><style>
 @page{size:letter;margin:.42in .48in .56in}
 *{box-sizing:border-box}
 html,body{margin:0;padding:0;background:#fff;color:#0f172a;font-family:Inter,Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
 body{font-size:10.5px;line-height:1.46}
 .page{max-width:8.1in;margin:0 auto}
 .cover{background:linear-gradient(135deg,#07101f 0%,#102a4d 72%,#0d5d91 100%);color:white;border-radius:18px;padding:24px 26px;position:relative;overflow:hidden}
 .cover:after{content:"";position:absolute;width:180px;height:180px;border:30px solid rgba(255,255,255,.06);border-radius:50%;right:-78px;top:-72px}
 .brandrow{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
 .brand{font-weight:900;letter-spacing:.22em;font-size:10px;color:#7dd3fc;text-transform:uppercase}
 .draft{border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);padding:7px 10px;border-radius:999px;font-weight:800;font-size:8px;letter-spacing:.08em;text-transform:uppercase}
 h1{font-size:25px;line-height:1.04;margin:8px 0 7px;letter-spacing:-.03em}
 .sub{color:#cbd5e1;font-size:10.5px;max-width:570px}
 .snapshot{display:grid;grid-template-columns:1.25fr .65fr .65fr .72fr;gap:8px;margin-top:18px}
 .snap{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:10px 11px}
 .snap b{display:block;color:#7dd3fc;font-size:7.5px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px}
 .snap strong{font-size:11px}
 .scorebar{display:grid;grid-template-columns:1.1fr .9fr;gap:10px;margin-top:12px}
 .scorebox{background:#fff;color:#0f172a;border-radius:14px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:14px}
 .scorebox .big{font-size:29px;font-weight:950;letter-spacing:-.04em}
 .scorebox small{display:block;color:#64748b;font-size:8.5px;margin-top:2px}
 .percent{font-size:20px;font-weight:900;color:#0f5e9c}
 .handoff{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:14px 16px}
 .handoff b{display:block;color:#7dd3fc;font-size:8px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:5px}
 .panel{border:1px solid #dbe3ee;border-radius:15px;padding:15px 16px;margin-top:12px;background:#fff;break-inside:auto}
 .section-title{display:flex;align-items:flex-start;gap:10px;border-bottom:1px solid #e6edf5;padding-bottom:9px;margin-bottom:10px}
 .section-title>span{display:grid;place-items:center;min-width:28px;height:28px;border-radius:9px;background:#eaf5ff;color:#075985;font-size:8px;font-weight:950}
 .eyebrow{font-size:7.5px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:#0b6b9f}
 h2{font-size:15px;margin:2px 0 0;letter-spacing:-.015em}
 h3{font-size:12px;margin:2px 0 0}
 p{margin:0}
 .twocol{display:grid;grid-template-columns:1fr 1fr;gap:10px}
 .stat-card{border-radius:12px;padding:13px 14px}
 .strength{background:#edfdf6;border:1px solid #b7f2d3}
 .need{background:#fff7ed;border:1px solid #fed7aa}
 .stat-card h3{margin-bottom:6px}
 ul{margin:5px 0 0;padding-left:17px}
 li{margin:3px 0}
 .present{font-size:10.6px;line-height:1.58;color:#334155}
 .support-card{display:grid;grid-template-columns:36px 1fr;gap:10px;border:1px solid #cfe2f3;background:#f8fbff;border-radius:13px;padding:12px 13px;margin-top:8px}
 .support-number{display:grid;place-items:center;width:30px;height:30px;background:#0f2747;color:white;border-radius:9px;font-size:8px;font-weight:900}
 .support-head{display:flex;justify-content:space-between;gap:10px}
 .confidence{white-space:nowrap;align-self:flex-start;border:1px solid #dbe3ee;background:#fff;border-radius:999px;padding:4px 7px;font-size:7.5px;font-weight:800;color:#475569}
 .support-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:9px}
 .support-grid>div,.rationale,.mini{background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:8px 9px}
 .support-grid b,.rationale b,.mini b,.detail-row b{font-size:7.5px;letter-spacing:.07em;text-transform:uppercase;color:#475569}
 .support-grid p,.rationale p,.mini p{margin-top:3px;color:#334155}
 .rationale{margin-top:8px}
 .goal-card{border:1px solid #dbe3ee;border-radius:14px;padding:14px 15px;margin-top:9px;background:#fff}
 .goal-top{display:flex;justify-content:space-between;gap:12px}
 .goal-text{font-size:10.8px;font-weight:750;line-height:1.5;margin-top:8px}
 .mini{background:#f8fafc}
 .goal-card .twocol{margin-top:9px}
 .detail-row{display:grid;grid-template-columns:88px 1fr;gap:8px;border-top:1px solid #eef2f7;padding-top:7px;margin-top:7px}
 .objectives{margin-top:10px;background:#eff6ff;border:1px solid #dbeafe;border-radius:10px;padding:10px 11px}
 .objectives>b{font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#1d4ed8}
 .objectives ol{list-style:none;padding:0;margin:7px 0 0}
 .objectives li{display:grid;grid-template-columns:19px 1fr;gap:7px;margin:5px 0}
 .objectives li span{display:grid;place-items:center;width:17px;height:17px;border-radius:50%;background:#dbeafe;color:#1d4ed8;font-weight:900;font-size:7px}
 .goal-footer{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:9px;color:#64748b;font-size:8.5px}
 .clean-list{margin:0;padding-left:17px}
 .section-note{color:#64748b;font-size:8.5px;margin-top:8px}
 .review-box{display:grid;grid-template-columns:34px 1fr;gap:10px;border:1px solid #f3cd71;background:#fffbeb;border-radius:14px;padding:13px 14px;margin-top:12px}
 .review-icon{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:#f59e0b;color:white;font-weight:950}
 .review-box h2{font-size:13px}
 .review-box ul{color:#713f12}
 .empty{border:1px dashed #cbd5e1;border-radius:10px;padding:10px;color:#64748b}
 .avoid{break-inside:avoid}
 .footer-space{height:26px}
 .fixed-footer{position:fixed;left:.48in;right:.48in;bottom:.18in;border-top:1px solid #dbe3ee;padding-top:5px;display:flex;justify-content:space-between;color:#64748b;font-size:7.5px}
 .page-num:after{content:counter(page)}
 @media print{.page{max-width:none}.panel,.goal-card,.support-card,.review-box{box-shadow:none}}
 </style></head><body><main class="page">
  <section class="cover avoid">
   <div class="brandrow"><div><div class="brand">CaseCue Para · Assessment Intelligence</div><h1>Baseline Teacher Packet</h1><div class="sub">A review-ready handoff built from the completed assessment. Assessment evidence stays separate from final educator and IEP-team decisions.</div></div><div class="draft">Draft · Review Required</div></div>
   <div class="snapshot">
    <div class="snap"><b>Student</b><strong>${esc(studentName)}</strong></div>
    <div class="snap"><b>Grade</b><strong>${esc(student?.grade||'—')}</strong></div>
    <div class="snap"><b>Date</b><strong>${esc(date||'—')}</strong></div>
    <div class="snap"><b>Status</b><strong>Teacher Review</strong></div>
   </div>
   <div class="scorebar"><div class="scorebox"><div><div class="big">${esc(score)}</div><small>Completed assessment score</small></div><div class="percent">${esc(percentage)}</div></div><div class="handoff"><b>Assessment</b><div>${esc(assessmentTitle||'Instructional baseline assessment')}</div></div></div>
  </section>

  <section class="panel avoid"><div class="section-title"><span>01</span><div><div class="eyebrow">HANDOFF SUMMARY</div><h2>What the teacher needs to know first</h2></div></div><div class="present">${esc(packet?.teacher_handoff||packet?.overall_summary||'')}</div></section>

  <section class="panel"><div class="section-title"><span>02</span><div><div class="eyebrow">PERFORMANCE SNAPSHOT</div><h2>Strengths & Needs</h2></div></div><div class="twocol"><div class="stat-card strength"><h3>Strengths</h3><ul>${lines(packet?.strengths)}</ul></div><div class="stat-card need"><h3>Needs / Error Patterns</h3><ul>${lines(packet?.needs)}</ul></div></div></section>

  <section class="panel"><div class="section-title"><span>03</span><div><div class="eyebrow">DRAFT · EDUCATOR REVIEW</div><h2>Present Levels</h2></div></div><div class="present">${esc(packet?.present_levels_draft||'No present-level draft was generated.')}</div></section>

  <section class="panel"><div class="section-title"><span>04</span><div><div class="eyebrow">CLASSROOM ACCESS</div><h2>Supports & Accommodation Considerations</h2></div></div><p class="section-note">These are assessment-linked considerations only. The educator/IEP team decides whether any support is appropriate, needed across settings, and formally adopted.</p>${supportHtml||'<div class="empty" style="margin-top:9px">The assessment did not support a defensible accommodation consideration. Collect additional classroom data before recommending one.</div>'}</section>

  <section class="panel"><div class="section-title"><span>05</span><div><div class="eyebrow">DRAFT · EDUCATOR / IEP-TEAM REVIEW</div><h2>Goals & Short-Term Objectives</h2></div></div>${goalHtml}</section>

  <section class="panel avoid"><div class="section-title"><span>06</span><div><div class="eyebrow">NEXT DATA</div><h2>Progress Monitoring Plan</h2></div></div><ul class="clean-list">${lines(packet?.progress_monitoring_recommendations)}</ul></section>
  ${cautions}
  <div class="footer-space"></div>
 </main><footer class="fixed-footer"><span>CaseCue Para · Baseline Teacher Packet · getcasecue.com</span><span>Draft for educator/IEP-team review · Page <span class="page-num"></span></span></footer></body></html>`;
}

export function printParaBaselinePacket(opts){
 const w=window.open('','_blank');
 if(!w)return false;
 w.document.write(buildParaBaselinePacketHtml(opts));
 w.document.close();
 w.focus();
 setTimeout(()=>w.print(),450);
 return true;
}
