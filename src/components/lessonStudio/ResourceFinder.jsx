import React, { useState } from "react";
import { Library, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const inputCls = "w-full h-11 rounded-lg border border-input bg-background px-3 text-base";
const labelCls = "block text-sm font-medium mb-2";

// Trusted teacher-resource sites. CaseCue only ever LINKS OUT — it never
// scrapes, downloads, copies, or redistrib copyrighted material, and it never
// bypasses subscriptions or paywalls.
const RESOURCE_SITES = [
  { name: "Education.com", url: "https://www.education.com" },
  { name: "Super Teacher Worksheets", url: "https://www.superteacherworksheets.com" },
  { name: "Math-Drills", url: "https://www.math-drills.com" },
  { name: "Khan Academy", url: "https://www.khanacademy.org" },
  { name: "ReadWorks", url: "https://www.readworks.org" },
  { name: "CommonLit", url: "https://www.commonlit.org" },
  { name: "Newsela", url: "https://newsela.com" },
  { name: "IXL", url: "https://www.ixl.com" },
  { name: "CK-12", url: "https://www.ck12.org" },
  { name: "OER Commons", url: "https://www.oercommons.org" },
  { name: "OpenStax", url: "https://openstax.org" },
  { name: "Illustrative Mathematics", url: "https://illustrativemathematics.org" },
  { name: "Desmos Classroom", url: "https://teacher.desmos.com" },
  { name: "PhET", url: "https://phet.colorado.edu" },
  { name: "PBS LearningMedia", url: "https://www.pbslearningmedia.org" },
  { name: "NASA STEM", url: "https://www.nasa.gov/stem" },
  { name: "Teachers Pay Teachers", url: "https://www.teacherspayteachers.com" },
];

const LICENSING_OPTIONS = [
  "Openly licensed (OER)",
  "Free, no account needed",
  "Free with account",
  "Subscription / paid",
  "Unknown — verify on the provider's site",
];

// Step 2 helper — searchable resource finder with safe link-outs, plus saving a
// resource link to the lesson with subject / grade / skill / licensing notes.
export default function ResourceFinder({ resources, onChange }) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [site, setSite] = useState(RESOURCE_SITES[3].name);
  const [form, setForm] = useState({ url: "", label: "", subject: "", grade: "", skill: "", licensing: LICENSING_OPTIONS[4] });

  const searchOn = (siteName) => {
    const s = RESOURCE_SITES.find((x) => x.name === siteName);
    if (!s) return;
    const q = query.trim();
    const target = q
      ? `https://www.google.com/search?q=${encodeURIComponent(`site:${new URL(s.url).hostname} ${q}`)}`
      : s.url;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const searchAll = () => {
    const q = query.trim() || "lesson resources";
    window.open(`https://www.google.com/search?q=${encodeURIComponent(`${q} teaching resource`)}`, "_blank", "noopener,noreferrer");
  };

  const save = () => {
    if (!/^https?:\/\//i.test(form.url.trim())) {
      toast({ title: "Paste the resource link first", description: "The link must start with http:// or https://", variant: "destructive" });
      return;
    }
    onChange([...(resources || []), {
      url: form.url.trim(),
      label: form.label.trim(),
      site: RESOURCE_SITES.find((x) => form.url.includes(new URL(x.url).hostname))?.name || "",
      subject: form.subject.trim(),
      grade: form.grade.trim(),
      skill: form.skill.trim(),
      licensing: form.licensing,
      added_at: new Date().toISOString(),
    }]);
    setForm({ url: "", label: "", subject: "", grade: "", skill: "", licensing: LICENSING_OPTIONS[4] });
    toast({ title: "Resource link saved to the lesson", description: "For subscription resources, CaseCue links to the original provider only." });
  };

  return (
    <Card className="p-5 sm:p-6">
      <h3 className="font-semibold flex items-center gap-2 mb-1"><Library className="h-4 w-4 text-primary" /> Resource finder</h3>
      <p className="text-xs text-muted-foreground mb-4">
        CaseCue links out to trusted education sites — it never scrapes, downloads, copies, or redistributes copyrighted material, and never bypasses subscriptions or paywalls. Subscription resources always open on the original provider's site.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls} htmlFor="rf-query">Search for</label>
          <input id="rf-query" className={inputCls} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. fractions word problems grade 3" />
        </div>
        <div>
          <label className={labelCls} htmlFor="rf-site">Site</label>
          <select id="rf-site" className={inputCls} value={site} onChange={(e) => setSite(e.target.value)}>
            {RESOURCE_SITES.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        <Button onClick={() => searchOn(site)} className="h-11">
          <ExternalLink className="h-4 w-4 mr-1" /> Search {site}
        </Button>
        <Button variant="outline" onClick={searchAll} className="h-11">Search all sites</Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {RESOURCE_SITES.map((s) => (
          <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
            className="text-xs rounded-full border border-border px-3 py-1.5 hover:bg-accent">
            {s.name}
          </a>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-sm font-medium mb-4">Save a resource link to this lesson</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="rf-url">Resource URL</label>
            <input id="rf-url" className={inputCls} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" inputMode="url" />
          </div>
          <div>
            <label className={labelCls} htmlFor="rf-label">Label</label>
            <input id="rf-label" className={inputCls} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Khan Academy: nouns intro" />
          </div>
          <div>
            <label className={labelCls} htmlFor="rf-subject">Subject</label>
            <input id="rf-subject" className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="rf-grade">Grade</label>
            <input id="rf-grade" className={inputCls} value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
          </div>
          <div>
            <label className={labelCls} htmlFor="rf-skill">Skill</label>
            <input id="rf-skill" className={inputCls} value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="rf-licensing">Licensing status</label>
            <select id="rf-licensing" className={inputCls} value={form.licensing} onChange={(e) => setForm({ ...form, licensing: e.target.value })}>
              {LICENSING_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <Button onClick={save} className="brand-gradient text-white h-11 px-6 mt-6">
          <Plus className="h-4 w-4 mr-2" /> Save link to lesson
        </Button>
      </div>

      {(resources || []).length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-sm font-medium">Saved resource links</p>
          {resources.map((r, i) => (
            <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3">
              <div className="min-w-0 text-sm">
                <p className="font-medium truncate">{r.label || r.url}</p>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary break-all">{r.url}</a>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[r.site, r.subject, r.grade, r.skill].filter(Boolean).join(" · ")} — {r.licensing}
                </p>
              </div>
              <button aria-label="Remove resource" className="p-2 rounded-lg hover:bg-muted shrink-0"
                onClick={() => onChange(resources.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4 text-rose-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}