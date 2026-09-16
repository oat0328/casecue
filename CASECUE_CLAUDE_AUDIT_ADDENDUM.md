# CaseCue Claude Audit Addendum — Student Gradebook Rollup

Add this requirement to the master production audit and repair plan.

## Gradebook Rollup Requirement

Individual assignments are evidence records, not the primary Gradebook presentation.

Build and audit a student-centered **Gradebook Folder**. The main Gradebook should be clean and organized alphabetically by student. Opening a student should show subject-level performance first, with individual assignments available as drill-down evidence.

### Required subject rollups

At minimum support:
- Math
- Reading
- Writing

Normalize appropriate assignments into these instructional areas without silently misclassifying ambiguous work. When classification is uncertain, require teacher review.

For each subject show:
- Overall percentage
- Configurable letter grade (A/B/C/D/F or organization-defined scale)
- Quantitative performance data, preserving correct/total when available
- Decimal representation where appropriate, e.g. 4/5 = 0.80 = 80%
- Qualitative performance narrative
- Number of included assignments/work samples
- IEP goal connections
- Evidence strength/status
- Resource performance trend
- Gen Ed grade context when available and genuinely comparable
- Original work access
- Original IEP access

### Calculation integrity

The subject rollup must use a documented, deterministic calculation method. Do not silently average:
- missing assignments unless policy explicitly says to
- ungraded work
- invalid scores
- non-comparable records
- qualitative-only evidence
- duplicate/superseded evidence
- classroom grades into formal IEP progress

Every calculated subject grade must be traceable to the exact records included in the calculation.

If weighted categories are supported, weights must be visible/configurable. Otherwise clearly state that the subject percentage is based on the configured calculation method. Never invent weighting.

### Drill-down

Clicking Math, Reading, or Writing should open the underlying evidence, including:
- assignment title/date
- earned/possible
- percentage
- quantitative note
- qualitative note
- linked IEP goal
- evidence classification
- View Work
- View IEP

The teacher must be able to exclude an incorrectly classified item from a subject rollup without deleting the original evidence record.

### Premium graphs

Each student Gradebook Folder should provide meaningful graphs where data exists:
- Math performance over time
- Reading performance over time
- Writing performance over time
- subject comparison
- IEP-goal-aligned evidence trend
- weekly quantitative trend
- Resource vs Gen Ed trend only when the measurements are sufficiently comparable

Charts must be based on real stored records, have empty/loading/error states, accessible labels/tooltips, and traceable source data. No decorative or fake analytics.

### Parent / Gen Ed presentation

Provide a clean report view suitable for sharing in meetings with families and Gen Ed staff. Clearly distinguish:
- Resource classroom performance
- Gen Ed classroom grade context
- IEP progress/evidence
- service/session information

Do not present these as interchangeable measures.

### Definition of done

Prove this chain with automated and end-to-end tests:

Individual graded work → subject classification → teacher correction when needed → valid inclusion/exclusion → subject rollup calculation → letter grade → quantitative summary → qualitative summary → graph → drill-down → View Work → View IEP → parent/Gen Ed report.

A list of assignment cards is NOT considered a finished Gradebook.