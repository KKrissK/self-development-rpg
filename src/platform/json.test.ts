import { describe, expect, it } from 'vitest'
import { extractJsonObject } from './json'

describe('AI JSON extraction', () => {
  it('keeps only the complete object inside commentary and Markdown', () => {
    const raw = 'Persze, itt az eredmény:\n```json\n{"schemaVersion":1,"summary":"Kész"}\n```\nRemélem, segít!'
    expect(extractJsonObject(raw)).toBe('{"schemaVersion":1,"summary":"Kész"}')
  })

  it('does not treat braces inside quoted strings as object boundaries', () => {
    const raw = 'Answer: {"schemaVersion":1,"summary":"Use {one} example and say \\"ok\\"."} Thanks'
    expect(JSON.parse(extractJsonObject(raw))).toEqual({ schemaVersion: 1, summary: 'Use {one} example and say "ok".' })
  })

  it('prefers the full response over a smaller object in surrounding text', () => {
    const raw = 'Example {"ignore":true}. Final: {"schemaVersion":1,"recommendations":[{"title":"A","kind":"advice"}]}'
    expect(JSON.parse(extractJsonObject(raw))).toHaveProperty('schemaVersion', 1)
  })
})
