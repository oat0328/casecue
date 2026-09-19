import React from'react';
import{ResponsiveContainer,BarChart,Bar,LineChart,Line,AreaChart,Area,XAxis,YAxis,CartesianGrid,Tooltip,Legend,PieChart,Pie,Cell}from'recharts';
import{ArrowUpRight,BarChart3}from'lucide-react';

const PALETTE=['#2563eb','#7c3aed','#059669','#d97706','#e11d48','#0891b2','#4f46e5','#65a30d'];
const grid='#e2e8f0',axis='#64748b';

export function PremiumMetric({label,value,detail,icon:Icon,accent='blue'}){
 const tone={blue:'from-blue-600 to-cyan-500',violet:'from-violet-600 to-fuchsia-500',emerald:'from-emerald-600 to-teal-500',amber:'from-amber-500 to-orange-500',rose:'from-rose-600 to-pink-500'}[accent]||'from-blue-600 to-cyan-500';
 return <div className="relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm">
  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone}`}/>
  <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">{label}</div><div className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</div>{detail&&<div className="mt-1 text-xs text-slate-500">{detail}</div>}</div>{Icon&&<div className="rounded-xl bg-slate-950 p-2.5 text-white shadow-lg"><Icon className="h-5 w-5"/></div>}</div>
 </div>
}

const Shell=({title,subtitle,children,badge})=><section className="overflow-hidden rounded-[26px] border bg-white shadow-sm">
 <div className="flex flex-col gap-2 border-b bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-6 py-5 text-white sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-sky-300">CaseCue Analytics</div><h3 className="mt-1 text-lg font-black">{title}</h3>{subtitle&&<p className="mt-1 text-xs text-slate-300">{subtitle}</p>}</div>{badge&&<div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider">{badge}</div>}</div>
 <div className="p-5">{children}</div>
</section>;

const Empty=()=> <div className="grid h-56 place-items-center rounded-2xl border border-dashed bg-slate-50 text-center"><div><BarChart3 className="mx-auto h-8 w-8 text-slate-300"/><div className="mt-2 text-sm font-bold text-slate-500">Not enough real data yet</div><div className="mt-1 text-xs text-slate-400">CaseCue will build this chart as records are saved.</div></div></div>;

const Tip=({active,payload,label})=>{
 if(!active||!payload?.length)return null;
 return <div className="rounded-xl border bg-white p-3 text-xs shadow-xl"><div className="font-black text-slate-900">{label}</div>{payload.map((p,i)=><div key={i} className="mt-1 flex items-center justify-between gap-5"><span className="text-slate-500">{p.name}</span><b>{p.value}</b></div>)}</div>;
};

export function PremiumBarChart({title,subtitle,data,dataKey,nameKey='name',badge,height=270,valueSuffix=''}) {
 return <Shell title={title} subtitle={subtitle} badge={badge}>{!data?.length?<Empty/>:<div style={{height}}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{top:10,right:8,left:-20,bottom:5}}><defs><linearGradient id="casecueBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb"/><stop offset="100%" stopColor="#38bdf8"/></linearGradient></defs><CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false}/><XAxis dataKey={nameKey} tick={{fontSize:10,fill:axis}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:axis}} axisLine={false} tickLine={false}/><Tooltip content={<Tip/>}/><Bar dataKey={dataKey} fill="url(#casecueBar)" radius={[8,8,2,2]} name={valueSuffix?dataKey+valueSuffix:dataKey}/></BarChart></ResponsiveContainer></div>}</Shell>
}

export function PremiumMultiBarChart({title,subtitle,data,keys=[],nameKey='name',badge,height=270}) {
 return <Shell title={title} subtitle={subtitle} badge={badge}>{!data?.length?<Empty/>:<div style={{height}}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{top:10,right:8,left:-20,bottom:5}}><CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false}/><XAxis dataKey={nameKey} tick={{fontSize:10,fill:axis}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:axis}} axisLine={false} tickLine={false}/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:10}}/>{keys.map((k,i)=><Bar key={k.key} dataKey={k.key} name={k.label||k.key} fill={k.color||PALETTE[i%PALETTE.length]} radius={[7,7,1,1]}/>)}</BarChart></ResponsiveContainer></div>}</Shell>
}

export function PremiumLineChart({title,subtitle,data,keys=[],nameKey='name',badge,height=270,area=false}) {
 const Chart=area?AreaChart:LineChart;
 return <Shell title={title} subtitle={subtitle} badge={badge}>{!data?.length?<Empty/>:<div style={{height}}><ResponsiveContainer width="100%" height="100%"><Chart data={data} margin={{top:10,right:10,left:-20,bottom:5}}>{area&&<defs>{keys.map((k,i)=><linearGradient key={k.key} id={`grad-${k.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={k.color||PALETTE[i%PALETTE.length]} stopOpacity={.35}/><stop offset="95%" stopColor={k.color||PALETTE[i%PALETTE.length]} stopOpacity={.02}/></linearGradient>)}</defs>}<CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false}/><XAxis dataKey={nameKey} tick={{fontSize:10,fill:axis}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:axis}} axisLine={false} tickLine={false}/><Tooltip content={<Tip/>}/><Legend wrapperStyle={{fontSize:10}}/>{keys.map((k,i)=>area?<Area key={k.key} type="monotone" dataKey={k.key} name={k.label||k.key} stroke={k.color||PALETTE[i%PALETTE.length]} fill={`url(#grad-${k.key})`} strokeWidth={3}/>:<Line key={k.key} type="monotone" dataKey={k.key} name={k.label||k.key} stroke={k.color||PALETTE[i%PALETTE.length]} strokeWidth={3} dot={{r:3}} activeDot={{r:5}}/> )}</Chart></ResponsiveContainer></div>}</Shell>
}

export function PremiumDonutChart({title,subtitle,data,badge,height=270,centerLabel}) {
 const total=(data||[]).reduce((n,x)=>n+Number(x.value||0),0);
 return <Shell title={title} subtitle={subtitle} badge={badge}>{!data?.some(x=>Number(x.value)>0)?<Empty/>:<div className="relative" style={{height}}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={3} strokeWidth={0}>{data.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}</Pie><Tooltip content={<Tip/>}/><Legend verticalAlign="bottom" wrapperStyle={{fontSize:10}}/></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center pb-7 text-center"><div><div className="text-3xl font-black">{centerLabel??total}</div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">total</div></div></div></div>}</Shell>
}

export function AnalyticsHero({title,subtitle,children}){
 return <section className="overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-7 text-white shadow-xl"><div className="flex items-start justify-between gap-5"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-sky-300">CaseCue Intelligence</div><h2 className="mt-2 text-2xl font-black">{title}</h2><p className="mt-2 max-w-2xl text-sm text-slate-300">{subtitle}</p></div><div className="rounded-2xl border border-white/10 bg-white/10 p-3"><ArrowUpRight className="h-6 w-6 text-sky-300"/></div></div>{children}</section>
}
