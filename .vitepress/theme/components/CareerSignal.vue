<script setup lang="ts">
defineProps<{
  role: string
  signal: string
  interviewQuestion: string
}>()
</script>

<template>
  <details class="gp-panel career">
    <summary class="career__summary">
      <p class="gp-eyebrow">Career signal · {{ role }}</p>
      <span class="career__hint">Reviewer evidence and interview question</span>
      <span class="career__toggle career__toggle--closed">Open</span>
      <span class="career__toggle career__toggle--open">Close</span>
    </summary>
    <div class="career__body">
      <p><strong>A reviewer can see:</strong> {{ signal }}</p>
      <p><strong>Be ready to answer:</strong> {{ interviewQuestion }}</p>
    </div>
  </details>
</template>

<style scoped>
.career {
  border-bottom: 4px solid var(--gp-saffron);
  padding: 0;
}

.career__summary {
  cursor: pointer;
  display: grid;
  gap: 0.15rem 1rem;
  grid-template-columns: 1fr auto;
  list-style: none;
  padding: 0.85rem clamp(1rem, 3vw, 1.5rem);
}

.career__summary::-webkit-details-marker {
  display: none;
}

.career__summary .gp-eyebrow {
  grid-column: 1;
  margin-bottom: 0;
}

.career__hint {
  font-family: var(--gp-font-display);
  grid-column: 1;
}

.career__toggle {
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

.career__toggle--open,
.career[open] .career__toggle--closed {
  display: none;
}

.career[open] .career__toggle--open {
  display: inline;
}

.career__body {
  border-top: 1px solid var(--vp-c-divider);
  padding: 0 clamp(1rem, 3vw, 1.5rem) clamp(1rem, 3vw, 1.5rem);
}

.career p:last-child {
  margin-bottom: 0;
}
</style>
