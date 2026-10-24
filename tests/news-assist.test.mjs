import assert from 'node:assert/strict'
import test from 'node:test'
import { generateNewsFields, NEWS_ASSIST_ERROR } from '../src/lib/lantaw/news-assist.mjs'

const attempts = [
  { model: 'primary', key: 'test-key' },
  { model: 'backup', key: 'test-key' },
]
const fields = { headline: 'Flooding Affects Cebu City Roads', detailedContent: 'Heavy rainfall caused flooding in Cebu City. Several roads are affected. Rescue teams are monitoring the area. No casualties have been reported.' }
const goodResponse = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(fields) }] } }] }), { status: 200 })

test('uses the primary model and returns editable report fields', async () => {
  const called = []
  const result = await generateNewsFields({ prompt: 'incident', existingFields: {}, attempts, fetchImpl: async (url, options) => {
    called.push(url)
    assert.equal(options.headers['x-goog-api-key'], 'test-key')
    assert.equal(JSON.parse(options.body).contents[0].parts[0].text, 'incident')
    return goodResponse()
  } })
  assert.equal(result.model, 'primary')
  assert.deepEqual(result.fields, fields)
  assert.equal(called.length, 1)
})

test('falls back when the primary model fails or returns unusable content', async () => {
  for (const primaryResponse of [new Response('', { status: 503 }), new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }), { status: 200 })]) {
    const called = []
    const result = await generateNewsFields({ prompt: 'incident', existingFields: {}, attempts, fetchImpl: async url => {
      called.push(url)
      return called.length === 1 ? primaryResponse : goodResponse()
    } })
    assert.equal(result.model, 'backup')
    assert.equal(called.length, 2)
  }
})

test('stops after all configured models fail', async () => {
  let count = 0
  await assert.rejects(generateNewsFields({ prompt: 'incident', existingFields: {}, attempts, fetchImpl: async () => {
    count++
    return new Response('', { status: 503 })
  } }), { message: NEWS_ASSIST_ERROR })
  assert.equal(count, 2)
})
