<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ prompt: string }>()

const prediction = ref('')
const revealed = ref(false)
</script>

<template>
  <section class="gp-panel">
    <p class="gp-eyebrow">Predict, then run</p>
    <label for="prediction"><strong>{{ prompt }}</strong></label>
    <textarea
      id="prediction"
      v-model="prediction"
      class="gp-input prediction"
      rows="3"
      placeholder="Write a concrete value or behavior before running the command."
    />
    <button
      class="gp-button"
      type="button"
      :disabled="prediction.trim().length < 3"
      @click="revealed = true"
    >
      Record prediction and reveal
    </button>
    <div v-if="revealed" class="answer" aria-live="polite">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.prediction {
  display: block;
  margin: 0.65rem 0;
  resize: vertical;
}

.gp-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.answer {
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 1rem;
  padding-top: 1rem;
}
</style>
