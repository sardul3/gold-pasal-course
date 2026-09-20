import { describe, expect, it } from 'vitest'

import { validatePythonSnippet } from '../.vitepress/theme/python-runtime'

describe('python snippet bench', () => {
  it('rejects an empty snippet before loading the runtime', () => {
    expect(validatePythonSnippet('   ')).toEqual({
      ok: false,
      error: 'Write a small snippet first.',
    })
  })

  it('rejects a snippet that is too large for the bench', () => {
    expect(validatePythonSnippet('x' + 'y'.repeat(4000))).toEqual({
      ok: false,
      error: 'Keep the snippet under 4000 characters.',
    })
  })

  it('accepts a short printable snippet', () => {
    expect(validatePythonSnippet("print('0.1.0')")).toEqual({ ok: true })
  })
})
