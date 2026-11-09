<script setup lang="ts">
/**
 * Moderations-Knopf mit Bestätigung: Klick öffnet ein Feld für den Grund (Pflicht oder optional), erst „Bestätigen“ führt aus.
 * Ruft /api/moderation/<action> mit `payload` + reason auf; der Shop protokolliert und benachrichtigt.
 */
const props = withDefaults(defineProps<{
  label: string
  action: 'block' | 'unblock' | 'remove-listing' | 'hide-review' | 'show-review'
  payload: Record<string, string>
  requireReason?: boolean
  tone?: 'danger' | 'neutral'
  placeholder?: string
}>(), { requireReason: true, tone: 'danger', placeholder: 'Grund (geht per Mail an die Person)' })
const emit = defineEmits<{ done: [] }>()

const open = ref(false)
const reason = ref('')
/** Nur beim Sperren: Dauer in Tagen, leer = unbefristet */
const days = ref<string | null>(null)
const durations = [{ value: null, label: 'unbefristet' }, { value: '1', label: '1 Tag' }, { value: '7', label: '7 Tage' }, { value: '30', label: '30 Tage' }]
const busy = ref(false)
const error = ref<string | null>(null)

const run = async () => {
  busy.value = true
  error.value = null
  try {
    await $fetch(`/api/moderation/${props.action}`, {
      method: 'POST',
      body: { ...props.payload, reason: reason.value.trim() || null, ...(props.action === 'block' ? { days: days.value ? Number(days.value) : null } : {}) },
    })
    open.value = false
    reason.value = ''
    emit('done')
  }
  catch (e) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Fehlgeschlagen'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <span class="inline-flex flex-col gap-2">
    <UiButton v-if="!open" size="sm" :variant="tone === 'danger' ? 'danger' : 'ghost'" @click="open = true">{{ label }}</UiButton>
    <span v-else class="flex min-w-64 flex-col gap-2 rounded-lg border border-line bg-surface-muted p-2">
      <UiInput v-model="reason" :placeholder="requireReason ? placeholder : `${placeholder} (optional)`" />
      <UiSelect v-if="action === 'block'" v-model="days" :options="durations" />
      <span class="flex gap-2">
        <UiButton :disabled="busy || (requireReason && reason.trim().length < 3)" @click="run">{{ label }} bestätigen</UiButton>
        <UiButton variant="ghost" @click="open = false">Abbrechen</UiButton>
      </span>
      <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>
    </span>
  </span>
</template>
