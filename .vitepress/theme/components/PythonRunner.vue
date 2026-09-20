<script setup lang="ts">
import { computed, inject, ref } from 'vue'

import {
  PYTHON_RUNNER_KEY,
  runPythonSnippet,
  type PythonRunResult,
  type PythonRunnerFn,
} from '../python-runtime'

const props = defineProps<{
  code: string
  label?: string
}>()

const source = ref(props.code)
const running = ref(false)
const result = ref<PythonRunResult | null>(null)
const run = inject<PythonRunnerFn>(PYTHON_RUNNER_KEY, runPythonSnippet)
const heading = computed(() => props.label ?? 'Try this snippet')

async function runSnippet(): Promise<void> {
  running.value = true
  try {
    result.value = await run(source.value)
  } finally {
    running.value = false
  }
}

function resetSnippet(): void {
  source.value = props.code
  result.value = null
}
</script>

<template>
  <section class="gp-panel bench" aria-labelledby="python-bench-title">
    <p class="gp-eyebrow">Counter bench · Python</p>
    <h2 id="python-bench-title">{{ heading }}</h2>
    <label class="bench__editor">
      Snippet
      <textarea
        v-model="source"
        class="gp-input bench__source"
        rows="6"
        spellcheck="false"
      />
    </label>
    <div class="bench__actions">
      <button
        class="gp-button"
        data-test="python-run"
        type="button"
        :disabled="running"
        @click="runSnippet"
      >
        {{ running ? 'Running…' : 'Run' }}
      </button>
      <button class="gp-button gp-button--quiet" type="button" @click="resetSnippet">
        Reset
      </button>
    </div>
    <pre
      v-if="result"
      class="bench__output gp-data"
      data-test="python-output"
      aria-live="polite"
    >{{ result.error || result.stderr || result.stdout || '(no output)' }}</pre>
    <p class="bench__caveat">
      This bench runs CPython in the browser. It cannot import
      <code>gold_pasal</code> or use your laptop's <code>uv</code> environment.
    </p>
  </section>
</template>

<style scoped>
.bench h2 {
  border: 0;
  font-size: 1.25rem;
  margin: 0 0 1rem;
  padding: 0;
}

.bench__editor {
  color: var(--vp-c-text-2);
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
}

.bench__source {
  font-family: var(--vp-font-family-mono);
  min-height: 9rem;
  resize: vertical;
}

.bench__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin: 0.85rem 0;
}

.bench__output {
  background: var(--vp-c-bg);
  border: 1px dashed var(--vp-c-divider);
  border-left: 4px solid var(--gp-saffron);
  margin: 0 0 0.85rem;
  overflow: auto;
  padding: 0.85rem 1rem;
  white-space: pre-wrap;
}

.bench__caveat {
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin-bottom: 0;
}
</style>
