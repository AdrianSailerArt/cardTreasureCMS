<script setup lang="ts">
import type { Ampel, Reconciliation } from '~/types/admin'

/**
 * Kassenabgleich: stimmt der Stripe-Saldo mit unseren Buchungen überein (Ampel 1), und ist alles gedeckt,
 * was Kunden zusteht (Ampel 2)? Darunter der Ertrag der Plattform. Ohne Stripe (lokal) nur ein Hinweis.
 */
const { data, error, refresh, status } = await useFetch<Reconciliation>('/api/finance/reconciliation')
const MATCH: Record<Ampel, string> = { success: 'stimmt', warning: 'prüfen', danger: 'Abweichung' }
const COVER: Record<Ampel, string> = { success: 'gedeckt', warning: 'knapp', danger: 'nicht gedeckt' }
const signed = (c: number) => `${c > 0 ? '+' : ''}${euro(c)}`
</script>

<template>
  <Panel title="Kassenabgleich mit Stripe">
    <template #actions>
      <UiButton size="sm" variant="ghost" :disabled="status === 'pending'" @click="refresh()">Neu abgleichen</UiButton>
    </template>
    <UiNotice v-if="error" tone="danger">Shop nicht erreichbar: {{ error.statusMessage }}</UiNotice>
    <EmptyState v-else-if="data && !data.available" title="Stripe ist im Shop nicht eingerichtet">
      Ohne Stripe-Schlüssel gibt es keinen Abgleich; lokal laufen Zahlungen über die Testkarte.
    </EmptyState>
    <div v-else-if="data && data.available" class="grid gap-6 lg:grid-cols-3">
      <section>
        <p class="flex items-center gap-2"><span class="text-label text-fg-subtle">Buchungen ↔ Stripe</span><Tag :tone="data.match">{{ MATCH[data.match] }}</Tag></p>
        <p class="mt-2 text-small text-fg-muted">Was laut Buchungen bei Stripe sein müsste, verglichen mit dem, was Stripe meldet.</p>
        <KeyValueList class="mt-3" :items="[
          { label: 'Zahlungseingänge', value: euro(data.booked.inCents) },
          { label: 'Gebühren auf Zahlungen', value: `−${euro(data.booked.feesCents)}` },
          { label: 'Connect-Gebühren (Konten, Auszahlungen)', value: `−${euro(data.booked.connectFeesCents)}` },
          { label: 'Erstattungen', value: `−${euro(data.booked.refundsCents)}` },
          { label: 'Überweisungen an Verkäufer', value: `−${euro(data.booked.transfersCents)}` },
          { label: 'Soll laut Buchungen', value: euro(data.booked.expectedCents) },
          { label: 'Stripe: verfügbar + unterwegs', value: euro(data.stripe.availableCents + data.stripe.pendingCents) },
          { label: 'Stripe: auf Firmenkonto ausgezahlt', value: euro(data.stripe.paidOutCents) },
          { label: 'Abweichung', value: signed(data.differenceCents) },
        ]" />
        <p v-if="data.unmatched.length" class="mt-2 text-meta text-warning">{{ data.unmatched.length }} Stripe-Buchung(en) ohne Gegenstück im Shop, siehe unten.</p>
        <p v-if="data.booked.feesMissing" class="mt-2 text-meta text-warning">{{ data.booked.feesMissing }} Zahlung(en) noch ohne gemeldete Gebühr, die Abweichung kann daher kommen.</p>
      </section>

      <section>
        <p class="flex items-center gap-2"><span class="text-label text-fg-subtle">Deckung</span><Tag :tone="data.coverage">{{ COVER[data.coverage] }}</Tag></p>
        <p class="mt-2 text-small text-fg-muted">Was Kunden zusteht, muss auf dem Stripe-Konto liegen (ohne das, was schon aufs Firmenkonto ging).</p>
        <KeyValueList class="mt-3" :items="[
          { label: 'Guthaben der Kunden', value: euro(data.owed.balancesCents) },
          { label: 'Treuhand offener Sendungen', value: euro(data.owed.escrowCents) },
          { label: 'Auszahlungen in Arbeit', value: euro(data.owed.payoutsInProgressCents) },
          { label: 'Offene Erstattungen', value: euro(data.owed.refundsPendingCents) },
          { label: 'Ansprüche gesamt', value: euro(data.owed.totalCents) },
          { label: 'Stripe-Saldo', value: euro(data.stripe.availableCents + data.stripe.pendingCents) },
          { label: 'Überdeckung', value: signed(data.coverageCents) },
        ]" />
        <p v-if="data.testCardCents" class="mt-2 text-meta text-fg-subtle">{{ euro(data.testCardCents) }} wurden lokal mit der Testkarte „bezahlt“ (ohne Geld) und tauchen nur in den Ansprüchen auf.</p>
      </section>

      <section>
        <p class="text-label text-fg-subtle">Ertrag der Plattform</p>
        <p class="mt-2 text-small text-fg-muted">Provision plus an Verkäufer weitergegebene Gebühren, abzüglich der Gebühren, die Stripe uns berechnet (Zahlungen, Connect). Soll nie negativ sein.</p>
        <div class="mt-3 flex flex-wrap gap-6">
          <Stat label="Provision" :value="euro(data.platform.commissionCents)" />
          <Stat label="Weitergegeben" :value="euro(data.platform.feesChargedCents)" />
          <Stat label="Zahlungsgebühren" :value="`−${euro(data.platform.feesCents)}`" />
          <Stat label="Connect" :value="`−${euro(data.platform.connectFeesCents)}`" />
          <Stat label="Netto" :value="euro(data.platform.netCents)" size="lg" />
          <Tag v-if="data.platform.netCents < 0" tone="danger">Verlust</Tag>
        </div>
      </section>

      <section v-if="data.unmatched.length" class="lg:col-span-3">
        <p class="text-label text-fg-subtle">Bei Stripe, aber keiner Bestellung, Erstattung oder Auszahlung zugeordnet</p>
        <p class="mt-1 text-small text-fg-muted">Erklärt Abweichungen: z.B. Beispieldaten der Stripe-Sandbox, manuelle Buchungen im Stripe-Dashboard oder Zahlungen aus einem anderen System.</p>
        <UiTable class="mt-3" :min-width="640">
          <template #head><th>Datum</th><th>Art</th><th>Beschreibung</th><th class="text-right">Betrag</th><th class="text-right">Gebühr</th><th class="text-right">Netto</th></template>
          <tr v-for="t in data.unmatched" :key="t.id">
            <td class="tabular-nums text-fg-muted">{{ dateTime(t.createdAt) }}</td>
            <td><Tag>{{ t.type }}</Tag></td>
            <td class="text-fg-muted">{{ t.description ?? t.ref ?? '–' }}</td>
            <td class="text-right tabular-nums">{{ euro(t.amountCents) }}</td>
            <td class="text-right tabular-nums text-fg-muted">{{ euro(t.feeCents) }}</td>
            <td class="text-right tabular-nums">{{ euro(t.netCents) }}</td>
          </tr>
        </UiTable>
      </section>
    </div>
  </Panel>
</template>
