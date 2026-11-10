<script setup lang="ts">
import type { CustomerCommission } from '~/types/admin'

/** Kunden-Detail: Art (privat/gewerblich), Konto, Kennzahlen, Sperre, Angebote (entfernen), Bewertungen (Text ausblenden), Protokoll. */
interface UserDetail {
  user: { id: string, name: string, email: string, role: string, locale: string, createdAt: string, blockedAt: string | null, blockedReason: string | null, blockedUntil: string | null, isDemo: boolean, displayName: string | null, sellerType: 'private' | 'commercial', companyName: string | null, vatId: string | null, country: string | null, purchases: number, sales: number, balanceCents: number }
  listings: { id: string, name: string, game: string, slug: string | null, kind: string, condition: string | null, priceCents: number, quantity: number, status: string }[]
  reviews: { id: string, direction: string, ratingOverall: number, deliveredComplete: boolean, comment: string | null, hidden: boolean, createdAt: string, otherId: string, other: string }[]
  log: { id: string, action: string, reason: string | null, createdAt: string, admin: string | null, targetType: string }[]
}
const route = useRoute()
const shopUrl = useRuntimeConfig().public.shopUrl
const { data, error, refresh } = await useFetch<UserDetail>(() => `/api/users/${route.params.id}`)
if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Kunde nicht gefunden', fatal: true })
const u = computed(() => data.value!.user)
const { data: commission, refresh: refreshCommission } = await useFetch<CustomerCommission>(() => `/api/commission/customer/${route.params.id}`, { immediate: true })
const ACTION_LABEL: Record<string, string> = { resolve_report: 'Meldung bearbeitet', dismiss_report: 'Meldung verworfen', grant_commission: 'Provision freigegeben', end_commission: 'Provision beendet', block_user: 'gesperrt', unblock_user: 'entsperrt', remove_listing: 'Angebot entfernt', hide_review: 'Bewertungstext ausgeblendet', show_review: 'Bewertungstext wieder gezeigt' }
const LISTING_TONE: Record<string, 'success' | 'warning' | 'neutral'> = { active: 'success', paused: 'warning', sold_out: 'neutral' }
useSeoMeta({ title: () => `${u.value.name} – Kunden – CardTreasure CMS` })
</script>

<template>
  <div v-if="data">
    <PageHeader :title="u.name" :description="u.email">
      <template #above><NuxtLink to="/customers" class="text-small text-fg-subtle hover:text-accent">← Kunden</NuxtLink></template>
      <CustomerKindTag :role="u.role" :seller-type="u.sellerType" />
      <a :href="`${shopUrl}/profile/${u.id}`" target="_blank" class="text-small text-fg-subtle hover:text-accent">Öffentliches Profil ↗</a>
    </PageHeader>

    <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
      <Panel title="Konto">
        <KeyValueList :items="[
          { label: 'Art', value: u.role === 'admin' ? 'Admin' : u.sellerType === 'commercial' ? 'gewerblich' : 'privat' },
          ...(u.sellerType === 'commercial' ? [{ label: 'Firma', value: u.companyName ?? '– fehlt –' }, { label: 'USt-ID', value: u.vatId ?? '– fehlt –' }] : []),
          { label: 'Anzeigename', value: u.displayName ? `${u.displayName}${u.country ? ` (${u.country})` : ''}` : '– (noch nichts eingestellt)' },
          { label: 'Sprache', value: u.locale.toUpperCase() },
          { label: 'Mitglied seit', value: dateTime(u.createdAt) },
          { label: 'Käufe', value: num(u.purchases) },
          { label: 'Verkäufe', value: num(u.sales) },
          { label: 'Guthaben', value: euro(u.balanceCents) },
        ]" />
      </Panel>
      <Panel title="Status">
        <template v-if="u.blockedAt">
          <Tag tone="danger">gesperrt seit {{ dateTime(u.blockedAt) }}</Tag>
          <Tag :tone="u.blockedUntil ? 'warning' : 'danger'" class="ml-1">{{ u.blockedUntil ? `bis ${dateTime(u.blockedUntil)}` : 'unbefristet' }}</Tag>
          <p class="mt-2 text-small text-fg-muted">Grund: {{ u.blockedReason }}</p>
          <div class="mt-4"><ModerationActionButton label="Entsperren" action="unblock" tone="neutral" :require-reason="false" :payload="{ userId: u.id }" @done="refresh" /></div>
        </template>
        <template v-else>
          <Tag tone="success">aktiv</Tag>
          <p class="mt-2 text-small text-fg-muted">Sperren beendet alle Sitzungen und pausiert alle Angebote. Offene Sendungen laufen weiter.</p>
          <div v-if="u.role !== 'admin'" class="mt-4"><ModerationActionButton label="Sperren" action="block" :payload="{ userId: u.id }" @done="refresh" /></div>
        </template>
      </Panel>
    </div>

    <Panel v-if="commission" class="mt-6" title="Provision">
      <p class="text-small">
        Aktuell <strong class="tabular-nums">{{ percent(commission.current.rateBps) }}</strong>
        <Tag v-if="commission.current.source === 'override'" tone="success" class="ml-2">individuell</Tag>
        <Tag v-else class="ml-2">allgemeiner Satz</Tag>
        <span v-if="commission.current.source === 'override'" class="ml-2 text-fg-muted">(allgemein: {{ (commission.current.baseRateBps / 100).toLocaleString('de-DE') }} %)</span>
      </p>
      <div class="mt-4 border-t border-line pt-4">
        <CommissionGrantForm :seller-id="u.id" :seller-name="u.displayName ?? u.name" @done="() => { refreshCommission(); refresh() }" />
      </div>
      <div v-if="commission.overrides.length" class="mt-4"><CommissionOverrideList :overrides="commission.overrides" @changed="() => { refreshCommission(); refresh() }" /></div>
    </Panel>

    <Panel v-if="data.listings.length" class="mt-6" :title="`Angebote (${data.listings.length})`">
      <UiTable :min-width="720">
        <template #head><th>Artikel</th><th>Zustand</th><th class="text-right">Menge</th><th class="text-right">Preis</th><th>Status</th><th /></template>
        <tr v-for="l in data.listings" :key="l.id">
          <td>
            <a :href="`${shopUrl}/${l.game}/${l.kind === 'sealed' ? 'sealed' : 'cards'}/${l.slug}`" target="_blank" class="hover:text-accent">{{ l.name }}</a>
            <span class="ml-1 text-meta text-fg-subtle">{{ GAME_LABEL[l.game] }}</span>
          </td>
          <td class="text-fg-muted">{{ l.condition ?? 'Sealed' }}</td>
          <td class="text-right tabular-nums">{{ l.quantity }}</td>
          <td class="text-right tabular-nums">{{ euro(l.priceCents) }}</td>
          <td><Tag :tone="LISTING_TONE[l.status] ?? 'neutral'">{{ l.status }}</Tag></td>
          <td class="text-right"><ModerationActionButton label="Entfernen" action="remove-listing" :payload="{ listingId: l.id }" @done="refresh" /></td>
        </tr>
      </UiTable>
    </Panel>

    <Panel v-if="data.reviews.length" class="mt-6" title="Bewertungen">
      <div class="divide-y divide-line">
        <ModerationReviewRow
          v-for="r in data.reviews"
          :key="r.id"
          :review="r"
          :title="r.direction === 'received' ? `von ${r.other}` : `über ${r.other}`"
          @changed="refresh"
        />
      </div>
    </Panel>

    <Panel class="mt-6" title="Moderations-Protokoll">
      <ul v-if="data.log.length" class="divide-y divide-line text-small">
        <li v-for="e in data.log" :key="e.id" class="flex flex-wrap gap-x-3 py-2">
          <span class="tabular-nums text-fg-subtle">{{ dateTime(e.createdAt) }}</span>
          <span>{{ ACTION_LABEL[e.action] ?? e.action }}</span>
          <span v-if="e.reason" class="text-fg-muted">„{{ e.reason }}“</span>
          <span class="ml-auto text-meta text-fg-subtle">{{ e.admin ?? 'unbekannt' }}</span>
        </li>
      </ul>
      <p v-else class="text-small text-fg-muted">Noch keine Eingriffe.</p>
    </Panel>
  </div>
</template>
