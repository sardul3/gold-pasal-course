<script setup lang="ts">
defineProps<{
  role: string
  problem: string
  destination: string
}>()
</script>

<template>
  <aside class="gp-panel mission" aria-labelledby="mission-title">
    <p class="gp-eyebrow">Incoming at the counter · {{ role }}</p>
    <h2 id="mission-title">The job in front of you</h2>
    <p class="mission__problem">{{ problem }}</p>
    <p class="mission__destination">
      <strong>Done looks like:</strong> {{ destination }}
    </p>
  </aside>
</template>

<style scoped>
.mission {
  border-left: 6px solid var(--gp-saffron);
}

.mission h2 {
  border: 0;
  font-size: clamp(1.35rem, 3vw, 1.65rem);
  line-height: 1.2;
  margin: 0.15rem 0 0.6rem;
  padding: 0;
}

.mission__problem {
  font-family: var(--gp-font-display);
  font-size: 1.05rem;
  line-height: 1.55;
  margin: 0;
}

.mission__destination {
  border-top: 1px solid var(--vp-c-divider);
  font-size: 0.95rem;
  line-height: 1.55;
  margin: 0.75rem 0 0;
  padding-top: 0.75rem;
}
</style>
