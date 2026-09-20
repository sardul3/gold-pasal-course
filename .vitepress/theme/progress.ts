import { allLessons, type EvidenceKind } from './data/course'

export type LessonState = 'read' | 'practiced' | 'proven'

export interface EvidenceLink {
  kind: EvidenceKind
  url: string
  note: string
}

export interface LessonProgress {
  state: LessonState
  evidence: EvidenceLink[]
  updatedAt: string
}

export interface LearnerProgress {
  version: 1
  lessons: Record<string, LessonProgress>
  bookmarks: string[]
}

const STORAGE_KEY = 'gold-pasal.progress.v1'
const LESSON_IDS = new Set(allLessons.map(({ id }) => id))
const LESSON_STATES = new Set<LessonState>(['read', 'practiced', 'proven'])
const EVIDENCE_KINDS = new Set<EvidenceKind>([
  'commit',
  'pull-request',
  'ci-run',
  'adr',
  'runbook',
  'deployment',
  'evaluation',
  'demo',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isEvidence(value: unknown): value is EvidenceLink {
  return (
    isRecord(value) &&
    typeof value.kind === 'string' &&
    EVIDENCE_KINDS.has(value.kind as EvidenceKind) &&
    typeof value.url === 'string' &&
    value.url.startsWith('https://') &&
    typeof value.note === 'string' &&
    value.note.trim().length >= 3
  )
}

function isLessonProgress(value: unknown): value is LessonProgress {
  return (
    isRecord(value) &&
    typeof value.state === 'string' &&
    LESSON_STATES.has(value.state as LessonState) &&
    Array.isArray(value.evidence) &&
    value.evidence.every(isEvidence) &&
    (value.state !== 'proven' || value.evidence.length > 0) &&
    typeof value.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(value.updatedAt))
  )
}

function isLessonProgressRecord(
  value: unknown,
): value is Record<string, LessonProgress> {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([lessonId, lessonProgress]) =>
        LESSON_IDS.has(lessonId) && isLessonProgress(lessonProgress),
    )
  )
}

export function createEmptyProgress(): LearnerProgress {
  return {
    version: 1,
    lessons: {},
    bookmarks: [],
  }
}

export function setLessonState(
  progress: LearnerProgress,
  lessonId: string,
  state: LessonState,
  evidence: EvidenceLink[] = [],
): LearnerProgress {
  if (state === 'proven' && evidence.length === 0) {
    throw new Error('Proven lessons require evidence')
  }

  return {
    ...progress,
    lessons: {
      ...progress.lessons,
      [lessonId]: {
        state,
        evidence,
        updatedAt: new Date().toISOString(),
      },
    },
  }
}

export function saveProgress(progress: LearnerProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

export function loadProgress(): LearnerProgress {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === null) return createEmptyProgress()
  try {
    return importProgress(stored)
  } catch {
    return createEmptyProgress()
  }
}

export function exportProgress(progress: LearnerProgress): string {
  return JSON.stringify(progress, null, 2)
}

export function importProgress(value: string): LearnerProgress {
  const parsed: unknown = JSON.parse(value)
  if (
    !isRecord(parsed) ||
    parsed.version !== 1
  ) {
    throw new Error('Unsupported progress version')
  }

  if (
    !isLessonProgressRecord(parsed.lessons) ||
    !Array.isArray(parsed.bookmarks) ||
    !parsed.bookmarks.every(
      (bookmark) => typeof bookmark === 'string' && LESSON_IDS.has(bookmark),
    )
  ) {
    throw new Error('Invalid progress data')
  }

  return {
    version: 1,
    lessons: parsed.lessons,
    bookmarks: parsed.bookmarks,
  }
}
