import React,{useEffect,useMemo,useState} from "react";
import { ShieldCheck, BadgeCheck, GripVertical, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { LESSON_HEADER_FIELDS, LESSON_GROUPS, SPECIAL_ACCOMMODATION_KEY } from "@/lib/lessonPlanSchema";

const inputCls = "w-full h-11 rounded-lg border border-input bg-background px-3 text-base";
const textCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium mb-2";
const ORDER_KEY = "casecue.lessonStudio.sectionOrder.v1";

// Editable rendering of the full structured plan: header fields, every section,
// and the accommodations block with verified IEP accommodations kept separate
// from System suggestions.
export default function PlanEditor({ plan, onChange, verifiedAccommodations = [] }) {
  if (!plan) return null;
  const set = (key, value) => onChange({ ...plan, [key]: value });
  const defaults = useMemo(() => LESSON_GROUPS.map(g => g.title), []);
  const [order, setOrder] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
      return [...saved.filter(x => defaults.includes(x)), ...defaults.filter(x => !saved.includes(x))];
    } catch { return defaults; }
  });
  const [dragged, setDragged] = useState(null);
  useEffect(() => { localStorage.setItem(ORDER_KEY, JSON.stringify(order)); }, [order]);
  const groups = order.map(title => LESSON_GROUPS.find(g => g.title === title)).filter(Boolean);
  const dropOn = (target) => {
    if (!dragged || dragged === target) return setDragged(null);
    setOrder(items => {
      const next = items.filter(x => x !== dragged);
      const index = next.indexOf(target);
      next.splice(index, 0, dragged);
      return next;
    });
    setDragged(null);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h3 className="font-semibold mb-4">Lesson header</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {LESSON_HEADER_FIELDS.map((f) => (
            <div key={f.key}>
              <label className={labelCls} htmlFor={`pe-${f.key}`}>{f.label}</label>
              <input id={`pe-${f.key}`} className={inputCls} value={plan[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} />
            </div>
          ))}
        </div>
      </Card>

      <div className="rounded-2xl border border-dashed border-blue-300 bg-blue-50/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-black text-blue-950">Drag &amp; drop lesson builder</p><p className="text-sm text-blue-800">Grab any section by the handle and move it into the order you want. Your layout is remembered.</p></div>
          <Button type="button" size="sm" variant="outline" onClick={() => setOrder(defaults)}><RotateCcw className="mr-1 h-4 w-4" />Reset order</Button>
        </div>
      </div>

      {groups.map((group) => (
        <Card key={group.title} draggable onDragStart={(e) => { setDragged(group.title); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setDragged(null)} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }} onDrop={(e) => { e.preventDefault(); dropOn(group.title); }} className={`p-5 sm:p-6 transition ${dragged === group.title ? "opacity-50 ring-2 ring-blue-300" : "hover:border-blue-200"}`}>
          <div className="mb-4 flex items-center gap-3 cursor-grab active:cursor-grabbing select-none">
            <span className="grid h-9 w-9 place-items-center rounded-xl border bg-slate-50 text-slate-500" title="Drag to reorder"><GripVertical className="h-5 w-5" /></span>
            <div><h3 className="font-semibold">{group.title}</h3><p className="text-xs text-muted-foreground">Drag this section to reorder your lesson plan.</p></div>
          </div>
          <div className="grid grid-cols-1 gap-5">
            {group.fields.map((f) => (
              <div key={f.key}>
                <label className={labelCls} htmlFor={`pe-${f.key}`}>{f.label}</label>
                <textarea id={`pe-${f.key}`} className={textCls} rows={f.rows} value={plan[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} />
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card className="p-5 sm:p-6 border-amber-200">
        <h3 className="font-semibold mb-3">Accommodations &amp; modifications</h3>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 mb-5">
          <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
            <BadgeCheck className="h-4 w-4" /> Verified from student records
          </p>
          <p className="text-xs text-emerald-700 mt-1 mb-3">
            These are the accommodations documented on the selected students' records. CaseCue never changes a student's IEP, goal, service, placement, or accommodation.
          </p>
          {verifiedAccommodations.length > 0 ? (
            <ul className="space-y-2">
              {verifiedAccommodations.map((a, i) => (
                <li key={i} className="text-sm">
                  <strong>{a.student}:</strong> <span className="whitespace-pre-wrap">{a.accommodations}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-emerald-700">No students selected — accommodations will come from the IEP.</p>
          )}
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Suggested accommodations
          </p>
          <p className="text-xs text-amber-700 mt-1 mb-3">
            <strong>Only use accommodations documented in the student's IEP.</strong> The suggestions below are ideas to review against the IEP — never IEP-mandated.
          </p>
          <label className={labelCls} htmlFor={`pe-${SPECIAL_ACCOMMODATION_KEY}`}>Suggested accommodations (editable)</label>
          <textarea id={`pe-${SPECIAL_ACCOMMODATION_KEY}`} className={textCls} rows={4}
            value={plan[SPECIAL_ACCOMMODATION_KEY] || ""} onChange={(e) => set(SPECIAL_ACCOMMODATION_KEY, e.target.value)} />
        </div>
      </Card>
    </div>
  );
}