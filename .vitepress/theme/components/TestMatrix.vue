<script setup lang="ts">
withDefaults(
  defineProps<{
    unit?: string
    slice?: string
    integration?: string
    contract?: string
    trajectory?: string
  }>(),
  {
    unit: 'Not required in this lesson',
    slice: 'Not required in this lesson',
    integration: 'Not required in this lesson',
    contract: 'Not required in this lesson',
    trajectory: 'Not required in this lesson',
  },
)
</script>

<template>
  <section class="gp-panel matrix" aria-labelledby="test-matrix-title">
    <p class="gp-eyebrow">Risk-to-test map</p>
    <h2 id="test-matrix-title">What each layer is allowed to prove</h2>
    <dl>
      <div><dt>Unit</dt><dd>{{ unit }}</dd></div>
      <div><dt>HTTP slice</dt><dd>{{ slice }}</dd></div>
      <div><dt>Integration</dt><dd>{{ integration }}</dd></div>
      <div><dt>Contract</dt><dd>{{ contract }}</dd></div>
      <div><dt>Trajectory</dt><dd>{{ trajectory }}</dd></div>
    </dl>
  </section>
</template>

<style scoped>
h2 {
  border: 0;
  margin: 0 0 1rem;
  padding: 0;
}

dl {
  display: grid;
  gap: 1px;
  grid-template-columns: repeat(5, 1fr);
  margin: 0;
}

dl div {
  background: var(--vp-c-bg);
  padding: 0.8rem;
}

dt {
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
}

dd {
  color: var(--vp-c-text-2);
  font-size: 0.82rem;
  margin: 0.5rem 0 0;
}

@media (max-width: 800px) {
  dl {
    grid-template-columns: 1fr;
  }
}
</style>
