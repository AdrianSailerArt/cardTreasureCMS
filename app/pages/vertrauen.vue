<script setup lang="ts">
import type { SellerRisk } from '~/types/admin'

/** Vertrauen: auffällige Verkäufer (Regeln aus dem Shop) und schlechte Bewertungen, mit Moderation. */
const tab = ref<'sellers' | 'reviews'>('sellers')
const all = ref(false)
const { data: risks, refresh: refreshRisks, error: riskError } = await useFetch<SellerRisk[]>('/api/risks', { query: computed(() => (all.value ? { all: '1' } : {})), default: () => [] })
const { data: reviews, refresh: refreshReviews } = await useFetch<{ id: string, ratingOverall: number, deliveredComplete: boolean, comment: string | null, hidden: boolean, createdAt: string, authorId: string, author: string, subjectId: string, subject: string, orderNumber: string }[]>('/api/reviews/recent', { query: { bad: '1' }, default: () => [] })
const tabs = [{ value: 'sellers' as const, label: 'Verkäufer' }, { value: 'reviews' as const, label: 'Schlechte Bewertungen' }]
const pct = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)} %`)
useSeoMeta({ title: 'Vertrauen – CardTreasure CMS' })
</script>

<template>
  <div>
    <PageHeader title="Vertrauen" description="Risikosignale aus dem Shop: Stufe „auffällig“, überfällige Sendungen (über 5 Tage), Stornos durch Verkäufer (90 Tage), schlechte Bewertungen (30 Tage).">
      <UiSegmented v-model="tab" :options="tabs" />
    </PageHeader>

    <Panel v-if="tab === 'sellers'" class="mt-6">
      <template #actions>
        <label class="flex items-center gap-2 text-sm"><input v-model="all" type="checkbox" class="accent-accent"> alle Verkäufer zeigen</label>
      </template>
      <UiNotice v-if="riskError" tone="danger">Shop nicht erreichbar: {{ riskError.statusMessage }}</UiNotice>
      <UiTable :min-width="900">
        <template #head>
          <th>Verkäufer</th><th>Signale</th><th class="text-right">Wert</th><th class="text-right">Bewertungen</th><th class="text-right">Ø</th><th class="text-right">vollständig</th><th class="text-right">überfällig</th><th class="text-right">Stornos</th><th class="text-right">Angebote</th><th />
        </template>
        <tr v-for="r in risks" :key="r.sellerId">
          <td><span class="flex items-center gap-2"><CountryFlag :code="r.country" /><NuxtLink :to="`/nutzer/${r.sellerId}`" class="hover:text-accent">{{ r.name }}</NuxtLink></span></td>
          <td><ModerationRiskFlags :flags="r.flags" :blocked="r.blocked" /></td>
          <td class="text-right tabular-nums">{{ r.score }}</td>
          <td class="text-right tabular-nums">{{ r.ratedSales }}</td>
          <td class="text-right tabular-nums">{{ r.avgOverall?.toFixed(1) ?? '–' }}</td>
          <td class="text-right tabular-nums">{{ pct(r.completeRate) }}</td>
          <td class="text-right tabular-nums" :class="r.overdue ? 'text-warning' : ''">{{ r.overdue }}</td>
          <td class="text-right tabular-nums">{{ r.sellerCancels }}</td>
          <td class="text-right tabular-nums">{{ r.activeListings }}</td>
          <td class="text-right"><ModerationActionButton v-if="!r.blocked" label="Sperren" action="block" :payload="{ userId: r.sellerId }" @done="refreshRisks" /></td>
        </tr>
        <tr v-if="!risks.length"><td colspan="10" class="py-6 text-fg-muted">Keine auffälligen Verkäufer.</td></tr>
      </UiTable>
    </Panel>

    <Panel v-else class="mt-6" title="Bewertungen mit 1–2 Sternen oder unvollständiger Lieferung">
      <div class="divide-y divide-line">
        <ModerationReviewRow
          v-for="r in reviews"
          :key="r.id"
          :review="r"
          :title="`${r.author} über ${r.subject} · ${r.orderNumber}`"
          @changed="refreshReviews"
        />
      </div>
      <p v-if="!reviews.length" class="text-sm text-fg-muted">Keine schlechten Bewertungen.</p>
    </Panel>
  </div>
</template>
