<script setup lang="ts">
/**
 * Individuelle Provision für einen Kunden freigeben (fest oder per Suche), Satz, Grund, optional Enddatum.
 * Ohne Freigabe zahlen alle Kunden den allgemeinen Satz. Eine laufende Freigabe wird ersetzt; der Kunde bekommt eine Mail.
 */
const props = defineProps<{ sellerId?: string | null, sellerName?: string | null }>()
const emit = defineEmits<{ done: [] }>()

const picked = ref<{ id: string, name: string } | null>(props.sellerId ? { id: props.sellerId, name: props.sellerName ?? '' } : null)
const q = ref('')
const query = useDebounced(() => q.value.trim(), 250)
interface UserHit { id: string, name: string, displayName: string | null, email: string }
const { data: hits } = await useFetch<UserHit[]>('/api/users', { query: computed(() => ({ q: query.value || undefined })), default: () => [], immediate: !props.sellerId, watch: [query] })
const customers = computed(() => (query.value.length >= 2 ? hits.value.slice(0, 8) : []).map(h => ({ value: h.id, label: h.displayName ?? h.name, hint: h.email })))

const rateBps = ref<number | null>(350)
const reason = ref('')
const until = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const valid = computed(() => picked.value && rateBps.value !== null && rateBps.value >= 0 && rateBps.value <= 2000 && reason.value.trim().length >= 3)

const submit = async () => {
  busy.value = true
  error.value = null
  try {
    await $fetch('/api/commission/overrides', {
      method: 'POST',
      body: { sellerId: picked.value!.id, rateBps: rateBps.value, reason: reason.value.trim(), validUntil: until.value ? new Date(`${until.value}T23:59:59`).toISOString() : null },
    })
    reason.value = ''
    until.value = ''
    if (!props.sellerId) picked.value = null
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
  <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="valid && submit()">
    <UiField v-if="!sellerId" label="Kunde" class="sm:col-span-2">
      <div v-if="picked" class="flex items-center gap-2 text-small">
        <Tag tone="info">{{ picked.name }}</Tag>
        <UiButton size="sm" variant="ghost" @click="picked = null">ändern</UiButton>
      </div>
      <UiCombobox v-else v-model:query="q" :items="customers" label="Kunde suchen" placeholder="Name oder E-Mail …" @select="i => { picked = { id: i.value, name: i.label }; q = '' }" />
    </UiField>
    <UiField label="Satz"><CommissionRateInput v-model="rateBps" /></UiField>
    <UiField label="gültig bis (leer = unbefristet)"><UiInput v-model="until" type="date" /></UiField>
    <UiField label="Grund (sieht der Kunde nicht, steht im Protokoll)" class="sm:col-span-2"><UiInput v-model="reason" placeholder="z.B. Händlerkonditionen ab 500 Angeboten" /></UiField>
    <div class="flex items-center gap-3 sm:col-span-2">
      <UiButton type="submit" :disabled="busy || !valid">Freigeben</UiButton>
      <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>
    </div>
  </form>
</template>
