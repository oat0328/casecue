import React from 'react';
import { Card } from '@/components/ui/cards';
import { Button } from '@/components/ui/button';
import { Database, FileCheck2, ArrowRightLeft, ShieldCheck, ClipboardCopy, UploadCloud } from 'lucide-react';

const SOURCES = [
  ['School / SIS data', 'Roster, schedule, attendance, Gen Ed grades and teachers'],
  ['CaseCue SPED data', 'Current goals, progress monitoring, sessions, service data and evidence'],
  ['Team input', 'Teacher, parent, meeting and observation information'],
  ['IEP record', 'Current IEP, evaluations, accommodations, services and uploaded documents'],
];

export default function IEPReadyBridge({ student }) {
  const name = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || 'Student';
  return <div className="space-y-5">
    <Card className="p-6 border-blue-200 bg-gradient-to-br from-white to-blue-50/60">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-blue-700 text-sm font-bold"><FileCheck2 className="h-5 w-5"/>IEP Ready</div>
          <h2 className="text-2xl font-extrabold mt-1">{name} · Evidence-to-IEP workspace</h2>
          <p className="text-sm text-slate-600 mt-2 max-w-3xl">Bring authorized school data and CaseCue SPED evidence together, draft the IEP in CaseCue, review every source, then move the approved information back to the district system using the transfer method your school supports.</p>
        </div>
        <div className="rounded-xl border bg-white px-4 py-3 text-xs text-slate-600 max-w-sm"><ShieldCheck className="h-4 w-4 text-emerald-600 inline mr-1"/>CaseCue never silently changes an official SIS or IEP record. Review and educator approval stay required.</div>
      </div>
    </Card>

    <div className="grid md:grid-cols-2 gap-4">{SOURCES.map(([title,desc])=><Card key={title} className="p-5"><div className="flex gap-3"><div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center"><Database className="h-5 w-5 text-blue-700"/></div><div><div className="font-bold">{title}</div><p className="text-sm text-slate-500 mt-1">{desc}</p></div></div></Card>)}</div>

    <Card className="p-6">
      <h3 className="font-extrabold text-lg">District / Infinite Campus Bridge</h3>
      <p className="text-sm text-slate-500 mt-1">Use the safest available path for the district. Direct synchronization appears only when the organization has an authorized integration configured.</p>
      <div className="grid md:grid-cols-3 gap-3 mt-5">
        <div className="rounded-xl border p-4"><ClipboardCopy className="h-5 w-5 text-blue-700"/><div className="font-bold mt-2">Copy by IEP Section</div><p className="text-xs text-slate-500 mt-1">Copy reviewed present levels, goals, accommodations and other approved draft sections into the district system.</p><Button variant="outline" className="mt-3 w-full" disabled>Available from completed drafts</Button></div>
        <div className="rounded-xl border p-4"><UploadCloud className="h-5 w-5 text-indigo-700"/><div className="font-bold mt-2">Export Transfer Packet</div><p className="text-xs text-slate-500 mt-1">Create a district-ready packet organized by IEP section for educator verification and transfer.</p><Button variant="outline" className="mt-3 w-full" disabled>Build after IEP review</Button></div>
        <div className="rounded-xl border p-4"><ArrowRightLeft className="h-5 w-5 text-emerald-700"/><div className="font-bold mt-2">Authorized SIS Sync</div><p className="text-xs text-slate-500 mt-1">Future/direct connector for districts that provide approved API access and permissions.</p><Button variant="outline" className="mt-3 w-full" disabled>Integration required</Button></div>
      </div>
    </Card>

    <Card className="p-6">
      <h3 className="font-extrabold text-lg">Source Trace</h3>
      <p className="text-sm text-slate-500 mt-1">Every generated statement should be traceable to the record that supports it: progress probe, Gen Ed grade, attendance record, work sample, teacher input, session or uploaded evaluation. Gen Ed grades remain contextual evidence and never automatically become IEP goal mastery.</p>
    </Card>
  </div>;
}
