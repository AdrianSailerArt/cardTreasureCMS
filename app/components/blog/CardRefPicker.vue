<script setup lang="ts">
import type { CardSearchHit } from '~/types/admin'

/** Sucht Karten im Katalog und meldet die gewählte Referenz ("mtg/lightning-bolt-…"). */
const emit = defineEmits<{ pick: [ref: string] }>()

const query = ref('')
const results = ref<CardSearchHit[]>([])
useDebounced(query, 250, async (q) => {
  results.value = q.trim().length < 2 ? [] : await $fetch<CardSearchHit[]>('/api/cards/search', { query: { q } })
})

const items = computed(() => results.value.map(c => ({ value: c.ref, label: c.nameDe ?? c.name, hint: `${GAME_LABEL[c.game]} · ${c.setName}` })))
const pick = (ref: string) => {
  emit('pick', ref)
  query.value = ''
}
</script>

<template>
  <div class="w-64">
    <UiCombobox v-model:query="query" :items="items" label="Karte einfügen" placeholder="Karte einfügen: Name suchen …" list-class="w-80" @select="i => pick(i.value)" />
  </div>
</template>
