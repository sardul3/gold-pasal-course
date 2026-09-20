import { describe, expect, it } from 'vitest'

import { allLessons, releases } from '../.vitepress/theme/data/course'

describe('course metadata', () => {
  it('has a continuous release sequence from r0 through r13', () => {
    expect(releases.map(({ id }) => id)).toEqual(
      Array.from({ length: 14 }, (_, index) => `r${index}`),
    )
  })

  it('uses globally unique stable lesson ids', () => {
    const ids = allLessons.map(({ id }) => id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps R0 sidebar titles short enough to scan', () => {
    for (const lesson of releases[0].lessons) {
      expect(lesson.title.length).toBeLessThanOrEqual(32)
    }
  })

  it('ends every release with an evidence-bearing release gate', () => {
    for (const release of releases) {
      const gate = release.lessons.at(-1)

      expect(gate?.title).toMatch(/^Release gate:/)
      expect(gate?.evidence).toContain('demo')
    }
  })
})
