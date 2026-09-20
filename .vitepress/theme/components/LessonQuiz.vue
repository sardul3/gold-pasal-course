<script setup lang="ts">
import { computed, ref, useId } from 'vue'

type Letter = 'a' | 'b' | 'c' | 'd'

const props = defineProps<{
  question: string
  a: string
  b: string
  c: string
  d?: string
  correct: Letter
}>()

const headingId = useId()
const states = ref<Partial<Record<Letter, 'wrong' | 'correct'>>>({})
const locked = computed(() => states.value[props.correct] === 'correct')
const revealed = computed(() => Object.keys(states.value).length > 0)

const options = computed(() => {
  const items: { letter: Letter; label: string }[] = [
    { letter: 'a', label: props.a },
    { letter: 'b', label: props.b },
    { letter: 'c', label: props.c },
  ]
  if (props.d) {
    items.push({ letter: 'd', label: props.d })
  }
  return items
})

function pick(letter: Letter): void {
  if (locked.value) {
    return
  }
  states.value = {
    ...states.value,
    [letter]: letter === props.correct ? 'correct' : 'wrong',
  }
}
</script>

<template>
  <section class="gp-panel quiz" :aria-labelledby="headingId">
    <p class="gp-eyebrow">Check before you run</p>
    <p :id="headingId" class="quiz__question">{{ question }}</p>
    <div class="quiz__options" role="group" :aria-labelledby="headingId">
      <button
        v-for="option in options"
        :key="option.letter"
        class="quiz__option"
        type="button"
        :data-test="`quiz-option-${option.letter}`"
        :data-state="states[option.letter]"
        :disabled="locked"
        @click="pick(option.letter)"
      >
        <span class="quiz__stamp" aria-hidden="true">{{
          option.letter.toUpperCase()
        }}</span>
        <span>{{ option.label }}</span>
      </button>
    </div>
    <div v-if="revealed" class="quiz__why" aria-live="polite">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.quiz {
  border-top: 4px solid var(--gp-saffron);
}

.quiz__question {
  border: 0;
  font-family: var(--gp-font-display);
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.35;
  margin: 0 0 0.9rem;
  max-width: none;
  padding: 0;
}

.quiz__options {
  display: grid;
  gap: 0.55rem;
}

.quiz__option {
  align-items: start;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--gp-radius);
  color: inherit;
  cursor: pointer;
  display: grid;
  font: inherit;
  gap: 0.75rem;
  grid-template-columns: 2.1rem 1fr;
  padding: 0.7rem 0.8rem;
  text-align: left;
}

.quiz__option:hover:not(:disabled) {
  border-color: var(--gp-indigo);
}

.dark .quiz__option:hover:not(:disabled) {
  border-color: var(--gp-saffron);
}

.quiz__option:focus-visible {
  outline: 3px solid var(--gp-focus);
  outline-offset: 3px;
}

.quiz__option[data-state='wrong'] {
  background: rgb(166 70 50 / 10%);
  border-color: var(--gp-oxide);
}

.quiz__option[data-state='correct'] {
  background: rgb(185 216 194 / 28%);
  border-color: var(--gp-celadon);
}

.quiz__option:disabled {
  cursor: default;
}

.quiz__stamp {
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.6rem;
}

.quiz__option[data-state='wrong'] .quiz__stamp {
  color: var(--gp-oxide);
}

.quiz__option[data-state='correct'] .quiz__stamp {
  color: var(--gp-indigo);
}

.dark .quiz__option[data-state='correct'] .quiz__stamp {
  color: var(--gp-celadon);
}

.quiz__why {
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 1rem;
  padding-top: 1rem;
}

.quiz__why :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
