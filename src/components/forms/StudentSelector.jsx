import React, { useId } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * CaseCue standard Student Selector — the ONE component used everywhere a
 * single student is picked from a dropdown.
 *
 * Spacing standard (applies everywhere it is used):
 * - Label sits ABOVE the dropdown, left-aligned, 8px (mt-2) above it
 * - 20px after the dropdown before the next field (mb-5), removable via noBottomSpace
 * - Dropdown: full width inside its container, max 480px on desktop, 100% on mobile,
 *   min height 44px, comfortable horizontal padding, vertically centered value
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
  nameOf, // optional (s) => string — custom option label
}) {
  const autoId = useId();
  const selectId = id || `student-select-${autoId}`;
  const labelFn = nameOf || ((s) => `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unnamed student");

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
        {(students || []).map((s) => (
          <option key={s.id} value={s.id}>
            {labelFn(s)}
          </option>
        ))}
      </select>
      {helpText && <p className="mt-1.5 text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}