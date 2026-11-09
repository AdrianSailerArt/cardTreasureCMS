<script setup lang="ts">
import type { CommissionOverride } from '~/types/admin'

/** Provision: ein Satz für alle Kunden, Ausnahmen nur per ausdrücklicher Freigabe. Änderungen gelten für neue Verkäufe. */
const { data, refresh, error } = await useFetch<{ rateBps: number, overrides: CommissionOverride[] }>('/api/commission')

const rate = ref<number | null>(null)
watch(data, (d) => { rate.value = d?.rateBps ?? null }, { immediate: true })
const changed = computed(() => data.value !== undefined && rate.value !== data.value?.rateBps)
const saving = ref(false)
const saved = ref(false)
const saveError = ref<string | null>(null)
const saveRate = async () => {
  saving.value = true
  saveError.value = null
  saved.value = false
  try {
    await $fetch('/api/commission/rate', { method: 'PUT', body: { rateBps: rate.value } })
    saved.value = true
    await refresh()
  }
  catch (e) {
    saveError.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Speichern fehlgeschlagen'
  }
  finally {
    saving.value = false
  }
}
const active = computed(() => data.value?.overrides.filter(o => o.active) ?? [])
const past = computed(() => data.value?.overrides.filter(o => !o.active) ?? [])
useSeoMeta({ title: 'Provision – CardTreasure CMS' })
</script>

<template>
  <div>
    <PageHeader title="Provision" description="Satz auf den Warenwert, für alle Kunden gleich. Abweichungen nur, wenn wir sie einem Kunden ausdrücklich freigeben. Festgeschrieben wird beim Bezahlen." />
    <UiNotice v-if="error" tone="danger" class="mt-4">Shop nicht erreichbar: {{ error.statusMessage }}</UiNotice>

    <div v-if="data" class="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
      <Panel title="Allgemeiner Satz">
        <div class="w-32"><CommissionRateInput v-model="rate" /></div>
        <p class="mt-3 text-sm text-fg-muted">Gilt für jeden Kunden ohne eigene Freigabe, unabhängig von Bewertungen oder Umsatz.</p>
        <div class="mt-4 flex items-center gap-3">
          <UiButton :disabled="saving || !changed || rate === null" @click="saveRate">Speichern</UiButton>
          <UiNotice v-if="saved" tone="success">Gespeichert, gilt für neue Verkäufe.</UiNotice>
          <UiNotice v-if="saveError" tone="danger">{{ saveError }}</UiNotice>
        </div>
      </Panel>

      <div class="space-y-6">
        <Panel title="Individuelle Konditionen freigeben"><CommissionGrantForm @done="refresh" /></Panel>
        <Panel :title="`Laufend (${active.length})`"><CommissionOverrideList :overrides="active" show-customer @changed="refresh" /></Panel>
        <Panel v-if="past.length" title="Abgelaufen oder beendet"><CommissionOverrideList :overrides="past" show-customer /></Panel>
      </div>
    </div>
  </div>
</template>
