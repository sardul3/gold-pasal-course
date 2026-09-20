<script setup lang="ts">
import { computed, ref } from 'vue'

const TOLA_GRAMS = 11.6638038

const ratePerTola = ref(200_000)
const grams = ref(11.6638038)
const karat = ref(22)
const wastagePercent = ref(2)
const makingPerGram = ref(1_500)

const breakdown = computed(() => {
  const pureGoldValue =
    ratePerTola.value * (grams.value / TOLA_GRAMS) * (karat.value / 24)
  const wastage = pureGoldValue * (wastagePercent.value / 100)
  const making = makingPerGram.value * grams.value
  const subtotal = pureGoldValue + wastage + making
  const vat = subtotal * 0.13
  return { pureGoldValue, wastage, making, vat, total: subtotal + vat }
})

const npr = new Intl.NumberFormat('en-NP', {
  style: 'currency',
  currency: 'NPR',
  maximumFractionDigits: 2,
})
</script>

<template>
  <section class="gp-panel workbench" aria-labelledby="price-workbench-title">
    <p class="gp-eyebrow">Live quote bench</p>
    <h2 id="price-workbench-title">Change the inputs. Follow each rupee.</h2>
    <div class="gp-grid gp-grid--two">
      <label>
        Gold rate per tola
        <input v-model.number="ratePerTola" class="gp-input" min="0" type="number" />
      </label>
      <label>
        Gold weight in grams
        <input v-model.number="grams" class="gp-input" min="0" step="0.01" type="number" />
      </label>
      <label>
        Karat
        <select v-model.number="karat" class="gp-input">
          <option :value="24">24K</option>
          <option :value="22">22K</option>
          <option :value="18">18K</option>
          <option :value="14">14K</option>
        </select>
      </label>
      <label>
        Wastage percent
        <input v-model.number="wastagePercent" class="gp-input" min="0" step="0.1" type="number" />
      </label>
      <label>
        Making charge per gram
        <input v-model.number="makingPerGram" class="gp-input" min="0" type="number" />
      </label>
    </div>
    <dl class="receipt gp-data" aria-live="polite">
      <div><dt>Purity-adjusted gold</dt><dd>{{ npr.format(breakdown.pureGoldValue) }}</dd></div>
      <div><dt>Wastage</dt><dd>{{ npr.format(breakdown.wastage) }}</dd></div>
      <div><dt>Making</dt><dd>{{ npr.format(breakdown.making) }}</dd></div>
      <div><dt>VAT (13%)</dt><dd>{{ npr.format(breakdown.vat) }}</dd></div>
      <div class="receipt__total"><dt>Quote total</dt><dd>{{ npr.format(breakdown.total) }}</dd></div>
    </dl>
    <p class="workbench__caveat">
      This browser demonstration uses JavaScript numbers. The application lessons
      use Python <code>Decimal</code> and an explicit rounding policy for money.
    </p>
  </section>
</template>

<style scoped>
.workbench h2 {
  border: 0;
  margin: 0 0 1rem;
  padding: 0;
}

label {
  color: var(--vp-c-text-2);
  font-size: 0.84rem;
  font-weight: 700;
}

.receipt {
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 1.25rem;
  padding-top: 1rem;
}

.receipt div {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.receipt dd {
  margin: 0;
}

.receipt__total {
  border-top: 2px solid var(--gp-saffron);
  font-size: 1.15rem;
  font-weight: 800;
  margin-top: 0.5rem;
  padding-top: 0.75rem !important;
}

.workbench__caveat {
  color: var(--vp-c-text-2);
  font-size: 0.8rem;
  margin-bottom: 0;
}
</style>
