<script setup lang="ts">
import type { FinanceArea, FinanceChecks, FinanceFinding, PaymentIncident } from '~/types/admin'

/**
 * Prüfungen im Zahlungsverkehr: Der Shop rechnet Bestellungen, Zahlungen, Sendungen und Guthaben gegeneinander
 * und meldet, was nicht stimmt (Einzahlung, Erstattung, Auszahlung, Provision). Dazu Vorfälle, die der Zahlungsdienst
 * meldet (Rückbuchung, gescheiterte Erstattung …) und die jemand erledigen muss.
 */
const { data, error, refresh, status } = await useFetch<FinanceChecks>('/api/finance/checks')

const AREAS: { id: FinanceArea, label: string }[] = [
  { id: 'payin', label: 'Einzahlung' }, { id: 'refund', label: 'Erstattung' }, { id: 'payout', label: 'Auszahlung' }, { id: 'commission', label: 'Provision und Gutschrift' },
]
const AREA_LABEL = Object.fromEntries(AREAS.map(a => [a.id, a.label])) as Record<FinanceArea, string>
const INCIDENT: Record<string, string> = {
  chargeback: 'Rückbuchung', amount_mismatch: 'Abweichender Betrag', refund_failed: 'Erstattung gescheitert',
  payout_failed: 'Auszahlung gescheitert', transfer_reversed: 'Überweisung zurückgeholt', job_error: 'Abgleich-Fehler',
}
const SEVERITY = { danger: 'Fehler', warning: 'prüfen' } as const

/** Ampel je Bereich: rot bei einem Fehler, gelb bei Hinweisen, sonst grün */
const areas = computed(() => AREAS.map((a) => {
  const found = (data.value?.findings ?? []).filter(f => f.area === a.id)
  const tone = found.some(f => f.severity === 'danger') ? 'danger' as const : found.length ? 'warning' as const : 'success' as const
  return { ...a, count: found.length, tone, checks: (data.value?.checks ?? []).filter(c => c.area === a.id).length }
}))
const openIncidents = computed(() => (data.value?.incidents ?? []).filter(i => !i.resolvedAt))
const doneIncidents = computed(() => (data.value?.incidents ?? []).filter(i => i.resolvedAt))
const subject = (f: FinanceFinding | PaymentIncident) => [f.orderNumber, f.customer].filter(Boolean).join(' · ') || '–'

// Vorfall erledigen: Notiz ist Pflicht, damit später nachvollziehbar ist, was getan wurde
const resolving = ref<string | null>(null)
const note = ref('')
const busy = ref(false)
const resolveError = ref<string | null>(null)
const startResolve = (id: string) => {
  resolving.value = id
  note.value = ''
  resolveError.value = null
}
const resolve = async () => {
  if (!resolving.value) return
  busy.value = true
  resolveError.value = null
  try {
    await $fetch(`/api/finance/incidents/${resolving.value}/resolve`, { method: 'POST', body: { resolution: note.value } })
    resolving.value = null
    await refresh()
  }
  catch (e) {
    resolveError.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Speichern fehlgeschlagen'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <Panel title="Prüfungen im Zahlungsverkehr">
    <template #actions>
      <UiButton size="sm" variant="ghost" :disabled="status === 'pending'" @click="refresh()">Neu prüfen</UiButton>
    </template>
    <UiNotice v-if="error" tone="danger">Shop nicht erreichbar: {{ error.statusMessage }}</UiNotice>
    <div v-else-if="data" aria-live="polite">
      <ul class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <li v-for="a in areas" :key="a.id" class="rounded-md border border-line p-3">
          <p class="flex items-center justify-between gap-2">
            <span class="text-label text-fg-subtle">{{ a.label }}</span>
            <Tag :tone="a.tone">{{ a.count ? `${a.count} ${a.tone === 'danger' ? 'Auffälligkeit(en)' : 'Hinweis(e)'}` : 'in Ordnung' }}</Tag>
          </p>
          <p class="mt-1 text-meta text-fg-subtle">{{ a.checks }} Prüfungen</p>
        </li>
      </ul>
      <p class="mt-2 text-meta text-fg-subtle">Zuletzt geprüft {{ dateTime(data.checkedAt) }}. Der Shop prüft außerdem alle fünf Minuten im Abgleich-Job.</p>

      <h3 class="mt-6 text-label text-fg-subtle">Vorfälle ({{ openIncidents.length }} offen)</h3>
      <EmptyState v-if="!openIncidents.length" class="mt-2" title="Keine offenen Vorfälle">
        Rückbuchungen, gescheiterte Erstattungen oder Auszahlungen und abweichende Beträge erscheinen hier, sobald sie auftreten.
      </EmptyState>
      <UiTable v-else :min-width="720" class="mt-2">
        <template #head><th>Vorfall</th><th>Bestellung · Kunde</th><th class="text-right">Betrag</th><th>Seit</th><th><span class="sr-only">Aktion</span></th></template>
        <template v-for="i in openIncidents" :key="i.id">
          <tr>
            <td>
              <span class="flex flex-wrap items-center gap-2"><Tag :tone="i.severity">{{ SEVERITY[i.severity] }}</Tag><span class="font-medium">{{ INCIDENT[i.kind] ?? i.kind }}</span></span>
              <span class="mt-1 block text-small text-fg-muted">{{ i.message }}</span>
              <span v-if="i.providerRef" class="block font-mono text-meta text-fg-subtle">{{ i.providerRef }}</span>
            </td>
            <td>
              <NuxtLink v-if="i.userId" :to="`/customers/${i.userId}`" class="hover:text-accent">{{ subject(i) }}</NuxtLink>
              <span v-else>{{ subject(i) }}</span>
            </td>
            <td class="text-right tabular-nums">{{ i.amountCents === null ? '–' : euro(i.amountCents) }}</td>
            <td class="whitespace-nowrap text-fg-muted">{{ dateTime(i.createdAt) }}</td>
            <td class="text-right"><UiButton v-if="resolving !== i.id" size="sm" variant="ghost" @click="startResolve(i.id)">Erledigen</UiButton></td>
          </tr>
          <tr v-if="resolving === i.id">
            <td :colspan="5">
              <form class="flex flex-wrap items-end gap-2 pb-2" @submit.prevent="resolve">
                <UiField label="Was wurde getan?" class="min-w-64 flex-1">
                  <UiInput v-model="note" placeholder="z.B. Betrag von Hand erstattet, Beleg beim Zahlungsdienst eingereicht" />
                </UiField>
                <UiButton type="submit" size="sm" :disabled="busy || note.trim().length < 3">Als erledigt speichern</UiButton>
                <UiButton size="sm" variant="ghost" :disabled="busy" @click="resolving = null">Abbrechen</UiButton>
                <UiNotice v-if="resolveError" tone="danger" class="basis-full">{{ resolveError }}</UiNotice>
              </form>
            </td>
          </tr>
        </template>
      </UiTable>

      <h3 class="mt-6 text-label text-fg-subtle">Auffälligkeiten aus den Prüfungen ({{ data.findings.length }})</h3>
      <EmptyState v-if="!data.findings.length" class="mt-2" title="Alles stimmt">
        Zahlungen, Erstattungen, Auszahlungen, Provision und Gutschriften passen zu den Bestellungen.
      </EmptyState>
      <UiTable v-else :min-width="720" class="mt-2">
        <template #head><th>Bereich</th><th>Was nicht stimmt</th><th>Bestellung · Kunde</th><th class="text-right">Betrag</th><th>Seit</th></template>
        <tr v-for="(f, n) in data.findings" :key="`${f.check}-${f.ref}-${n}`">
          <td><span class="flex flex-wrap items-center gap-2"><Tag :tone="f.severity">{{ SEVERITY[f.severity] }}</Tag>{{ AREA_LABEL[f.area] }}</span></td>
          <td>{{ f.message }}<span class="block font-mono text-meta text-fg-subtle">{{ f.check }}</span></td>
          <td>
            <NuxtLink v-if="f.userId" :to="`/customers/${f.userId}`" class="hover:text-accent">{{ subject(f) }}</NuxtLink>
            <span v-else>{{ subject(f) }}</span>
          </td>
          <td class="text-right tabular-nums">{{ f.amountCents === null ? '–' : euro(f.amountCents) }}</td>
          <td class="whitespace-nowrap text-fg-muted">{{ f.since ? dateTime(f.since) : '–' }}</td>
        </tr>
      </UiTable>

      <details v-if="doneIncidents.length" class="mt-6">
        <summary class="cursor-pointer text-label text-fg-subtle">Erledigte Vorfälle der letzten 30 Tage ({{ doneIncidents.length }})</summary>
        <ul class="mt-2 divide-y divide-line text-small">
          <li v-for="i in doneIncidents" :key="i.id" class="py-2">
            <span class="font-medium">{{ INCIDENT[i.kind] ?? i.kind }}</span> · {{ subject(i) }} · {{ dateTime(i.createdAt) }}
            <span class="block text-fg-muted">{{ i.message }}</span>
            <span class="block text-meta text-fg-subtle">Erledigt {{ dateTime(i.resolvedAt) }}: {{ i.resolution }}</span>
          </li>
        </ul>
      </details>
    </div>
  </Panel>
</template>
