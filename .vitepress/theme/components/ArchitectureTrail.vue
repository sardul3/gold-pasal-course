<script setup lang="ts">
defineProps<{
  before: string
  decision: string
  after: string
  adr?: string
}>()
</script>

<template>
  <aside class="gp-panel trail">
    <p class="gp-eyebrow">Architecture trail</p>
    <div><strong>Pressure</strong><p>{{ before }}</p></div>
    <span aria-hidden="true">→</span>
    <div><strong>Decision</strong><p>{{ decision }}</p></div>
    <span aria-hidden="true">→</span>
    <div><strong>New shape</strong><p>{{ after }}</p></div>
    <a v-if="adr" :href="adr">Read the ADR</a>
  </aside>
</template>

<style scoped>
.trail {
  align-items: start;
  display: grid;
  gap: 0.8rem;
  grid-template-columns: 1fr auto 1fr auto 1fr;
}

.gp-eyebrow,
.trail > a {
  grid-column: 1 / -1;
}

.trail p {
  color: var(--vp-c-text-2);
  margin-bottom: 0;
}

@media (max-width: 700px) {
  .trail {
    grid-template-columns: 1fr;
  }
}
</style>
