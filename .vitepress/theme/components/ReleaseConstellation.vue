<script setup lang="ts">
import { releases } from '../data/course'

const capabilityLabel = {
  foundation: 'Foundation',
  backend: 'Backend',
  operations: 'Operations',
  ai: 'AI systems',
  portfolio: 'Portfolio',
}
</script>

<template>
  <nav class="constellation" aria-label="Gold Pasal release path">
    <ol class="constellation__timeline" role="list">
      <li
        v-for="release in releases"
        :key="release.id"
        :class="`constellation__release constellation__release--${release.capability}`"
      >
        <a class="gp-link" :href="`/releases/${release.id}/`">
          <span class="constellation__id">{{ release.id.toUpperCase() }}</span>
          <span>
            <strong>{{ release.title }}</strong>
            <small>{{ capabilityLabel[release.capability] }}</small>
          </span>
        </a>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.constellation {
  margin: 2rem 0;
  padding: 0.5rem 0;
}

ol {
  display: grid;
  gap: 0;
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
}

ol::before {
  background: var(--vp-c-divider);
  bottom: 1.5rem;
  content: "";
  left: calc(1.5rem - 1px);
  position: absolute;
  top: 1.5rem;
  width: 2px;
}

.constellation__release {
  position: relative;
}

.constellation__release:not(:last-child) {
  padding-bottom: 1.25rem;
}

a {
  align-items: center;
  color: var(--vp-c-text-1);
  display: grid;
  gap: 0.85rem;
  grid-template-columns: 3rem minmax(0, 1fr);
  text-decoration: none;
}

.constellation__id {
  align-items: center;
  background: var(--vp-c-bg);
  border: 2px solid var(--gp-oxide);
  border-radius: 50%;
  display: flex;
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  font-weight: 800;
  height: 3rem;
  justify-content: center;
  position: relative;
  width: 3rem;
}

.constellation__release--operations .constellation__id {
  border-color: #5c7c66;
}

.constellation__release--ai .constellation__id {
  border-color: var(--gp-indigo);
}

.dark .constellation__release--ai .constellation__id {
  border-color: var(--gp-saffron);
}

strong,
small {
  display: block;
}

small {
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 0.68rem;
  margin-top: 0.25rem;
  text-transform: uppercase;
}
</style>
