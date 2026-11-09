<script setup lang="ts">
import type { Overview } from '~/types/admin'

const days = ref(30)
const { data } = await useFetch<Overview>('/api/stats/overview', { query: { days } })

const periods = [7, 30, 90].map(d => ({ value: d, label: `${d} Tage` }))

const kpis = computed(() => {
  if (!data.value) return []
  const c = data.value.current
  const p = data.value.previous
  const avg = (k: typeof c) => (k.orders ? k.gmv / k.orders : 0)
  return [
    { label: 'Umsatz (Warenwert)', value: euro(c.gmv, 0), change: delta(c.gmv, p.gmv) },
    { label: 'Provision (5 %)', value: euro(c.commission, 0), change: delta(c.commission, p.commission) },
    { label: 'Bestellungen', value: num(c.orders), change: delta(c.orders, p.orders) },
    { label: 'Ø Bestellwert', value: euro(avg(c)), change: delta(avg(c), avg(p)) },
    { label: 'Verkaufte Karten', value: num(c.items), change: delta(c.items, p.items) },
    { label: 'Aktive Käufer', value: num(c.buyers), change: delta(c.buyers, p.buyers) },
  ]
})

const inventory = computed(() => {
  const i = data.value?.inventory
  if (!i) return []
  return [
    { label: 'Aktive Angebote', value: num(i.activeListings) },
    { label: 'Verfügbare Karten', value: num(i.units) },
    { label: 'Warenwert im Angebot', value: euro(i.value, 0) },
    { label: 'Kunden mit Angeboten', value: num(i.sellers) },
    { label: 'Kunden gesamt', value: num(i.users) },
    { label: 'Neue Kunden im Zeitraum', value: num(i.newUsers) },
  ]
})
</script>

<template>
  <div v-if="data">
    <PageHeader title="Auswertungen" description="Bezahlte, nicht stornierte Sendungen. Vergleich mit dem Zeitraum davor.">
      <UiSegmented v-model="days" :options="periods" />
    </PageHeader>

    <div class="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <Stat framed size="lg" v-for="k in kpis" :key="k.label" :label="k.label" :value="k.value" :change="k.change" />
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
      <Panel title="Umsatz pro Tag">
        <DashboardRevenueChart :daily="data.daily" />
      </Panel>
      <Panel title="Nach Spiel">
        <DashboardGameShare :games="data.byGame" />
      </Panel>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <Panel title="Bestand"><KeyValueList :items="inventory" /></Panel>
      <Panel title="Sendungen nach Status"><DashboardStatusCounts :items="data.byStatus" /></Panel>
      <Panel title="Top-Verkäufer"><DashboardTopSellers :sellers="data.topSellers" /></Panel>
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-2">
      <Panel title="Meistverkaufte Produkte"><DashboardTopProducts :products="data.topProducts" /></Panel>
      <Panel title="Letzte Bestellungen"><DashboardRecentOrders :orders="data.recentOrders" /></Panel>
    </div>
  </div>
</template>
