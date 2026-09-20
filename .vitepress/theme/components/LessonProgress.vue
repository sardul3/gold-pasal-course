<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { EvidenceKind } from '../data/course'
import {
  createEmptyProgress,
  loadProgress,
  saveProgress,
  setLessonState,
  type EvidenceLink,
  type LearnerProgress,
  type LessonState,
} from '../progress'

const props = defineProps<{ lessonId: string }>()
const progress = ref<LearnerProgress>(createEmptyProgress())
const evidenceKind = ref<EvidenceKind>('commit')
const evidenceUrl = ref('')
const evidenceNote = ref('')
const message = ref('')

onMounted(() => {
  progress.value = loadProgress()
})

const current = computed(() => progress.value.lessons[props.lessonId])

function mark(state: Exclude<LessonState, 'proven'>): void {
  progress.value = setLessonState(
    progress.value,
    props.lessonId,
    state,
    current.value?.evidence ?? [],
  )
  saveProgress(progress.value)
  message.value = `Marked ${state}.`
}

function markProven(): void {
  if (!evidenceUrl.value.startsWith('https://') || evidenceNote.value.trim().length < 3) {
    message.value = 'Add an HTTPS evidence link and explain what it proves.'
    return
  }
  const evidence: EvidenceLink = {
    kind: evidenceKind.value,
    url: evidenceUrl.value,
    note: evidenceNote.value.trim(),
  }
  progress.value = setLessonState(progress.value, props.lessonId, 'proven', [evidence])
  saveProgress(progress.value)
  message.value = 'Marked proven with inspectable evidence.'
}
</script>

<template>
  <details class="gp-panel lesson-progress">
    <summary class="lesson-progress__summary">
      <p class="gp-eyebrow">Lesson state · {{ lessonId }}</p>
      <span class="lesson-progress__hint">
        {{ current ? `Currently ${current.state}` : 'Record this work when it is true.' }}
      </span>
      <span class="lesson-progress__toggle lesson-progress__toggle--closed">Open</span>
      <span class="lesson-progress__toggle lesson-progress__toggle--open">Close</span>
    </summary>
    <div class="lesson-progress__body">
      <div class="lesson-progress__actions">
        <button class="gp-button gp-button--quiet" type="button" @click="mark('read')">
          Mark read
        </button>
        <button
          class="gp-button gp-button--quiet"
          data-test="practiced"
          type="button"
          @click="mark('practiced')"
        >
          Mark practiced
        </button>
      </div>
      <div class="lesson-progress__proof">
        <label>
          Evidence kind
          <select v-model="evidenceKind" class="gp-input">
            <option value="commit">Commit</option>
            <option value="pull-request">Pull request</option>
            <option value="ci-run">CI run</option>
            <option value="adr">ADR</option>
            <option value="runbook">Runbook</option>
            <option value="deployment">Deployment</option>
            <option value="evaluation">Evaluation</option>
            <option value="demo">Demo</option>
          </select>
        </label>
        <label>
          Evidence URL
          <input
            v-model="evidenceUrl"
            class="gp-input"
            placeholder="https://github.com/…"
            type="url"
          />
        </label>
        <label>
          What it proves
          <input
            v-model="evidenceNote"
            class="gp-input"
            placeholder="The release check demonstrates…"
          />
        </label>
        <button class="gp-button" type="button" @click="markProven">Mark proven</button>
      </div>
      <p class="lesson-progress__message" aria-live="polite">{{ message }}</p>
    </div>
  </details>
</template>

<style scoped>
.lesson-progress {
  border-top: 4px solid var(--gp-saffron);
  padding: 0;
}

.lesson-progress__summary {
  cursor: pointer;
  display: grid;
  gap: 0.15rem 1rem;
  grid-template-columns: 1fr auto;
  list-style: none;
  padding: 0.85rem clamp(1rem, 3vw, 1.5rem);
}

.lesson-progress__summary::-webkit-details-marker {
  display: none;
}

.lesson-progress__summary .gp-eyebrow {
  grid-column: 1;
  margin-bottom: 0;
}

.lesson-progress__hint {
  font-family: var(--gp-font-display);
  grid-column: 1;
}

.lesson-progress__toggle {
  align-self: center;
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  font-weight: 700;
  grid-column: 2;
  grid-row: 1 / span 2;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.lesson-progress__toggle--open,
.lesson-progress[open] .lesson-progress__toggle--closed {
  display: none;
}

.lesson-progress[open] .lesson-progress__toggle--open {
  display: inline;
}

.lesson-progress__body {
  border-top: 1px solid var(--vp-c-divider);
  padding: 0 clamp(1rem, 3vw, 1.5rem) clamp(1rem, 3vw, 1.5rem);
}

.lesson-progress__actions,
.lesson-progress__proof {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.lesson-progress__actions {
  padding-top: 1rem;
}

.lesson-progress__proof {
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 1rem;
  padding-top: 1rem;
}

label {
  color: var(--vp-c-text-2);
  flex: 1 1 14rem;
  font-size: 0.8rem;
  font-weight: 700;
}

.lesson-progress__proof .gp-button {
  align-self: end;
}

.lesson-progress__message {
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  margin-bottom: 0;
}
</style>
