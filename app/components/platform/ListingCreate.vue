<script setup lang="ts">
import type { PlatformCard } from '~/types/admin'

/**
 * Eigenes Angebot anlegen: Karte suchen, Druck wählen, Zustand, Sprache, Variante, Menge, Preis, Lagerplatz.
 * Geprüft wird im Shop wie bei Kunden (Variante passt zum Druck, Mindestpreis).
 */
const emit = defineEmits<{ created: [] }>()
const q = ref('')
const query = useDebounced(() => q.value.trim(), 250)
const { data: cards } = await useFetch<PlatformCard[]>('/api/shop/printings', { query: computed(() => ({ q: query.value })), default: () => [], immediate: false, watch: [query] })
const items = computed(() => (query.value.length >= 2 ? cards.value : []).map(c => ({ value: c.id, label: c.nameDe ? `${c.nameDe} (${c.name})` : c.name, hint: `${GAME_LABEL[c.game]} · ${c.printings?.length ?? 0} Drucke` })))
const card = ref<PlatformCard | null>(null)
const printingId = ref<string | null>(null)
const printing = computed(() => card.value?.printings?.find(p => p.id === printingId.value) ?? null)
const pick = (id: string) => {
  card.value = cards.value.find(c => c.id === id) ?? null
  printingId.value = card.value?.printings?.[0]?.id ?? null
  q.value = ''
}

const form = ref({ condition: 'near_mint', language: 'en', finish: 'normal', isFirstEdition: false, quantity: 1, priceCents: null as number | null, storageLocation: '', comment: '' })
watch(printing, (p) => {
  if (!p) return
  if (!p.finishes.includes(form.value.finish)) form.value.finish = p.finishes[0] ?? 'normal'
  if (p.languages.length && !p.languages.includes(form.value.language)) form.value.language = p.languages[0]!
})
const printingOptions = computed(() => (card.value?.printings ?? []).map(p => ({ value: p.id as string | null, label: `${p.setName} (${p.setCode.toUpperCase()}) #${p.collectorNumber ?? '–'}` })))
const conditionOptions = CONDITIONS.map(c => ({ value: c.value as string, label: `${c.short} · ${c.label}` }))
const languageOptions = computed(() => (printing.value?.languages.length ? printing.value.languages : ['en', 'de']).map(l => ({ value: l, label: l.toUpperCase() })))
const finishOptions = computed(() => (printing.value?.finishes.length ? printing.value.finishes : ['normal']).map(f => ({ value: f, label: f })))
const price = ref('')
watch(price, (v) => {
  const n = Number(v.replace(',', '.'))
  form.value.priceCents = v.trim() && Number.isFinite(n) ? Math.round(n * 100) : null
})
const valid = computed(() => !!printing.value && form.value.quantity >= 1 && (form.value.priceCents ?? 0) >= 10)

const busy = ref(false)
const message = ref<{ ok: boolean, text: string } | null>(null)
const submit = async () => {
  busy.value = true
  message.value = null
  try {
    await $fetch('/api/shop/listings', {
      method: 'POST',
      body: { printingId: printing.value!.id, ...form.value, storageLocation: form.value.storageLocation || null, comment: form.value.comment || null },
    })
    message.value = { ok: true, text: `Angelegt: ${card.value!.nameDe ?? card.value!.name}` }
    form.value.quantity = 1
    form.value.storageLocation = ''
    emit('created')
  }
  catch (e) {
    message.value = { ok: false, text: (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Anlegen fehlgeschlagen' }
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="grid gap-4" @submit.prevent="valid && submit()">
    <!-- Gewählte Karte außerhalb des Labels: ein Knopf in einem <label> würde Klicks im Feld abfangen -->
    <div v-if="card">
      <p class="mb-1 text-label text-fg-subtle">Karte</p>
      <div class="flex flex-wrap items-center gap-2 text-small">
        <Tag tone="info">{{ card.nameDe ?? card.name }}</Tag>
        <span class="text-fg-subtle">{{ GAME_LABEL[card.game] }}</span>
        <UiButton size="sm" variant="ghost" @click="card = null">ändern</UiButton>
      </div>
    </div>
    <UiField v-else label="Karte">
      <UiCombobox v-model:query="q" :items="items" label="Karte suchen" placeholder="Name auf Deutsch oder Englisch …" @select="i => pick(i.value)" />
    </UiField>
    <template v-if="card">
      <UiField label="Druck"><UiSelect v-model="printingId" :options="printingOptions" /></UiField>
      <div class="grid gap-4 sm:grid-cols-3">
        <UiField label="Zustand"><UiSelect v-model="form.condition" :options="conditionOptions" /></UiField>
        <UiField label="Sprache"><UiSelect v-model="form.language" :options="languageOptions" /></UiField>
        <UiField label="Variante"><UiSelect v-model="form.finish" :options="finishOptions" /></UiField>
      </div>
      <label v-if="printing?.hasFirstEdition" class="flex items-center gap-2 text-small"><input v-model="form.isFirstEdition" type="checkbox" class="accent-accent"> 1. Edition</label>
      <div class="grid gap-4 sm:grid-cols-3">
        <UiField label="Menge"><input v-model.number="form.quantity" type="number" min="1" max="999" class="min-h-10 w-full rounded-md border border-line-strong bg-bg px-3 py-2 text-right text-small tabular-nums focus:border-accent"></UiField>
        <UiField label="Preis in €"><UiInput v-model="price" placeholder="z.B. 4,90" /></UiField>
        <UiField label="Lagerplatz (intern)"><UiInput v-model="form.storageLocation" placeholder="z.B. Regal A, Fach 2" /></UiField>
      </div>
      <UiField label="Hinweis für Käufer (optional)"><UiInput v-model="form.comment" placeholder="z.B. kleine Kante oben links" /></UiField>
    </template>
    <div class="flex flex-wrap items-center gap-3">
      <UiButton type="submit" :disabled="busy || !valid">Angebot anlegen</UiButton>
      <UiNotice v-if="message" :tone="message.ok ? 'success' : 'danger'">{{ message.text }}</UiNotice>
    </div>
  </form>
</template>
