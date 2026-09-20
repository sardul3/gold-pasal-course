import { beforeEach, describe, expect, it } from 'vitest'

import {
  createEmptyProgress,
  exportProgress,
  importProgress,
  loadProgress,
  saveProgress,
  setLessonState,
} from '../.vitepress/theme/progress'

describe('learner progress', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('given a practiced lesson, persists the state without claiming proven', () => {
    const progress = setLessonState(createEmptyProgress(), 'r1-03', 'practiced')

    saveProgress(progress)

    expect(loadProgress().lessons['r1-03']?.state).toBe('practiced')
    expect(loadProgress().lessons['r1-03']?.evidence).toEqual([])
  })

  it('given evidence, allows the lesson to be marked proven', () => {
    const progress = setLessonState(createEmptyProgress(), 'r3-10', 'proven', [
      {
        kind: 'ci-run',
        url: 'https://github.com/example/gold-pasal/actions/runs/42',
        note: 'HTTP slice checks',
      },
    ])

    expect(progress.lessons['r3-10']?.state).toBe('proven')
  })

  it('given no evidence, rejects a proven claim', () => {
    expect(() =>
      setLessonState(createEmptyProgress(), 'r3-10', 'proven'),
    ).toThrow('Proven lessons require evidence')
  })

  it('round-trips an exported progress backup', () => {
    const progress = setLessonState(createEmptyProgress(), 'r0-01', 'read')

    expect(importProgress(exportProgress(progress))).toEqual(progress)
  })

  it('rejects progress from an unsupported schema version', () => {
    expect(() => importProgress('{"version":99,"lessons":{}}')).toThrow(
      'Unsupported progress version',
    )
  })

  it('rejects malformed nested lesson data and recovers local state', () => {
    expect(() =>
      importProgress('{"version":1,"lessons":null,"bookmarks":[]}'),
    ).toThrow('Invalid progress data')

    localStorage.setItem(
      'gold-pasal.progress.v1',
      '{"version":1,"lessons":{"r0-01":{"state":"invented"}},"bookmarks":[]}',
    )
    expect(loadProgress()).toEqual(createEmptyProgress())
  })

  it('rejects forged proven state, unknown lessons, and unsafe evidence links', () => {
    const base = {
      version: 1,
      bookmarks: [],
    }
    expect(() =>
      importProgress(
        JSON.stringify({
          ...base,
          lessons: {
            'r1-01': {
              state: 'proven',
              evidence: [],
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      ),
    ).toThrow('Invalid progress data')
    expect(() =>
      importProgress(
        JSON.stringify({
          ...base,
          lessons: {
            'unknown-lesson': {
              state: 'read',
              evidence: [],
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      ),
    ).toThrow('Invalid progress data')
    expect(() =>
      importProgress(
        JSON.stringify({
          ...base,
          lessons: {
            'r1-01': {
              state: 'proven',
              evidence: [
                { kind: 'commit', url: 'javascript:alert(1)', note: 'unsafe' },
              ],
              updatedAt: 'not-a-date',
            },
          },
        }),
      ),
    ).toThrow('Invalid progress data')
  })
})
