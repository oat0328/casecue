import React,{useEffect,useMemo,useState}from'react';
import{Pause,Play,RotateCcw,TimerReset,Flag}from'lucide-react';
import{Button}from'@/components/ui/button';

const keyFor=w=>`casecue_timer_${w||'workspace'}`;
const read=w=>{try{return JSON.parse(localStorage.getItem(keyFor(w))||'null')}catch{return null}};
const fmt=n=>{const s=Math.max(0,Math.floor(n/1000)),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return h>0?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`};

export default function WorkspaceTimer({workspaceKey='workspace',compact=false}){
 const initial=useMemo(()=>read(workspaceKey)||{elapsed:0,running:false,startedAt:null,laps:[]},[workspaceKey]);
 const[state,setState]=useState(initial),[now,setNow]=useState(Date.now());
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(t)},[]);
 useEffect(()=>{localStorage.setItem(keyFor(workspaceKey),JSON.stringify(state))},[workspaceKey,state]);
 const elapsed=state.elapsed+(state.running&&state.startedAt?Math.max(0,now-state.startedAt):0);
 const start=()=>setState(s=>s.running?s:{...s,running:true,startedAt:Date.now()});
 const pause=()=>setState(s=>!s.running?s:{...s,elapsed:s.elapsed+Math.max(0,Date.now()-(s.startedAt||Date.now())),running:false,startedAt:null});
 const reset=()=>setState({elapsed:0,running:false,startedAt:null,laps:[]});
 const lap=()=>setState(s=>({...s,laps:[{at:new Date().toISOString(),elapsed:s.elapsed+(s.running&&s.startedAt?Date.now()-s.startedAt:0)},...(s.laps||[])].slice(0,8)}));

 if(compact)return <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
  <TimerReset className="h-4 w-4 text-blue-700"/>
  <span className="min-w-[54px] font-mono text-sm font-black tabular-nums">{fmt(elapsed)}</span>
  <button type="button" onClick={state.running?pause:start} className="grid h-7 w-7 place-items-center rounded-lg bg-slate-950 text-white" aria-label={state.running?'Pause timer':'Start timer'}>{state.running?<Pause className="h-3.5 w-3.5"/>:<Play className="h-3.5 w-3.5"/>}</button>
  <button type="button" onClick={reset} className="grid h-7 w-7 place-items-center rounded-lg border bg-white text-slate-600" aria-label="Reset timer"><RotateCcw className="h-3.5 w-3.5"/></button>
 </div>;

 return <div className="rounded-2xl border bg-white p-5 shadow-sm">
  <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-wider text-blue-700">Workspace Timer</div><div className="mt-2 font-mono text-4xl font-black tabular-nums">{fmt(elapsed)}</div><div className="mt-1 text-xs text-slate-500">Use for fluency, trials, observations, service minutes, stations, or timed work.</div></div><TimerReset className="h-7 w-7 text-blue-700"/></div>
  <div className="mt-4 flex flex-wrap gap-2"><Button onClick={state.running?pause:start}>{state.running?<><Pause className="mr-2 h-4 w-4"/>Pause</>:<><Play className="mr-2 h-4 w-4"/>Start</>}</Button><Button variant="outline" onClick={lap} disabled={!elapsed}><Flag className="mr-2 h-4 w-4"/>Mark</Button><Button variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4"/>Reset</Button></div>
  {(state.laps||[]).length>0&&<div className="mt-4 space-y-1">{state.laps.map((l,i)=><div key={l.at} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"><span>Mark {state.laps.length-i}</span><b className="font-mono">{fmt(l.elapsed)}</b></div>)}</div>}
 </div>;
}
