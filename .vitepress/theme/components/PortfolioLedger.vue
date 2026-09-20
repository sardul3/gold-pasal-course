<script setup lang="ts">
import { onMounted, ref } from 'vue'

type ArtifactKind =
  | 'commit'
  | 'pull request'
  | 'CI run'
  | 'ADR'
  | 'runbook'
  | 'deployment'
  | 'evaluation'
  | 'demo'

interface LedgerEntry {
  id: string
  kind: ArtifactKind
  url: string
  note: string
}

const STORAGE_KEY = 'gold-pasal.portfolio.v1'
const entries = ref<LedgerEntry[]>([])
const kind = ref<ArtifactKind>('commit')
const url = ref('')
const note = ref('')

onMounted(() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) entries.value = JSON.parse(stored) as LedgerEntry[]
})

function addEntry(): void {
  if (!url.value.startsWith('https://') || note.value.trim().length < 3) return

  entries.value = [
    ...entries.value,
    {
      id: crypto.randomUUID(),
      kind: kind.value,
      url: url.value,
      note: note.value.trim(),
    },
  ]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.value))
  url.value = ''
  note.value = ''
}

function removeEntry(id: string): void {
  entries.value = entries.value.filter((entry) => entry.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.value))
}
</script>

<template>
  <section class="gp-panel ledger" aria-labelledby="portfolio-ledger-title">
    <p class="gp-eyebrow">Portfolio ledger</p>
    <h2 id="portfolio-ledger-title">Keep the receipt for your engineering work.</h2>
    <form class="gp-grid ledger__form" @submit.prevent="addEntry">
      <label>
        Evidence kind
        <select v-model="kind" class="gp-input">
          <option>commit</option>
          <option>pull request</option>
          <option>CI run</option>
          <option>ADR</option>
          <option>runbook</option>
          <option>deployment</option>
          <option>evaluation</option>
          <option>demo</option>
        </select>
      </label>
      <label>
        Public or accessible HTTPS link
        <input v-model="url" class="gp-input" inputmode="url" placeholder="https://…" type="url" />
      </label>
      <label>
        What this proves
        <input v-model="note" class="gp-input" placeholder="A reviewer can verify…" />
      </label>
      <button class="gp-button" type="submit">Add evidence</button>
    </form>
    <p v-if="entries.length === 0" class="ledger__empty">
      No evidence yet. Complete a release check, then attach the artifact—not a
      claim about the artifact.
    </p>
    <ul v-else>
      <li v-for="entry in entries" :key="entry.id">
        <span class="ledger__kind">{{ entry.kind }}</span>
        <a :href="entry.url" rel="noreferrer" target="_blank">{{ entry.note }}</a>
        <button type="button" @click="removeEntry(entry.id)">Remove</button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.ledger h2 {
  border: 0;
  margin: 0 0 1rem;
  padding: 0;
}

.ledger__form {
  grid-template-columns: minmax(9rem, 0.8fr) 1.2fr 1.5fr auto;
}

label {
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  font-weight: 700;
}

.ledger__form .gp-button {
  align-self: end;
}

.ledger__empty {
  color: var(--vp-c-text-2);
  margin-bottom: 0;
}

ul {
  list-style: none;
  margin: 1.25rem 0 0;
  padding: 0;
}

li {
  align-items: center;
  border-top: 1px solid var(--vp-c-divider);
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 7rem 1fr auto;
  padding: 0.75rem 0;
}

.ledger__kind {
  font-family: var(--vp-font-family-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
}

li button {
  background: none;
  border: 0;
  color: var(--vp-c-text-2);
  cursor: pointer;
  text-decoration: underline;
}

@media (max-width: 900px) {
  .ledger__form {
    grid-template-columns: 1fr;
  }
}
</style>
