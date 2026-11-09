<script setup lang="ts">
type Locale = 'de' | 'en'
type Status = 'draft' | 'published' | 'archived'
interface Translation { title: string, excerpt: string | null, bodyMd: string }
interface PostDetail {
  id: string, slug: string, status: Status, game: string | null, tags: string[]
  translations: Partial<Record<Locale, Translation>>
}

const route = useRoute()
const isNew = computed(() => route.params.id === 'neu')

const form = reactive({
  id: undefined as string | undefined,
  slug: '',
  status: 'draft' as Status,
  game: null as string | null,
  tags: '',
  translations: {
    de: { title: '', excerpt: '', bodyMd: '' },
    en: { title: '', excerpt: '', bodyMd: '' },
  } as Record<Locale, { title: string, excerpt: string, bodyMd: string }>,
})

if (!isNew.value) {
  const { data, error } = await useFetch<PostDetail>(`/api/posts/${route.params.id}`)
  if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Beitrag nicht gefunden', fatal: true })
  const p = data.value
  Object.assign(form, { id: p.id, slug: p.slug, status: p.status, game: p.game, tags: p.tags.join(', ') })
  for (const l of ['de', 'en'] as const) {
    const t = p.translations[l]
    if (t) form.translations[l] = { title: t.title, excerpt: t.excerpt ?? '', bodyMd: t.bodyMd }
  }
}

const statusOptions: { value: Status, label: string }[] = [
  { value: 'draft', label: 'Entwurf' },
  { value: 'published', label: 'Veröffentlicht' },
  { value: 'archived', label: 'Archiviert' },
]
const gameOptions = [{ value: null, label: 'Alle / keins' }, ...Object.entries(GAME_LABEL).map(([value, label]) => ({ value, label }))]
const localeOptions: { value: Locale, label: string }[] = [{ value: 'de', label: 'Deutsch' }, { value: 'en', label: 'English' }]

const locale = ref<Locale>('de')
const current = computed(() => form.translations[locale.value])

// Slug aus dem Titel vorschlagen, solange er nicht von Hand geändert wurde
const slugTouched = ref(!isNew.value)
watch(() => form.translations.de.title || form.translations.en.title, (title) => {
  if (!slugTouched.value) form.slug = slugify(title)
})

// Kartenverweis an der Cursorposition einfügen
const editor = ref<{ $el: HTMLTextAreaElement }>()
const insertCard = (ref: string) => {
  const snippet = `:card{ref="${ref}"}`
  const el = editor.value?.$el
  const body = current.value.bodyMd
  const pos = el?.selectionStart ?? body.length
  current.value.bodyMd = body.slice(0, pos) + snippet + body.slice(pos)
  nextTick(() => {
    el?.focus()
    el?.setSelectionRange(pos + snippet.length, pos + snippet.length)
  })
}

const saving = ref(false)
const message = ref<{ ok: boolean, text: string } | null>(null)
const save = async () => {
  saving.value = true
  message.value = null
  const translations = Object.fromEntries((['de', 'en'] as const)
    .filter(l => form.translations[l].title.trim())
    .map(l => [l, { ...form.translations[l], excerpt: form.translations[l].excerpt || null }]))
  try {
    const res = await $fetch<{ id: string, cardRefs: number }>('/api/posts/save', {
      method: 'POST',
      body: {
        id: form.id,
        slug: form.slug,
        status: form.status,
        game: form.game,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        translations,
      },
    })
    message.value = { ok: true, text: `Gespeichert, ${res.cardRefs} Kartenverweise erkannt.` }
    if (!form.id) {
      form.id = res.id
      await navigateTo(`/blog/${res.id}`, { replace: true })
    }
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string, message?: string } }
    message.value = { ok: false, text: err.data?.statusMessage ?? err.data?.message ?? 'Speichern fehlgeschlagen' }
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader :title="isNew ? 'Neuer Beitrag' : (form.translations.de.title || form.translations.en.title || 'Beitrag')">
      <template #above>
        <NuxtLink to="/blog" class="text-sm text-fg-subtle hover:text-accent">← Alle Beiträge</NuxtLink>
      </template>
      <UiSelect v-model="form.status" :options="statusOptions" class="w-auto" />
      <UiButton :disabled="saving" @click="save">Speichern</UiButton>
    </PageHeader>
    <UiNotice v-if="message" :tone="message.ok ? 'success' : 'danger'" class="mt-3">{{ message.text }}</UiNotice>

    <div class="mt-6 grid gap-4 md:grid-cols-3">
      <UiField label="Slug (URL)">
        <UiInput v-model="form.slug" mono @input="slugTouched = true" />
      </UiField>
      <UiField label="Spiel">
        <UiSelect v-model="form.game" :options="gameOptions" />
      </UiField>
      <UiField label="Tags (mit Komma getrennt)">
        <UiInput v-model="form.tags" placeholder="Turnier, Preisanalyse" />
      </UiField>
    </div>

    <div class="mt-8 flex items-center justify-between gap-4 border-b border-line pb-3">
      <UiSegmented v-model="locale" :options="localeOptions" />
      <span class="text-xs text-fg-subtle">
        ausgefüllt: {{ (['de', 'en'] as const).filter(l => form.translations[l].title).join(', ') || '–' }}
      </span>
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-2">
      <div class="min-w-0 space-y-4">
        <UiField label="Titel"><UiInput v-model="current.title" /></UiField>
        <UiField label="Teaser"><UiInput v-model="current.excerpt" :rows="2" /></UiField>
        <div>
          <div class="mb-1 flex items-end justify-between gap-2">
            <span class="text-xs uppercase tracking-wider text-fg-subtle">Text (Markdown)</span>
            <BlogCardRefPicker @pick="insertCard" />
          </div>
          <UiInput ref="editor" v-model="current.bodyMd" :rows="22" mono placeholder="## Überschrift&#10;&#10;Text mit Kartenverweis :card{ref=&quot;mtg/…&quot;}" />
          <p class="mt-1 text-xs text-fg-subtle">Kartenverweise: <code>:card{ref="spiel/karten-slug"}</code>, am einfachsten über die Suche oben einfügen.</p>
        </div>
      </div>

      <div class="min-w-0">
        <p class="mb-1 text-xs uppercase tracking-wider text-fg-subtle">Vorschau</p>
        <BlogMarkdownPreview :title="current.title" :excerpt="current.excerpt" :markdown="current.bodyMd" :locale="locale" />
      </div>
    </div>
  </div>
</template>
