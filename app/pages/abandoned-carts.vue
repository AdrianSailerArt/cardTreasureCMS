<script setup lang="ts">
import type { CartExpiryReport } from '~/types/admin'

/**
 * Abgelaufene Warenkörbe: Karten bleiben höchstens einige Stunden im Warenkorb, danach gibt der Shop sie frei und vermerkt das
 * beim Käufer. Wer das mehrmals tut, blockiert Angebote anderer; solche Kunden lassen sich hier sperren.
 */
const days = ref('30')
const periods = [{ value: '7', label: '7 Tage' }, { value: '30', label: '30 Tage' }, { value: '90', label: '90 Tage' }]
const { data, error, status, refresh } = await useFetch<CartExpiryReport>('/api/cart-expirations', { query: { days } })
useSeoMeta({ title: 'Warenkörbe – CardTreasure CMS' })
</script>

<template>
  <div>
    <PageHeader title="Abgelaufene Warenkörbe" :description="data ? `Karten bleiben ${data.holdHours} Stunden im Warenkorb, danach werden sie freigegeben und beim Käufer vermerkt. Ab ${data.repeatThreshold} Abläufen im Zeitraum gilt ein Kunde als auffällig.` : undefined">
      <UiSegmented v-model="days" :options="periods" label="Zeitraum" />
    </PageHeader>
    <UiNotice v-if="error" tone="danger" class="mt-4">Shop nicht erreichbar: {{ error.statusMessage }}</UiNotice>
    <p v-else-if="status === 'pending' && !data" class="mt-6 text-small text-fg-subtle" aria-live="polite">Wird geladen …</p>

    <template v-if="data">
      <div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat framed label="Abläufe" :value="num(data.totals.expiries)" />
        <Stat framed label="Kunden" :value="num(data.totals.customers)" />
        <Stat framed label="Auffällig" :value="num(data.totals.repeaters)" />
        <Stat framed label="Freigegebene Karten" :value="num(data.totals.items)" />
        <Stat framed label="Warenwert" :value="euro(data.totals.valueCents)" />
      </div>

      <Panel :title="`Kunden (${data.customers.length})`" class="mt-6">
        <EmptyState v-if="!data.customers.length">Im Zeitraum ist kein Warenkorb abgelaufen.</EmptyState>
        <UiTable v-else :min-width="900">
          <template #head>
            <th>Kunde</th><th>Abläufe</th><th class="text-right">Karten</th><th class="text-right">Wert</th>
            <th class="text-right">Abläufe gesamt</th><th class="text-right">Bestellungen</th><th>Zuletzt</th><th />
          </template>
          <CartsCustomerRow v-for="c in data.customers" :key="c.userId" :customer="c" :threshold="data.repeatThreshold" @changed="() => refresh()" />
        </UiTable>
      </Panel>
    </template>
  </div>
</template>
