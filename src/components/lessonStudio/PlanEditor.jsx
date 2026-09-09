import React from "react";
import { ShieldCheck, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/cards";
import { LESSON_HEADER_FIELDS, LESSON_GROUPS, SPECIAL_ACCOMMODATION_KEY } from "@/lib/lessonPlanSchema";

const inputCls = "w-full h-11 rounded-lg border border-input bg-background px-3 text-base";
const textCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium mb-2";

// Editable rendering of the full structured plan: header fields, every section,
// and the accommodations block with verified IEP accommodations kept separate
// from AI suggestions.
export default function PlanEditor({ plan, onChange, verifiedAccommodations = [] }) {
  if (!plan) return null;
  const set = (key, value) => onChange({ ...plan, [key]: value });

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

      {LESSON_GROUPS.map((group) => (
        <Card key={group.title} className="p-5 sm:p-6">
          <h3 className="font-semibold mb-4">{group.title}</h3>
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
            <ShieldCheck className="h-4 w-4" /> AI-suggested accommodations
          </p>
          <p className="text-xs text-amber-700 mt-1 mb-3">
            <strong>Only use accommodations documented in the student's IEP.</strong> The suggestions below are ideas to review against the IEP — never IEP-mandated.
          </p>
          <label className={labelCls} htmlFor={`pe-${SPECIAL_ACCOMMODATION_KEY}`}>AI-suggested accommodations (editable)</label>
          <textarea id={`pe-${SPECIAL_ACCOMMODATION_KEY}`} className={textCls} rows={4}
            value={plan[SPECIAL_ACCOMMODATION_KEY] || ""} onChange={(e) => set(SPECIAL_ACCOMMODATION_KEY, e.target.value)} />
        </div>
      </Card>
    </div>
  );
}