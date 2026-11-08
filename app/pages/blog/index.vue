<script setup lang="ts">
interface PostRow {
  id: string, slug: string, status: string, titleDe: string | null, titleEn: string | null,
  author: string, game: string | null, publishedAt: string | null, updatedAt: string, cardRefs: number
}
const { data: posts } = await useFetch<PostRow[]>('/api/posts', { default: () => [] })
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-4xl">Blog</h1>
        <p class="mt-1 text-sm text-ink-500">Beiträge auf Deutsch und Englisch, mit Verweisen auf Karten im Katalog.</p>
      </div>
      <NuxtLink to="/blog/neu" class="btn">Neuer Beitrag</NuxtLink>
    </div>

    <section class="panel mt-8 overflow-x-auto">
      <table class="w-full min-w-[640px] text-sm">
        <thead class="text-left text-xs uppercase tracking-wider text-ink-400">
          <tr><th class="py-2 font-normal">Titel</th><th class="font-normal">Status</th><th class="font-normal">Spiel</th><th class="font-normal">Karten</th><th class="font-normal">Autor</th><th class="text-right font-normal">Geändert</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in posts" :key="p.id" class="border-t border-ink-100 dark:border-ink-800">
            <td class="py-2">
              <NuxtLink :to="`/blog/${p.id}`" class="hover:text-gold-600">{{ p.titleDe ?? p.titleEn }}</NuxtLink>
              <span class="block font-mono text-xs text-ink-400">/{{ p.slug }} · {{ [p.titleDe && 'de', p.titleEn && 'en'].filter(Boolean).join(' + ') }}</span>
            </td>
            <td><StatusBadge :status="p.status" /></td>
            <td class="text-ink-500">{{ p.game ? GAME_LABEL[p.game] : '–' }}</td>
            <td class="tabular-nums text-ink-500">{{ p.cardRefs }}</td>
            <td class="text-ink-500">{{ p.author }}</td>
            <td class="text-right tabular-nums text-ink-500">{{ dateTime(p.updatedAt) }}</td>
          </tr>
          <tr v-if="!posts.length"><td colspan="6" class="py-6 text-ink-500">Noch keine Beiträge.</td></tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
