<script setup lang="ts">
import type { CommissionOverride, CommissionTier } from '~/types/admin'

/** Provision: Staffel nach Verkäufer-Stufe und individuelle Konditionen. Änderungen gelten für neue Verkäufe. */
const { data, refresh, error } = await useFetch<{ tiers: CommissionTier[], overrides: CommissionOverride[] }>('/api/commission')
const LEVEL_LABEL: Record<string, string> = { new: 'Neu', bronze: 'Bronze', silver: 'Silber', gold: 'Gold', platinum: 'Platin', warning: 'Auffällig' }

const rates = ref<Record<string, number | null>>({})
watch(data, (d) => { rates.value = Object.fromEntries((d?.tiers ?? []).map(t => [t.level, t.rateBps])) }, { immediate: true })
const changed = computed(() => data.value?.tiers.some(t => rates.value[t.level] !== t.rateBps) ?? false)
const saving = ref(false)
const saved = ref(false)
const saveError = ref<string | null>(null)
const saveTiers = async () => {
  saving.value = true
  saveError.value = null
  saved.value = false
  try {
    await $fetch('/api/commission/tiers', { method: 'PUT', body: { rates: rates.value } })
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
    <PageHeader title="Provision" description="Satz auf den Warenwert. Gilt eine individuelle Freigabe, hat sie Vorrang; sonst der Satz der aktuellen Verkäufer-Stufe. Festgeschrieben wird beim Bezahlen." />
    <UiNotice v-if="error" tone="danger" class="mt-4">Shop nicht erreichbar: {{ error.statusMessage }}</UiNotice>

    <div v-if="data" class="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
      <Panel title="Staffel nach Stufe">
        <div class="space-y-3">
          <div v-for="t in data.tiers" :key="t.level" class="flex items-center justify-between gap-3">
            <span class="text-sm">{{ LEVEL_LABEL[t.level] ?? t.level }}</span>
            <div class="w-32"><CommissionRateInput :model-value="rates[t.level] ?? null" @update:model-value="v => rates[t.level] = v" /></div>
          </div>
        </div>
        <div class="mt-4 flex items-center gap-3">
          <UiButton :disabled="saving || !changed" @click="saveTiers">Staffel speichern</UiButton>
          <UiNotice v-if="saved" tone="success">Gespeichert, gilt für neue Verkäufe.</UiNotice>
          <UiNotice v-if="saveError" tone="danger">{{ saveError }}</UiNotice>
        </div>
      </Panel>

      <div class="space-y-6">
        <Panel title="Individuelle Konditionen freigeben"><CommissionGrantForm @done="refresh" /></Panel>
        <Panel :title="`Laufend (${active.length})`"><CommissionOverrideList :overrides="active" show-seller @changed="refresh" /></Panel>
        <Panel v-if="past.length" title="Abgelaufen oder beendet"><CommissionOverrideList :overrides="past" show-seller /></Panel>
      </div>
    </div>
  </div>
</template>
