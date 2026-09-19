import React, { useId } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { sortStudentsByName } from "@/lib/studentSort";

/**
 * CaseCue standard Student Selector — the ONE component used everywhere a
 * single student is picked from a dropdown.
 *
 * Students are ordered like a school roster: last name A-Z, then first name A-Z.
 * The visible label remains First Last unless a custom nameOf function is supplied.
 */
export default function StudentSelector({
  students = [],
  value,
  onChange,
  label = "Student",
  placeholder = "Select a student…",
  helpText,
  required = false,
  disabled = false,
  id,
  className,
  wrapperClassName,
  noBottomSpace = false,
  nameOf,
}) {
  const autoId = useId();
  const selectId = id || `student-select-${autoId}`;
  const labelFn = nameOf || ((s) => `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unnamed student");
  const sortedStudents = nameOf
    ? [...(students || [])].sort((a, b) => labelFn(a).localeCompare(labelFn(b), undefined, { sensitivity: "base", numeric: true }))
    : sortStudentsByName(students || []);

  return (
    <div className={cn("w-full max-w-[480px]", !noBottomSpace && "mb-5", wrapperClassName)}>
      <Label htmlFor={selectId} className="block text-left font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5" aria-hidden="true">*</span>}
      </Label>
      <select
        id={selectId}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-required={required || undefined}
        className={cn(
          "mt-2 w-full min-h-[44px] rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        <option value="">{placeholder}</option>
        {sortedStudents.map((s) => (
          <option key={s.id} value={s.id}>
            {labelFn(s)}
          </option>
        ))}
      </select>
      {helpText && <p className="mt-1.5 text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}