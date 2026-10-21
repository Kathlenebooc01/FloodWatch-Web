const manilaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit'
});

export function manilaDate(value) {
  if (!value) return null;
  const parts = Object.fromEntries(manilaDay.formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function daysOverdue(value, now = new Date()) {
  const due = manilaDate(value);
  if (!due) return 0;
  const today = manilaDate(now);
  return Math.max(0, Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(due + 'T00:00:00Z')) / 86400000));
}

export function requestDueDate(items, allocations) {
  const dates = [...(items || []), ...(allocations || [])]
    .map(row => row.expected_return_date).filter(Boolean);
  return dates.length ? dates.sort((a, b) => new Date(b) - new Date(a))[0] : null;
}
