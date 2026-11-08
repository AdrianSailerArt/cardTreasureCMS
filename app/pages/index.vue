<script setup lang="ts">
interface Kpi { gmv: number, commission: number, orders: number, shipments: number, buyers: number, items: number }
interface Overview {
  days: number
  current: Kpi
  previous: Kpi
  inventory: { activeListings: number, units: number, value: number, sellers: number, users: number, newUsers: number }
  daily: { day: string, gmv: number, orders: number }[]
  byStatus: { status: string, count: number }[]
  byGame: { game: string, gmv: number, items: number }[]
  topSellers: { name: string, type: string, country: string, gmv: number, shipments: number, rating: number | null }[]
  topProducts: { name: string, game: string, slug: string | null, items: number, gmv: number }[]
  recentOrders: { number: string, buyer: string, createdAt: string, total: number, status: string, shipments: string[] }[]
}

const days = ref(30)
const { data } = await useFetch<Overview>('/api/stats/overview', { query: { days } })
const config = useRuntimeConfig()

const kpis = computed(() => {
  if (!data.value) return []
  const c = data.value.current
  const p = data.value.previous
  return [
    { label: 'Umsatz (Warenwert)', value: euro(c.gmv, 0), delta: delta(c.gmv, p.gmv) },
    { label: 'Provision (5 %)', value: euro(c.commission, 0), delta: delta(c.commission, p.commission) },
    { label: 'Bestellungen', value: num(c.orders), delta: delta(c.orders, p.orders) },
    { label: 'Ø Bestellwert', value: euro(c.orders ? c.gmv / c.orders : 0), delta: delta(c.orders ? c.gmv / c.orders : 0, p.orders ? p.gmv / p.orders : 0) },
    { label: 'Verkaufte Karten', value: num(c.items), delta: delta(c.items, p.items) },
    { label: 'Aktive Käufer', value: num(c.buyers), delta: delta(c.buyers, p.buyers) },
  ]
})

const chart = computed(() => (data.value?.daily ?? []).map(d => ({
  label: new Date(d.day).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
  value: d.gmv,
})))
const gameTotal = computed(() => Math.max(1, (data.value?.byGame ?? []).reduce((s, g) => s + g.gmv, 0)))
</script>

<template>
  <div v-if="data">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-4xl">Auswertungen</h1>
        <p class="mt-1 text-sm text-ink-500">Bezahlte, nicht stornierte Sendungen. Vergleich mit dem Zeitraum davor.</p>
      </div>
      <div class="flex gap-1 rounded-full border border-ink-300 p-1 text-sm dark:border-ink-700">
        <button
          v-for="d in [7, 30, 90]"
          :key="d"
          class="rounded-full px-4 py-1"
          :class="days === d ? 'bg-ink-900 text-ink-50 dark:bg-gold-500 dark:text-ink-950' : 'text-ink-500'"
          @click="days = d"
        >
          {{ d }} Tage
        </button>
      </div>
    </div>

    <div class="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <div v-for="k in kpis" :key="k.label" class="panel">
        <p class="text-xs uppercase tracking-wider text-ink-400">{{ k.label }}</p>
        <p class="mt-2 text-2xl font-medium tabular-nums">{{ k.value }}</p>
        <p v-if="k.delta" class="mt-1 text-xs" :class="k.delta.up ? 'text-emerald-600' : 'text-red-600'">{{ k.delta.text }}</p>
      </div>
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
      <section class="panel">
        <h2 class="text-xl">Umsatz pro Tag</h2>
        <BarChart class="mt-4" :data="chart" :format="v => euro(v)" />
      </section>
      <section class="panel">
        <h2 class="text-xl">Nach Spiel</h2>
        <ul class="mt-4 space-y-4">
          <li v-for="g in data.byGame" :key="g.game">
            <div class="flex justify-between text-sm">
              <span>{{ GAME_LABEL[g.game] }}</span>
              <span class="tabular-nums">{{ euro(g.gmv, 0) }}</span>
            </div>
            <div class="mt-1 h-1.5 rounded-full bg-ink-100 dark:bg-ink-800">
              <div class="h-full rounded-full bg-gold-500" :style="{ width: `${(g.gmv / gameTotal) * 100}%` }" />
            </div>
            <p class="mt-1 text-xs text-ink-400">{{ num(g.items) }} Karten</p>
          </li>
        </ul>
      </section>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <section class="panel">
        <h2 class="text-xl">Bestand</h2>
        <dl class="mt-4 space-y-2 text-sm">
          <div class="flex justify-between"><dt class="text-ink-500">Aktive Angebote</dt><dd class="tabular-nums">{{ num(data.inventory.activeListings) }}</dd></div>
          <div class="flex justify-between"><dt class="text-ink-500">Verfügbare Karten</dt><dd class="tabular-nums">{{ num(data.inventory.units) }}</dd></div>
          <div class="flex justify-between"><dt class="text-ink-500">Warenwert im Angebot</dt><dd class="tabular-nums">{{ euro(data.inventory.value, 0) }}</dd></div>
          <div class="flex justify-between"><dt class="text-ink-500">Verkäufer mit Angeboten</dt><dd class="tabular-nums">{{ num(data.inventory.sellers) }}</dd></div>
          <div class="flex justify-between"><dt class="text-ink-500">Nutzer gesamt</dt><dd class="tabular-nums">{{ num(data.inventory.users) }}</dd></div>
          <div class="flex justify-between"><dt class="text-ink-500">Neue Nutzer im Zeitraum</dt><dd class="tabular-nums">{{ num(data.inventory.newUsers) }}</dd></div>
        </dl>
      </section>
      <section class="panel">
        <h2 class="text-xl">Sendungen nach Status</h2>
        <ul class="mt-4 space-y-2 text-sm">
          <li v-for="s in data.byStatus" :key="s.status" class="flex items-center justify-between">
            <StatusBadge :status="s.status" />
            <span class="tabular-nums">{{ num(s.count) }}</span>
          </li>
        </ul>
      </section>
      <section class="panel">
        <h2 class="text-xl">Top-Verkäufer</h2>
        <ul class="mt-4 space-y-2 text-sm">
          <li v-for="s in data.topSellers" :key="s.name" class="flex items-center justify-between gap-2">
            <span class="min-w-0 truncate">
              {{ s.name }}
              <span class="text-xs text-ink-400">{{ s.type === 'commercial' ? 'gewerblich' : 'privat' }} · {{ s.country }}<template v-if="s.rating"> · ★ {{ s.rating.toFixed(1) }}</template></span>
            </span>
            <span class="shrink-0 tabular-nums">{{ euro(s.gmv, 0) }}</span>
          </li>
        </ul>
      </section>
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-2">
      <section class="panel">
        <h2 class="text-xl">Meistverkaufte Produkte</h2>
        <table class="mt-4 w-full text-sm">
          <tbody>
            <tr v-for="p in data.topProducts" :key="`${p.game}-${p.slug}-${p.name}`" class="border-b border-ink-100 last:border-0 dark:border-ink-800">
              <td class="py-2">
                <a v-if="p.slug" :href="`${config.public.shopUrl}/${p.game}/cards/${p.slug}`" target="_blank" class="hover:text-gold-600">{{ p.name }}</a>
                <span v-else>{{ p.name }}</span>
                <span class="ml-1 text-xs text-ink-400">{{ GAME_LABEL[p.game] }}</span>
              </td>
              <td class="py-2 text-right text-ink-500 tabular-nums">{{ p.items }}×</td>
              <td class="py-2 text-right tabular-nums">{{ euro(p.gmv, 0) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section class="panel overflow-x-auto">
        <h2 class="text-xl">Letzte Bestellungen</h2>
        <table class="mt-4 w-full min-w-[480px] text-sm">
          <tbody>
            <tr v-for="o in data.recentOrders" :key="o.number" class="border-b border-ink-100 last:border-0 dark:border-ink-800">
              <td class="py-2">
                <span class="font-mono text-xs">{{ o.number }}</span>
                <span class="block text-xs text-ink-400">{{ o.buyer }} · {{ dateTime(o.createdAt) }}</span>
              </td>
              <td class="py-2">
                <div class="flex flex-wrap gap-1">
                  <StatusBadge v-for="(s, i) in o.shipments" :key="i" :status="s" />
                </div>
              </td>
              <td class="py-2 text-right tabular-nums">{{ euro(o.total) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>
