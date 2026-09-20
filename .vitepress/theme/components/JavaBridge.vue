<script setup lang="ts">
defineProps<{
  java: string
  python: string
  caution?: string
}>()
</script>

<template>
  <details class="gp-panel bridge">
    <summary class="bridge__summary">
      <p class="gp-eyebrow">Java bridge</p>
      <span class="bridge__hint">If you already know Spring</span>
      <span class="bridge__toggle bridge__toggle--closed">Open</span>
      <span class="bridge__toggle bridge__toggle--open">Close</span>
    </summary>
    <div class="bridge__body">
      <div class="gp-grid gp-grid--two">
        <div>
          <strong>What you already know</strong>
          <p>{{ java }}</p>
        </div>
        <div>
          <strong>How Python expresses it</strong>
          <p>{{ python }}</p>
        </div>
      </div>
      <p v-if="caution" class="bridge__caution">
        <strong>Where the analogy breaks:</strong> {{ caution }}
      </p>
    </div>
  </details>
</template>

<style scoped>
.bridge {
  border-top: 4px solid var(--gp-celadon);
  padding: 0;
}

.bridge__summary {
  cursor: pointer;
  display: grid;
  gap: 0.15rem 1rem;
  grid-template-columns: 1fr auto;
  list-style: none;
  padding: 0.85rem clamp(1rem, 3vw, 1.5rem);
}

.bridge__summary::-webkit-details-marker {
  display: none;
}

.bridge__summary .gp-eyebrow {
  grid-column: 1;
  margin-bottom: 0;
}

.bridge__hint {
  font-family: var(--gp-font-display);
  grid-column: 1;
}

.bridge__toggle {
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

.bridge__toggle--open,
.bridge[open] .bridge__toggle--closed {
  display: none;
}

.bridge[open] .bridge__toggle--open {
  display: inline;
}

.bridge__body {
  border-top: 1px solid var(--vp-c-divider);
  padding: 0 clamp(1rem, 3vw, 1.5rem) clamp(1rem, 3vw, 1.5rem);
}

.bridge p {
  margin-bottom: 0;
}

.bridge__caution {
  border-top: 1px dashed var(--vp-c-divider);
  margin-top: 1rem;
  padding-top: 1rem;
}
</style>
