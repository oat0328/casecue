export const compareStudentsByName = (a = {}, b = {}) => {
  const last = String(a.last_name || '').trim().localeCompare(
    String(b.last_name || '').trim(),
    undefined,
    { sensitivity: 'base', numeric: true }
  );
  if (last !== 0) return last;

  const first = String(a.first_name || '').trim().localeCompare(
    String(b.first_name || '').trim(),
    undefined,
    { sensitivity: 'base', numeric: true }
  );
  if (first !== 0) return first;

  return String(a.student_id || a.id || '').localeCompare(
    String(b.student_id || b.id || ''),
    undefined,
    { sensitivity: 'base', numeric: true }
  );
};

export const sortStudentsByName = (students = []) => [...students].sort(compareStudentsByName);

export const sortStudentIdsByName = (ids = [], students = []) => {
  const byId = new Map((students || []).map((s) => [s.id, s]));
  return [...ids].sort((a, b) => {
    const sa = byId.get(a), sb = byId.get(b);
    if (sa && sb) return compareStudentsByName(sa, sb);
    if (sa) return -1;
    if (sb) return 1;
    return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
  });
};

export const studentSortKey = (student = {}) =>
  `${String(student.last_name || '').trim()}\u0000${String(student.first_name || '').trim()}`;
