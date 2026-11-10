<script setup lang="ts">
import type { AdsOverview } from '~/types/admin'

/** Werbung gewerblicher Kunden: Regeln, laufende Werbung mit Klicks, Verkäufen und Werbeertrag. Abgerechnet wird nur bei Verkauf über die Anzeige. */
const { data, refresh, error, status } = await useFetch<AdsOverview>('/api/ads')
useSeoMeta({ title: 'Werbung – CardTreasure CMS' })
</script>

<template>
  <div>
    <PageHeader title="Werbung" description="Gewerbliche Kunden bewerben einzelne Angebote. Sie zahlen eine Werbeprovision auf den Warenwert, nur wenn der Käufer vorher auf die Anzeige geklickt hat. Höherer Satz, bessere Platzierung." />
    <UiNotice v-if="error" tone="danger" class="mt-4">Shop nicht erreichbar: {{ error.statusMessage }}</UiNotice>
    <p v-else-if="status === 'pending'" class="mt-6 text-small text-fg-subtle" aria-live="polite">Wird geladen …</p>

    <div v-if="data" class="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
      <div class="space-y-6">
        <Panel title="Werbeertrag">
          <div class="flex flex-wrap gap-6">
            <Stat label="Letzte 30 Tage" :value="euro(data.totals.revenue30Cents)" size="lg" />
            <Stat label="Gesamt" :value="euro(data.totals.revenueCents)" />
            <Stat label="Verkäufe über Anzeigen" :value="num(data.totals.sales)" />
          </div>
          <p class="mt-3 text-meta text-fg-subtle">Nur abgeschlossene Sendungen. Bei Storno wird keine Werbeprovision berechnet.</p>
        </Panel>
        <Panel title="Regeln"><AdsSettingsForm :key="JSON.stringify(data.settings)" :settings="data.settings" @saved="() => refresh()" /></Panel>
      </div>

      <Panel :title="`Laufende Werbung (${data.promotions.length})`">
        <EmptyState v-if="!data.promotions.length">Gerade bewirbt niemand ein Angebot.</EmptyState>
        <UiTable v-else :min-width="820">
          <template #head>
            <th>Angebot</th><th>Händler</th><th class="text-right">Satz</th><th class="text-right">Klicks (30 T.)</th>
            <th class="text-right">Verkäufe</th><th class="text-right">Ertrag</th><th>Status</th><th />
          </template>
          <AdsPromotionRow v-for="p in data.promotions" :key="p.listingId" :promotion="p" @changed="refresh" />
        </UiTable>
      </Panel>
    </div>
  </div>
</template>
