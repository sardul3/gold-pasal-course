<script setup lang="ts">
defineProps<{
  command: string
  artifact: string
  invariant: string
}>()
</script>

<template>
  <aside class="gp-panel evidence">
    <p class="gp-eyebrow">Proof, not a checkmark</p>
    <dl>
      <div>
        <dt>Run</dt>
        <dd><code>{{ command }}</code></dd>
      </div>
      <div>
        <dt>Preserve</dt>
        <dd>{{ artifact }}</dd>
      </div>
      <div>
        <dt>Defend</dt>
        <dd>{{ invariant }}</dd>
      </div>
    </dl>
  </aside>
</template>

<style scoped>
.evidence {
  background:
    linear-gradient(115deg, rgb(244 201 93 / 14%), transparent 45%),
    var(--vp-c-bg-soft);
}

dl {
  display: grid;
  gap: 0.75rem;
  margin: 0;
}

dl div {
  display: grid;
  gap: 0.25rem;
  grid-template-columns: 5rem 1fr;
}

dt {
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

dd {
  margin: 0;
}
</style>
