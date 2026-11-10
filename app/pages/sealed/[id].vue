<script setup lang="ts">
import type { SealedRow } from '~~/server/lib/sealed'

/** Sealed-Produkt anlegen oder bearbeiten; Bild nach dem ersten Speichern. */
const route = useRoute()
const isNew = computed(() => route.params.id === 'neu')

const form = reactive({
  id: undefined as string | undefined,
  game: 'mtg', type: 'booster', name: '', nameDe: '', language: 'en',
  setId: null as string | null, setName: null as string | null, releaseDate: '', ean: '', description: '',
  imageId: null as string | null, slug: '',
})
if (!isNew.value) {
  const { data, error } = await useFetch<SealedRow>(`/api/sealed/${route.params.id}`)
  if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Produkt nicht gefunden', fatal: true })
  const s = data.value
  Object.assign(form, { id: s.id, game: s.game, type: s.type, name: s.name, nameDe: s.nameDe ?? '', language: s.language, setId: s.setId, setName: s.setName, releaseDate: s.releaseDate ?? '', ean: s.ean ?? '', description: s.description ?? '', imageId: s.imageId, slug: s.slug })
}

const gameOptions = Object.entries(GAME_LABEL).map(([value, label]) => ({ value, label }))
const typeOptions = Object.entries(SEALED_TYPE_LABEL).map(([value, label]) => ({ value, label }))
const languageOptions = ['en', 'de', 'fr', 'it', 'es', 'pt', 'ja', 'ko', 'zh_cn'].map(l => ({ value: l, label: l.toUpperCase() }))

const busy = ref(false)
const error = ref<string | null>(null)
const saved = ref(false)
const save = async () => {
  busy.value = true
  error.value = null
  saved.value = false
  try {
    const { setName: _n, imageId: _i, slug: _s, ...body } = form
    const res = await $fetch<{ id: string }>('/api/sealed/save', { method: 'POST', body })
    saved.value = true
    if (isNew.value) await navigateTo(`/sealed/${res.id}`, { replace: true })
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string, data?: { issues?: { message: string }[] } } }
    error.value = err.data?.data?.issues?.[0]?.message ?? err.data?.statusMessage ?? 'Speichern fehlgeschlagen'
  }
  finally {
    busy.value = false
  }
}

useSeoMeta({ title: () => `${isNew.value ? 'Neues Sealed-Produkt' : form.name} – CardTreasure CMS` })
</script>

<template>
  <div>
    <PageHeader :title="isNew ? 'Neues Sealed-Produkt' : form.name">
      <template #above><NuxtLink to="/sealed" class="text-small text-fg-subtle hover:text-accent">← Sealed-Katalog</NuxtLink></template>
    </PageHeader>
    <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_260px]">
      <Panel>
        <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="save">
          <UiField label="Spiel"><UiSelect v-model="form.game" :options="gameOptions" :disabled="!isNew" /></UiField>
          <UiField label="Typ"><UiSelect v-model="form.type" :options="typeOptions" /></UiField>
          <UiField label="Name (englisch / Originaltitel)" class="sm:col-span-2"><UiInput v-model="form.name" /></UiField>
          <UiField label="Name deutsch (optional)" class="sm:col-span-2"><UiInput v-model="form.nameDe" /></UiField>
          <UiField label="Sprache des Produkts"><UiSelect v-model="form.language" :options="languageOptions" /></UiField>
          <UiField label="Erscheinungsdatum"><UiInput v-model="form.releaseDate" type="date" /></UiField>
          <!-- kein <label> um die Set-Auswahl: der Knopf „entfernen“ darin würde Klicks im Feld abfangen -->
          <div class="sm:col-span-2"><p class="mb-1 text-label text-fg-subtle">Set (optional)</p><SealedSetPicker v-model="form.setId" :game="form.game" :label="form.setName" @picked="n => form.setName = n" /></div>
          <UiField label="EAN (optional)"><UiInput v-model="form.ean" mono /></UiField>
          <UiField label="Beschreibung (optional)" class="sm:col-span-2"><UiInput v-model="form.description" :rows="4" /></UiField>
          <div class="flex items-center gap-3 sm:col-span-2">
            <UiButton type="submit" :disabled="busy || form.name.trim().length < 2">{{ isNew ? 'Anlegen' : 'Speichern' }}</UiButton>
            <UiNotice v-if="saved" tone="success">Gespeichert.</UiNotice>
            <UiNotice v-if="error" tone="danger">{{ error }}</UiNotice>
          </div>
        </form>
      </Panel>
      <Panel title="Bild">
        <SealedImageUpload v-if="form.id" :sealed-id="form.id" :image-id="form.imageId" @changed="id => form.imageId = id" />
        <p v-else class="text-small text-fg-muted">Nach dem Anlegen kannst du ein Bild hochladen.</p>
      </Panel>
    </div>
  </div>
</template>
