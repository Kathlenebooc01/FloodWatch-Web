import test from 'node:test'
import assert from 'node:assert/strict'
import { formatIncidentDescription } from '../src/lib/reports/formatIncidentDescription.mjs'

test('separates a tagged citizen report into readable fields', () => {
  assert.deepEqual(
    formatIncidentDescription('[MODERATE REPORT] Subject: Flooded Road Observations: final Location: Buaya, Lapu-Lapu City'),
    {
      reportType: 'Moderate Report',
      text: '',
      fields: [
        { label: 'Subject', value: 'Flooded Road' },
        { label: 'Observations', value: 'final' },
        { label: 'Location', value: 'Buaya, Lapu-Lapu City' },
      ],
    }
  )
})

test('formats QuickSnap and General Inquiry without changing untagged descriptions', () => {
  assert.equal(formatIncidentDescription('[QuickSnap] Subject: Road').reportType, 'QuickSnap')
  assert.equal(formatIncidentDescription('[GENERAL INQUIRY] Question about flooding').reportType, 'General Inquiry')
  assert.deepEqual(formatIncidentDescription('A plain incident description'), {
    reportType: null,
    fields: [],
    text: 'A plain incident description',
  })
})
