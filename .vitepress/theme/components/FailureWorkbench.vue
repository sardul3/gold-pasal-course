<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  incident: string
  hypotheses: string[]
  nextEvidence: string
}>()

const selected = ref('')
const revealed = ref(false)

function investigate(): void {
  if (!selected.value) return
  revealed.value = true
}
</script>

<template>
  <section class="gp-panel failure" aria-labelledby="failure-title">
    <p class="gp-eyebrow">Failure workbench</p>
    <h2 id="failure-title">{{ incident }}</h2>
    <fieldset>
      <legend>Choose the first hypothesis you would test.</legend>
      <label v-for="hypothesis in props.hypotheses" :key="hypothesis">
        <input v-model="selected" :value="hypothesis" type="radio" />
        {{ hypothesis }}
      </label>
    </fieldset>
    <button class="gp-button" :disabled="!selected" type="button" @click="investigate">
      Inspect next evidence
    </button>
    <p v-if="revealed" class="failure__evidence" aria-live="polite">
      <strong>Next evidence:</strong> {{ nextEvidence }}
    </p>
  </section>
</template>

<style scoped>
.failure {
  border-left: 6px solid var(--gp-oxide);
}

h2 {
  border: 0;
  margin: 0 0 1rem;
  padding: 0;
}

fieldset {
  border: 0;
  display: grid;
  gap: 0.6rem;
  margin: 0 0 1rem;
  padding: 0;
}

legend {
  font-weight: 700;
  margin-bottom: 0.6rem;
}

label {
  align-items: start;
  display: flex;
  gap: 0.55rem;
}

.failure__evidence {
  border-top: 1px solid var(--vp-c-divider);
  margin-bottom: 0;
  margin-top: 1rem;
  padding-top: 1rem;
}
</style>
