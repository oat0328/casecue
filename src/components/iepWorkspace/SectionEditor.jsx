import React, { useState } from "react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Pencil, ThumbsUp, ThumbsDown } from "lucide-react";

const STATUS_CHIP = {
  draft: "bg-muted text-muted-foreground border-border",
  edited: "bg-blue-50 text-blue-700 border-blue-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function SectionEditor({ section, onChange }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(section.content);
  const status = section.status || "draft";

  const commit = () => { onChange({ content: text, status: "edited" }); setEditing(false); };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="font-semibold text-sm">{section.title}</h4>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CHIP[status]}`}>{status}</span>
      </div>

      {editing ? (
        <div className="mt-3">
          <textarea
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed"
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={commit}>Save edits</Button>
            <Button size="sm" variant="outline" onClick={() => { setText(section.content); setEditing(false); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">{section.content}</div>
      )}

      {Array.isArray(section.citations) && section.citations.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">Sources: {section.citations.join("; ")}</p>
      )}

      <div className="flex gap-2 mt-3">
        {!editing && (
          <Button size="sm" variant="outline" onClick={() => { setText(section.content); setEditing(true); }}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        )}
        <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200" disabled={status === "approved"} onClick={() => onChange({ status: "approved" })}>
          <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Approve
        </Button>
        <Button size="sm" variant="ghost" className="text-rose-600" disabled={status === "rejected"} onClick={() => onChange({ status: "rejected" })}>
          <ThumbsDown className="h-3.5 w-3.5 mr-1" /> Reject
        </Button>
      </div>
    </Card>
  );
}