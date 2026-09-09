import React, { useState } from "react";
import { Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const ACKNOWLEDGEMENTS = [
  "I understand this document contains AI-generated content.",
  "I have reviewed the content for accuracy and completeness.",
  "I understand all educational decisions remain the responsibility of qualified educational personnel.",
  "I understand this document may require further review prior to official use.",
];

// Required acknowledgement gate before any AI-assisted document can be
// downloaded or exported. Wrap the existing export button as a child — its
// onClick is replaced by this gate, and onExport runs only after all four
// acknowledgements are checked:
//   <ExportGate documentName="IEP draft" onExport={() => exportIepWorkspacePdf(...)}>
//     <Button variant="outline"><Download /> Export</Button>
//   </ExportGate>
export default function ExportGate({ documentName, onExport, children, label = "Export" }) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState([false, false, false, false]);
  const allChecked = checked.every(Boolean);

  const proceed = () => {
    setOpen(false);
    setChecked([false, false, false, false]);
    onExport();
  };

  const trigger = children
    ? React.cloneElement(children, { onClick: () => setOpen(true) })
    : (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Download className="h-3.5 w-3.5 mr-1" /> {label}
      </Button>
    );

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Before exporting{documentName ? ` — ${documentName}` : ""}</DialogTitle>
            <DialogDescription>
              This document contains AI-generated content. Please acknowledge each statement to continue with the export.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {ACKNOWLEDGEMENTS.map((text, i) => (
              <label key={i} className="flex items-start gap-3 text-sm cursor-pointer">
                <Checkbox
                  checked={checked[i]}
                  onCheckedChange={(v) => setChecked(checked.map((c, j) => (j === i ? !!v : c)))}
                  className="mt-0.5"
                />
                <span>{text}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="brand-gradient text-white" disabled={!allChecked} onClick={proceed}>
              Continue Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}