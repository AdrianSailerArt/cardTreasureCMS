<script setup lang="ts">
import type { PostRow } from '~/types/admin'

/** Übersicht aller Beiträge mit Sprachen, Status, Spiel, Anzahl Kartenverweise. */
defineProps<{ posts: PostRow[] }>()
const languages = (p: PostRow) => [p.titleDe && 'de', p.titleEn && 'en'].filter(Boolean).join(' + ')
</script>

<template>
  <UiTable :min-width="640">
      <template #head>
          <th>Titel</th><th>Status</th><th>Spiel</th>
          <th>Karten</th><th>Autor</th><th class="text-right">Geändert</th>
        </template>
        <tr v-for="p in posts" :key="p.id">
          <td>
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
      </UiTable>
</template>
