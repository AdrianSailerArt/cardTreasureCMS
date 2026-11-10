<script setup lang="ts">
import type { AdSettings } from '~/types/admin'

/** Regeln der Werbung: an/aus, Mindest- und Höchstsatz, Mindestbetrag je Verkauf, Zuordnungsfrist. */
const props = defineProps<{ settings: AdSettings }>()
const emit = defineEmits<{ saved: [clamped: number] }>()

const form = reactive({ ...props.settings })
const minFee = ref((props.settings.minFeeCents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2 }))
const minFeeCents = computed(() => Math.round(Number(minFee.value.replace(',', '.')) * 100))
const enabledOptions = [{ value: 'on', label: 'Werbung an' }, { value: 'off', label: 'Werbung aus' }]
const enabled = computed({ get: () => (form.enabled ? 'on' : 'off'), set: (v: string) => { form.enabled = v === 'on' } })

const invalid = computed(() =>
  form.minRateBps === null || form.maxRateBps === null || form.minRateBps > form.maxRateBps || form.maxRateBps > 5000
  || Number.isNaN(minFeeCents.value) || minFeeCents.value < 0 || form.attributionDays < 1 || form.attributionDays > 90)
const busy = ref(false)
const error = ref<string | null>(null)
const done = ref<string | null>(null)

const save = async () => {
  busy.value = true
  error.value = null
  done.value = null
  try {
    const r = await $fetch<{ clamped: number }>('/api/ads/settings', { method: 'PUT', body: { ...form, minFeeCents: minFeeCents.value } })
    done.value = r.clamped ? `Gespeichert. ${r.clamped} laufende Werbung(en) auf die neuen Grenzen gesetzt.` : 'Gespeichert.'
    emit('saved', r.clamped)
  }
  catch (e) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Speichern fehlgeschlagen'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <UiSegmented v-model="enabled" :options="enabledOptions" label="Werbung" />
    <div class="grid grid-cols-2 gap-3">
      <UiField label="Mindestsatz"><CommissionRateInput v-model="form.minRateBps" :max="5000" label="Mindestsatz" /></UiField>
      <UiField label="Höchstsatz"><CommissionRateInput v-model="form.maxRateBps" :max="5000" label="Höchstsatz" /></UiField>
      <UiField label="Mindestbetrag je Verkauf (€)"><UiInput v-model="minFee" class="text-right tabular-nums" /></UiField>
      <UiField label="Zuordnungsfrist (Tage)"><input v-model.number="form.attributionDays" type="number" min="1" max="90" class="min-h-10 w-full rounded-md border border-line-strong bg-bg px-3 text-right text-small tabular-nums focus:border-accent"></UiField>
    </div>
    <p class="text-meta text-fg-subtle">Gilt für neue Käufe. Laufende Sätze außerhalb der Grenzen werden angepasst; schon zugeordnete Käufe behalten ihren Satz.</p>
    <div class="flex flex-wrap items-center gap-3">
      <UiButton type="submit" :disabled="busy || invalid">Speichern</UiButton>
      <UiNotice v-if="done" tone="success">{{ done }}</UiNotice>
      <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>
      <UiNotice v-else-if="invalid" tone="warning">Mindestsatz ≤ Höchstsatz (höchstens 50 %), Frist 1–90 Tage.</UiNotice>
    </div>
  </form>
</template>
