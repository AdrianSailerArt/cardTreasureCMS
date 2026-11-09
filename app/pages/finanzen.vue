<script setup lang="ts">
/** Plattform-Finanzen: Guthaben der Nutzer, Treuhand, Provision, Auszahlungen; Monatsverlauf; höchste Guthaben. */
interface Finance {
  totals: { balancesCents: number, accounts: number, escrowCents: number, escrowShipments: number, commissionCents: number, payoutsCents: number, refundsCents: number }
  monthly: { month: string, gmvCents: number, commissionCents: number, payoutsCents: number, refundsCents: number }[]
  topBalances: { userId: string, name: string, email: string, balanceCents: number }[]
}
const { data } = await useFetch<Finance>('/api/stats/finance')
useSeoMeta({ title: 'Finanzen – CardTreasure CMS' })
</script>

<template>
  <div v-if="data">
    <PageHeader title="Finanzen" description="Aus dem Buchungsjournal. Guthaben und Treuhand sind Geld, das Nutzern gehört; Provision ist der Ertrag der Plattform." />
    <div class="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
      <KpiCard label="Guthaben der Nutzer" :value="euro(data.totals.balancesCents, 0)" />
      <KpiCard label="In Treuhand" :value="euro(data.totals.escrowCents, 0)" />
      <KpiCard label="Provision gesamt" :value="euro(data.totals.commissionCents, 0)" />
      <KpiCard label="Ausgezahlt" :value="euro(data.totals.payoutsCents, 0)" />
      <KpiCard label="Erstattet" :value="euro(data.totals.refundsCents, 0)" />
    </div>
    <p class="mt-2 text-xs text-fg-subtle">{{ num(data.totals.accounts) }} Konten mit Guthaben · {{ num(data.totals.escrowShipments) }} offene Sendungen in Treuhand</p>

    <Panel class="mt-6" title="Pro Monat (12 Monate)">
      <FinanceMonthlyChart :monthly="data.monthly" />
    </Panel>

    <Panel class="mt-6" title="Höchste Guthaben">
      <UiTable :min-width="480">
        <template #head><th>Konto</th><th>E-Mail</th><th class="text-right">Guthaben</th></template>
        <tr v-for="b in data.topBalances" :key="b.userId">
          <td><NuxtLink :to="`/nutzer/${b.userId}`" class="hover:text-accent">{{ b.name }}</NuxtLink></td>
          <td class="text-fg-muted">{{ b.email }}</td>
          <td class="text-right tabular-nums">{{ euro(b.balanceCents) }}</td>
        </tr>
      </UiTable>
    </Panel>
  </div>
</template>
