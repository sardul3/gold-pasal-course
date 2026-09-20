<script setup lang="ts">
import { ref } from 'vue'

const baseUrl = ref('http://localhost:8000')
const path = ref('/health')
const status = ref('Not sent')
const body = ref('')
const sending = ref(false)

async function sendRequest(): Promise<void> {
  sending.value = true
  status.value = 'Sending…'
  body.value = ''

  try {
    const response = await fetch(`${baseUrl.value.replace(/\/$/, '')}${path.value}`)
    status.value = `${response.status} ${response.statusText}`
    body.value = await response.text()
  } catch (error) {
    status.value = 'Request failed'
    body.value =
      error instanceof Error
        ? `${error.message}\n\nCheck that the API is running and allows this site origin.`
        : 'Unknown request failure'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section class="gp-panel" aria-labelledby="api-workbench-title">
    <p class="gp-eyebrow">API workbench</p>
    <h2 id="api-workbench-title">Ask your local service, then inspect the boundary.</h2>
    <form class="api-form" @submit.prevent="sendRequest">
      <label>
        Base URL
        <input v-model="baseUrl" class="gp-input" type="url" />
      </label>
      <label>
        GET path
        <input v-model="path" class="gp-input gp-data" />
      </label>
      <button class="gp-button" :disabled="sending" type="submit">Send GET</button>
    </form>
    <div class="api-result" aria-live="polite">
      <strong>{{ status }}</strong>
      <pre v-if="body"><code>{{ body }}</code></pre>
    </div>
  </section>
</template>

<style scoped>
h2 {
  border: 0;
  margin: 0 0 1rem;
  padding: 0;
}

.api-form {
  align-items: end;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1.2fr 1fr auto;
}

label {
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  font-weight: 700;
}

.api-result {
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 1rem;
  padding-top: 1rem;
}

pre {
  max-height: 20rem;
  overflow: auto;
}

@media (max-width: 700px) {
  .api-form {
    grid-template-columns: 1fr;
  }
}
</style>
