<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { allLessons, releases } from '../data/course'
import {
  createEmptyProgress,
  exportProgress,
  importProgress,
  loadProgress,
  saveProgress,
  type LearnerProgress,
} from '../progress'

const progress = ref<LearnerProgress>(createEmptyProgress())
const message = ref('')

onMounted(() => {
  progress.value = loadProgress()
})

const counts = computed(() => {
  const values = Object.values(progress.value.lessons)
  return {
    read: values.filter(({ state }) => state === 'read').length,
    practiced: values.filter(({ state }) => state === 'practiced').length,
    proven: values.filter(({ state }) => state === 'proven').length,
  }
})

const nextRelease = computed(
  () =>
    releases.find((release) =>
      release.lessons.some(
        (lesson) => progress.value.lessons[lesson.id]?.state !== 'proven',
      ),
    ) ?? releases.at(-1),
)

function downloadBackup(): void {
  const url = URL.createObjectURL(
    new Blob([exportProgress(progress.value)], { type: 'application/json' }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'gold-pasal-progress.json'
  anchor.click()
  URL.revokeObjectURL(url)
  message.value = 'Progress backup downloaded.'
}

async function restoreBackup(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const restored = importProgress(await file.text())
    saveProgress(restored)
    progress.value = restored
    message.value = 'Progress backup restored.'
  } catch {
    message.value = 'That file is not a supported Gold Pasal progress backup.'
  } finally {
    input.value = ''
  }
}
</script>

<template>
  <section class="desk" aria-labelledby="learner-desk-title">
    <header class="desk__header">
      <div>
        <p class="gp-eyebrow">Learner desk</p>
        <h2 id="learner-desk-title">Your workbench, not a leaderboard.</h2>
      </div>
      <p>{{ allLessons.length }} lessons · {{ releases.length }} release gates</p>
    </header>

    <div class="desk__active">
      <p class="gp-eyebrow">Continue the build</p>
      <h3>{{ nextRelease?.id.toUpperCase() }} · {{ nextRelease?.title }}</h3>
      <p>{{ nextRelease?.promise }}</p>
      <a class="gp-button" :href="`/releases/${nextRelease?.id}/`">Open release</a>
    </div>

    <div class="desk__states" aria-label="Learning evidence totals">
      <div><strong>{{ counts.read }}</strong><span>Read</span></div>
      <div><strong>{{ counts.practiced }}</strong><span>Practiced</span></div>
      <div><strong>{{ counts.proven }}</strong><span>Proven</span></div>
    </div>

    <div class="desk__backup">
      <button class="gp-button gp-button--quiet" type="button" @click="downloadBackup">
        Export progress
      </button>
      <label class="gp-button gp-button--quiet">
        Restore progress
        <input accept="application/json" type="file" @change="restoreBackup" />
      </label>
      <p class="desk__message" aria-live="polite">{{ message }}</p>
    </div>
  </section>
</template>

<style scoped>
.desk {
  background:
    linear-gradient(120deg, rgb(45 35 71 / 96%), rgb(64 48 76 / 94%)),
    var(--gp-indigo);
  border-radius: var(--gp-radius);
  box-shadow: var(--gp-shadow);
  color: white;
  margin: 2rem 0;
  overflow: hidden;
}

.desk__header {
  align-items: end;
  border-bottom: 1px solid rgb(255 255 255 / 16%);
  display: flex;
  gap: 2rem;
  justify-content: space-between;
  padding: clamp(1.2rem, 4vw, 2.2rem);
}

.desk h2,
.desk h3 {
  border: 0;
  color: white;
  margin: 0;
  padding: 0;
}

.desk__active {
  padding: clamp(1.2rem, 4vw, 2.2rem);
}

.desk__active .gp-button {
  background: var(--gp-saffron);
  color: var(--gp-indigo-deep);
}

.desk__states {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.desk__states div {
  border-right: 1px solid rgb(255 255 255 / 16%);
  border-top: 1px solid rgb(255 255 255 / 16%);
  padding: 1.2rem;
  text-align: center;
}

.desk__states strong,
.desk__states span {
  display: block;
}

.desk__states strong {
  color: var(--gp-saffron);
  font-family: var(--gp-font-display);
  font-size: 2rem;
}

.desk__states span {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.desk__backup {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1.2rem;
}

.desk__backup .gp-button--quiet {
  border-color: rgb(255 255 255 / 35%);
  color: white;
}

input[type="file"] {
  height: 1px;
  opacity: 0;
  position: absolute;
  width: 1px;
}

.desk__message {
  font-size: 0.8rem;
  margin: 0;
}

@media (max-width: 640px) {
  .desk__header {
    align-items: start;
    flex-direction: column;
  }
}
</style>
