import React from "react";
import { Lock } from "lucide-react";

// FERPA authorization notice shown directly above the Upload Center — the
// single upload point for student records in the app.
export default function FerpaUploadNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3.5 text-sm">
      <Lock className="h-4 w-4 mt-0.5 text-primary shrink-0" />
      <div>
        <div className="font-semibold text-primary">Protected Student Information</div>
        <p className="text-muted-foreground mt-1">
          By uploading records you confirm you are authorized to access and use these educational records.
          Documents may contain protected student information.
          All uploads, exports, edits, and record access may be logged for security and auditing purposes.
        </p>
      </div>
    </div>
  );
}