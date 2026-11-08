<script setup lang="ts">
import type { PostRow } from '~/types/admin'

/** Übersicht aller Beiträge mit Sprachen, Status, Spiel, Anzahl Kartenverweise. */
defineProps<{ posts: PostRow[] }>()
const languages = (p: PostRow) => [p.titleDe && 'de', p.titleEn && 'en'].filter(Boolean).join(' + ')
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[640px] text-sm">
      <thead class="text-left text-xs uppercase tracking-wider text-fg-subtle">
        <tr>
          <th class="py-2 font-normal">Titel</th><th class="font-normal">Status</th><th class="font-normal">Spiel</th>
          <th class="font-normal">Karten</th><th class="font-normal">Autor</th><th class="text-right font-normal">Geändert</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in posts" :key="p.id" class="border-t border-line">
          <td class="py-2">
            <NuxtLink :to="`/blog/${p.id}`" class="hover:text-accent">{{ p.titleDe ?? p.titleEn }}</NuxtLink>
            <span class="block font-mono text-xs text-fg-subtle">/{{ p.slug }} · {{ languages(p) }}</span>
          </td>
          <td><StatusBadge :status="p.status" /></td>
          <td class="text-fg-muted">{{ p.game ? GAME_LABEL[p.game] : '–' }}</td>
          <td class="tabular-nums text-fg-muted">{{ p.cardRefs }}</td>
          <td class="text-fg-muted">{{ p.author }}</td>
          <td class="text-right tabular-nums text-fg-muted">{{ dateTime(p.updatedAt) }}</td>
        </tr>
        <tr v-if="!posts.length"><td colspan="6" class="py-6 text-fg-muted">Noch keine Beiträge.</td></tr>
      </tbody>
    </table>
  </div>
</template>
