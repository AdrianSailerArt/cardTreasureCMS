<script setup lang="ts">
import type { PlatformListing, PlatformSale } from '~/types/admin'

/** Eigener Shop: Artikel, die CardTreasure selbst verkauft (nur an Privatkunden), und deren Verkäufe zum Packen und Versenden. */
const tab = ref<'listings' | 'sales'>('listings')
const tabs = [{ value: 'listings' as const, label: 'Angebote' }, { value: 'sales' as const, label: 'Verkäufe' }]
const { data: listings, refresh: refreshListings, error } = await useFetch<PlatformListing[]>('/api/shop/listings', { default: () => [] })
const { data: sales, refresh: refreshSales } = await useFetch<PlatformSale[]>('/api/shop/sales', { default: () => [] })
const filter = ref('')
const visible = computed(() => {
  const q = filter.value.trim().toLowerCase()
  return q ? listings.value.filter(l => l.name.toLowerCase().includes(q) || l.storageLocation?.toLowerCase().includes(q)) : listings.value
})
const open = computed(() => sales.value.filter(s => s.status === 'paid').length)
useSeoMeta({ title: 'Eigener Shop – CardTreasure CMS' })
</script>

<template>
  <div>
    <PageHeader title="Eigener Shop" description="Artikel, die CardTreasure selbst verkauft. Im Shop mit „Direkt von CardTreasure“ gekennzeichnet und nur für Privatkunden kaufbar.">
      <UiSegmented v-model="tab" :options="tabs" label="Bereich" />
    </PageHeader>
    <UiNotice v-if="error" tone="danger" class="mt-4">Shop nicht erreichbar: {{ error.statusMessage }}</UiNotice>

    <template v-if="tab === 'listings'">
      <Panel class="mt-6" title="Neues Angebot"><PlatformListingCreate @created="refreshListings()" /></Panel>
      <Panel class="mt-6" :title="`Angebote (${listings.length})`">
        <template #actions><div class="w-64"><UiInput v-model="filter" placeholder="Name oder Lagerplatz …" aria-label="Angebote filtern" /></div></template>
        <UiTable :min-width="900">
          <template #head><th>Artikel</th><th>Zustand</th><th>Menge</th><th>Preis €</th><th>Lagerplatz</th><th class="text-right">Verkauft</th><th>Status</th><th /></template>
          <PlatformListingRow v-for="l in visible" :key="`${l.id}-${l.quantity}-${l.priceCents}-${l.storageLocation}-${l.status}`" :listing="l" @changed="refreshListings()" />
          <tr v-if="!visible.length"><td colspan="8" class="py-4"><EmptyState>Noch keine eigenen Angebote. Oben eine Karte suchen und anlegen.</EmptyState></td></tr>
        </UiTable>
      </Panel>
    </template>

    <template v-else>
      <p class="mt-6 text-small text-fg-muted">{{ open }} offene Verkäufe zum Packen. Packliste nach Lagerplatz sortiert.</p>
      <div class="mt-4 grid gap-4">
        <PlatformSaleRow v-for="s in sales" :key="s.id" :sale="s" @changed="refreshSales(); refreshListings()" />
        <EmptyState v-if="!sales.length">Noch keine Verkäufe.</EmptyState>
      </div>
    </template>
  </div>
</template>
