const REPORT_TYPES = {
  'moderate report': 'Moderate Report',
  quicksnap: 'QuickSnap',
  'quick snap': 'QuickSnap',
  'general inquiry': 'General Inquiry',
}

export function formatIncidentDescription(description) {
  const original = typeof description === 'string' ? description.trim() : ''
  const typeMatch = original.match(/^\[\s*(moderate report|quick\s?snap|general inquiry)\s*\]\s*/i)
  const reportType = typeMatch ? REPORT_TYPES[typeMatch[1].toLowerCase()] : null
  const body = typeMatch ? original.slice(typeMatch[0].length).trim() : original
  const labels = [...body.matchAll(/\b(Subject|Observations|Location):\s*/gi)]

  if (!reportType || labels.length === 0) {
    return { reportType, fields: [], text: body }
  }

  const fields = labels.map((match, index) => ({
    label: match[1][0].toUpperCase() + match[1].slice(1).toLowerCase(),
    value: body.slice(match.index + match[0].length, labels[index + 1]?.index ?? body.length).trim(),
  })).filter(({ value }) => value)
  const text = body.slice(0, labels[0].index).trim()

  return { reportType, fields, text }
}
