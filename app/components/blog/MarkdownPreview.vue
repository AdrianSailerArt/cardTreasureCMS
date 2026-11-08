<script setup lang="ts">
/** Live-Vorschau eines Beitrags; das Markdown wird serverseitig gerendert (inkl. Kartenverweisen). */
const props = defineProps<{
  title: string
  excerpt: string
  markdown: string
  locale: 'de' | 'en'
}>()

const preview = ref<{ html: string, missing: string[] }>({ html: '', missing: [] })
let timer: ReturnType<typeof setTimeout> | undefined

const render = async () => {
  preview.value = await $fetch<{ html: string, missing: string[] }>('/api/posts/preview', {
    method: 'POST',
    body: { markdown: props.markdown, locale: props.locale },
  })
}

watch(() => [props.markdown, props.locale], () => {
  clearTimeout(timer)
  timer = setTimeout(render, 300)
}, { immediate: true })
</script>

<template>
  <UiPanel class="min-h-[200px]">
    <h2 v-if="title" class="text-3xl">{{ title }}</h2>
    <p v-if="excerpt" class="mt-2 text-fg-muted">{{ excerpt }}</p>
    <!-- eslint-disable-next-line vue/no-v-html -- eigenes Markdown, nur für Admins -->
    <div class="prose-preview mt-4" v-html="preview.html" />
    <UiNotice v-if="preview.missing.length" tone="danger" class="mt-4">Unbekannte Karten: {{ preview.missing.join(', ') }}</UiNotice>
  </UiPanel>
</template>

<style scoped>
.prose-preview :deep(h1), .prose-preview :deep(h2), .prose-preview :deep(h3) { margin: 1.5rem 0 0.5rem; font-family: var(--font-serif); }
.prose-preview :deep(h1) { font-size: 1.875rem; }
.prose-preview :deep(h2) { font-size: 1.5rem; }
.prose-preview :deep(p) { margin: 0.75rem 0; line-height: 1.7; }
.prose-preview :deep(ul) { margin: 0.75rem 0; padding-left: 1.5rem; list-style: disc; }
.prose-preview :deep(ol) { margin: 0.75rem 0; padding-left: 1.5rem; list-style: decimal; }
.prose-preview :deep(a) { color: var(--color-accent); text-decoration: underline; }
.prose-preview :deep(blockquote) { margin: 1rem 0; border-left: 2px solid var(--color-accent); padding-left: 1rem; font-style: italic; color: var(--color-fg-muted); }
.prose-preview :deep(code) { border-radius: 0.25rem; background: var(--color-surface-muted); padding: 0 0.25rem; font-size: 0.875em; }
.prose-preview :deep(.card-ref) { color: var(--color-accent); border-bottom: 1px dotted currentColor; text-decoration: none; }
.prose-preview :deep(.card-ref-missing) { color: var(--color-danger); }
</style>
