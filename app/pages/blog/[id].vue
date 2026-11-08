<script setup lang="ts">
type Locale = 'de' | 'en'
interface Translation { title: string, excerpt: string | null, bodyMd: string }
interface PostDetail {
  id: string, slug: string, status: 'draft' | 'published' | 'archived', game: string | null, tags: string[]
  translations: Partial<Record<Locale, Translation>>
}

const route = useRoute()
const isNew = computed(() => route.params.id === 'neu')

const form = reactive({
  id: undefined as string | undefined,
  slug: '',
  status: 'draft' as PostDetail['status'],
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

const locale = ref<Locale>('de')
const current = computed(() => form.translations[locale.value])

// Slug aus dem deutschen Titel vorschlagen, solange er nicht selbst gesetzt wurde
const slugTouched = ref(!isNew.value)
watch(() => form.translations.de.title || form.translations.en.title, (title) => {
  if (slugTouched.value) return
  form.slug = title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
})

// Vorschau (verzögert, damit nicht bei jedem Tastendruck gerendert wird)
const preview = ref<{ html: string, missing: string[] }>({ html: '', missing: [] })
let timer: ReturnType<typeof setTimeout> | undefined
watch(() => [current.value.bodyMd, locale.value], () => {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    preview.value = await $fetch<{ html: string, missing: string[] }>('/api/posts/preview', { method: 'POST', body: { markdown: current.value.bodyMd, locale: locale.value } })
  }, 300)
}, { immediate: true })

// Kartenverweis einfügen
const editor = ref<HTMLTextAreaElement>()
const cardQuery = ref('')
const cardResults = ref<{ ref: string, name: string, nameDe: string | null, game: string, setName: string | null }[]>([])
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(cardQuery, (q) => {
  clearTimeout(searchTimer)
  if (q.trim().length < 2) { cardResults.value = []; return }
  searchTimer = setTimeout(async () => {
    cardResults.value = await $fetch<typeof cardResults.value>('/api/cards/search', { query: { q } })
  }, 250)
})
function insertCard(ref: string) {
  const snippet = `:card{ref="${ref}"}`
  const el = editor.value
  const body = current.value.bodyMd
  const pos = el ? el.selectionStart : body.length
  current.value.bodyMd = body.slice(0, pos) + snippet + body.slice(pos)
  cardQuery.value = ''
  nextTick(() => {
    el?.focus()
    el?.setSelectionRange(pos + snippet.length, pos + snippet.length)
  })
}

// Speichern
const saving = ref(false)
const message = ref<{ ok: boolean, text: string } | null>(null)
async function save() {
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
    <NuxtLink to="/blog" class="text-sm text-ink-400 hover:text-gold-600">← Alle Beiträge</NuxtLink>
    <div class="mt-2 flex flex-wrap items-end justify-between gap-4">
      <h1 class="text-4xl">{{ isNew ? 'Neuer Beitrag' : (form.translations.de.title || form.translations.en.title || 'Beitrag') }}</h1>
      <div class="flex items-center gap-3">
        <select v-model="form.status" class="field w-auto">
          <option value="draft">Entwurf</option>
          <option value="published">Veröffentlicht</option>
          <option value="archived">Archiviert</option>
        </select>
        <button class="btn" :disabled="saving" @click="save">Speichern</button>
      </div>
    </div>
    <p v-if="message" class="mt-3 text-sm" :class="message.ok ? 'text-emerald-600' : 'text-red-600'">{{ message.text }}</p>

    <div class="mt-6 grid gap-4 md:grid-cols-3">
      <div>
        <label class="label" for="slug">Slug (URL)</label>
        <input id="slug" v-model="form.slug" class="field font-mono" @input="slugTouched = true">
      </div>
      <div>
        <label class="label" for="game">Spiel</label>
        <select id="game" v-model="form.game" class="field">
          <option :value="null">Alle / keins</option>
          <option v-for="(label, code) in GAME_LABEL" :key="code" :value="code">{{ label }}</option>
        </select>
      </div>
      <div>
        <label class="label" for="tags">Tags (mit Komma getrennt)</label>
        <input id="tags" v-model="form.tags" class="field" placeholder="Turnier, Preisanalyse">
      </div>
    </div>

    <div class="mt-8 flex gap-1 border-b border-ink-200 dark:border-ink-800">
      <button
        v-for="l in (['de', 'en'] as const)"
        :key="l"
        class="-mb-px border-b-2 px-4 py-2 text-sm"
        :class="locale === l ? 'border-gold-500 text-gold-600' : 'border-transparent text-ink-500'"
        @click="locale = l"
      >
        {{ l === 'de' ? 'Deutsch' : 'English' }}
        <span v-if="form.translations[l].title" class="ml-1 text-emerald-600">●</span>
      </button>
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-2">
      <div class="min-w-0 space-y-4">
        <div>
          <label class="label">Titel</label>
          <input v-model="current.title" class="field text-base">
        </div>
        <div>
          <label class="label">Teaser</label>
          <textarea v-model="current.excerpt" rows="2" class="field" />
        </div>
        <div>
          <div class="flex items-end justify-between gap-2">
            <label class="label">Text (Markdown)</label>
            <div class="relative w-64">
              <input v-model="cardQuery" class="field py-1 text-xs" placeholder="Karte einfügen: Name suchen …">
              <ul v-if="cardResults.length" class="absolute right-0 z-10 mt-1 max-h-72 w-80 overflow-auto rounded-lg border border-ink-200 bg-white text-sm shadow-lg dark:border-ink-700 dark:bg-ink-900">
                <li v-for="c in cardResults" :key="c.ref">
                  <button class="block w-full px-3 py-2 text-left hover:bg-ink-100 dark:hover:bg-ink-800" @click="insertCard(c.ref)">
                    {{ c.nameDe ?? c.name }}
                    <span class="block text-xs text-ink-400">{{ GAME_LABEL[c.game] }} · {{ c.setName }}</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <textarea ref="editor" v-model="current.bodyMd" rows="22" class="field font-mono text-[13px] leading-relaxed" placeholder="## Überschrift&#10;&#10;Text mit Kartenverweis :card{ref=&quot;mtg/…&quot;}" />
          <p class="mt-1 text-xs text-ink-400">Kartenverweise: <code>:card{ref="spiel/karten-slug"}</code>, am einfachsten über die Suche oben einfügen.</p>
        </div>
      </div>

      <div class="min-w-0">
        <p class="label">Vorschau</p>
        <div class="panel min-h-[200px]">
          <h2 v-if="current.title" class="text-3xl">{{ current.title }}</h2>
          <p v-if="current.excerpt" class="mt-2 text-ink-500">{{ current.excerpt }}</p>
          <!-- eslint-disable-next-line vue/no-v-html -- Vorschau des eigenen Markdowns, nur für Admins -->
          <div class="prose-preview mt-4" v-html="preview.html" />
          <p v-if="preview.missing.length" class="mt-4 text-sm text-red-600">Unbekannte Karten: {{ preview.missing.join(', ') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.card-ref {
  color: var(--color-gold-600);
  border-bottom: 1px dotted currentColor;
  text-decoration: none !important;
}
.card-ref-missing {
  color: rgb(220 38 38);
}
</style>
