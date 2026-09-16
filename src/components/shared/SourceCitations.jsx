import React from "react";
import { FileSearch } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAsync } from "@/lib/useAsync";
import { cn } from "@/lib/utils";

// On-page source transparency: states exactly which uploaded documents and
// verified record fields an generated output was built from, without leaving the page.
export default function SourceCitations({ studentId, className }) {
  const { data: docs } = useAsync(
    () =>
      studentId
        ? base44.entities.Document.filter({ student_id: studentId }, "-date_uploaded", 20)
        : Promise.resolve([]),
    [studentId]
  );
  const processed = (docs || []).filter((d) => d.extraction_status === "processed");

  return (
    <div
      className={cn(
        "rounded-xl bg-muted/50 border border-border px-3.5 py-2.5 text-xs text-muted-foreground",
        className
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
        <FileSearch className="h-3.5 w-3.5 text-primary" /> Sources:
      </span>{" "}
      {processed.length > 0 ? (
        <>
          your verified student record (teacher-entered fields) and {processed.length} processed
          document{processed.length === 1 ? "" : "s"} on file: {processed.map((d) => d.filename).join(" · ")}
        </>
      ) : (
        <>your verified student record (teacher-entered fields) — no processed documents on file for this student yet</>
      )}
    </div>
  );
}