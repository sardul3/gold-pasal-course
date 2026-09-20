<script setup lang="ts">
import { ref } from 'vue'

const steps = [
  'State the store problem and the invariant that matters.',
  'Exercise the public API without opening the source first.',
  'Show the test that protects the risky path.',
  'Trace the running release from commit to homelab workload.',
  'Trigger one controlled failure and recover.',
  'Explain one trade-off you would revisit at larger scale.',
]

const active = ref(0)
</script>

<template>
  <section class="gp-panel demo" aria-labelledby="demo-mode-title">
    <p class="gp-eyebrow">Demo mode</p>
    <h2 id="demo-mode-title">Tell one inspectable engineering story.</h2>
    <p class="demo__step">{{ active + 1 }} / {{ steps.length }}</p>
    <p class="demo__prompt">{{ steps[active] }}</p>
    <div class="demo__controls">
      <button
        class="gp-button gp-button--quiet"
        :disabled="active === 0"
        type="button"
        @click="active -= 1"
      >
        Previous
      </button>
      <button
        class="gp-button"
        :disabled="active === steps.length - 1"
        type="button"
        @click="active += 1"
      >
        Next
      </button>
    </div>
  </section>
</template>

<style scoped>
h2 {
  border: 0;
  margin: 0;
  padding: 0;
}

.demo__step {
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
}

.demo__prompt {
  font-family: var(--gp-font-display);
  font-size: 1.45rem;
}

.demo__controls {
  display: flex;
  gap: 0.7rem;
}

button:disabled {
  opacity: 0.4;
}
</style>
