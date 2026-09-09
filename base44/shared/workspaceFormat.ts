// Shared formatting of IEP workspace objects into compact text blocks for
// backend LLM prompts. Used by iepWorkspaceReview and generateMeetingCheatSheet.

export function formatDraftSections(draft = {}) {
  return (draft.sections || [])
    .map((s) => `## ${s.title} [${s.status || 'draft'}]\n${s.content}`)
    .join('\n\n');
}

export function formatDraftGoals(draft = {}) {
  return (draft.goals || [])
    .map((g, i) =>
      `Goal ${i + 1} [${g.status || 'draft'}]: ${g.goal_area || 'General'} — ${g.conditions || ''} ${g.action || ''} | Baseline: ${g.baseline || 'MISSING'} | Target: ${g.target || 'MISSING'} | Criterion: ${g.criterion || 'MISSING'} | Measurement: ${g.measurement_method || 'MISSING'} | Schedule: ${g.data_schedule || 'MISSING'}`)
    .join('\n');
}

export function formatDraftAccommodations(draft = {}) {
  return (draft.accommodations || [])
    .map((a) => `- ${a.accommodation} [${a.change_type}] need: ${a.need_addressed || '—'} source: ${a.source || '—'}`)
    .join('\n');
}

export function formatDraftServices(draft = {}) {
  return (draft.services || [])
    .map((s) =>
      `- ${s.service}: ${s.minutes_per_session ?? '?'} min x ${s.sessions_per_week ?? '?'}/wk, ${s.delivery || '?'} ${s.service_type || 'direct'}, provider: ${s.provider || '—'}, need: ${s.need_or_goal || '—'}`)
    .join('\n');
}

export function unresolvedDecisions(draft = {}) {
  return (draft.unresolved_decisions || []).join('; ');
}

export function formatPlacement(placement = {}) {
  return placement.instructional_minutes_per_day
    ? `Placement worksheet (teacher inputs, for team verification): instructional ${placement.instructional_minutes_per_day}/day x ${placement.instructional_days_per_week} days; inside GE ${placement.minutes_inside_ge} min; outside GE ${placement.minutes_outside_ge} min.`
    : 'Placement worksheet: not completed yet.';
}

export function formatReviewFindings(review = {}, limit = 12) {
  return (review.findings || []).slice(0, limit)
    .map((f) => `- [${f.level}] ${f.title}: ${f.what_found}`)
    .join('\n');
}