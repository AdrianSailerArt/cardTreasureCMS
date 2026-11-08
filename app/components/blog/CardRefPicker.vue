<script setup lang="ts">
import type { CardSearchHit } from '~/types/admin'

/** Sucht Karten im Katalog und meldet die gewählte Referenz ("mtg/lightning-bolt-…"). */
const emit = defineEmits<{ pick: [ref: string] }>()

const query = ref('')
const results = ref<CardSearchHit[]>([])
let timer: ReturnType<typeof setTimeout> | undefined

watch(query, (q) => {
  clearTimeout(timer)
  if (q.trim().length < 2) {
    results.value = []
    return
  }
  timer = setTimeout(async () => {
    results.value = await $fetch<CardSearchHit[]>('/api/cards/search', { query: { q } })
  }, 250)
})

const pick = (ref: string) => {
  emit('pick', ref)
  query.value = ''
}
</script>

<template>
  <div class="relative w-64">
    <UiInput v-model="query" placeholder="Karte einfügen: Name suchen …" />
    <ul v-if="results.length" class="absolute right-0 z-10 mt-1 max-h-72 w-80 overflow-auto rounded-lg border border-line bg-surface text-sm shadow-lg">
      <li v-for="c in results" :key="c.ref">
        <button type="button" class="block w-full px-3 py-2 text-left hover:bg-surface-muted" @click="pick(c.ref)">
          {{ c.nameDe ?? c.name }}
          <span class="block text-xs text-fg-subtle">{{ GAME_LABEL[c.game] }} · {{ c.setName }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
