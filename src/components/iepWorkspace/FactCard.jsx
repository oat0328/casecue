import React, { useState } from "react";
import { Card } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X } from "lucide-react";

const CONF_STYLES = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function FactCard({ fact, onToggleVerified, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(fact.fact);
  const verified = !!fact.verified;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${CONF_STYLES[fact.confidence] || CONF_STYLES.medium}`}>
          {fact.confidence || "medium"} confidence
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${verified ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground border-border"}`}>
          {verified ? "Verified" : "Needs verification"}
        </span>
      </div>

      {editing ? (
        <div className="mt-3">
          <textarea
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => { onEdit(text); setEditing(false); }}><Check className="h-3.5 w-3.5 mr-1" /> Save</Button>
            <Button size="sm" variant="outline" onClick={() => { setText(fact.fact); setEditing(false); }}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm">{fact.fact}</p>
          {fact.excerpt && <p className="text-xs text-muted-foreground italic mt-2">“{fact.excerpt}”</p>}
          <p className="text-xs text-muted-foreground mt-1">Source: {fact.source_document} · p. {fact.page}{fact.category ? ` · ${fact.category}` : ""}</p>
        </>
      )}

      <div className="flex gap-2 mt-3">
        {!editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5 mr-1" /> Correct</Button>
        )}
        <Button
          size="sm"
          variant={verified ? "ghost" : "outline"}
          className={verified ? "text-emerald-600" : ""}
          onClick={onToggleVerified}
        >
          <Check className="h-3.5 w-3.5 mr-1" /> {verified ? "Unverify" : "Mark verified"}
        </Button>
      </div>
    </Card>
  );
}