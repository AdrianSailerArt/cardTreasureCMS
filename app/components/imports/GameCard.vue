<script setup lang="ts">
import type { GameCatalog } from '~/types/admin'

/** Katalogstand eines Spiels: Karten, Drucke, Sets, Abdeckung mit Preisen und deutschen Namen. */
const props = defineProps<{ game: GameCatalog }>()

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)} %` : '–')
const items = computed(() => [
  { label: 'Karten', value: num(props.game.cards) },
  { label: 'Drucke', value: num(props.game.products) },
  { label: 'Sets mit Karten', value: `${num(props.game.setsWithCards)} / ${num(props.game.sets)}` },
  { label: 'mit Richtpreis', value: pct(props.game.withPrice, props.game.products) },
  { label: 'mit deutschem Namen', value: pct(props.game.withGerman, props.game.cards) },
])
</script>

<template>
  <Panel>
    <div class="mb-4 flex items-baseline justify-between gap-2">
      <h2 class="text-title">{{ GAME_LABEL[game.code] }}</h2>
      <span class="text-meta text-fg-subtle">{{ game.lastSuccess ? `zuletzt ${dateTime(game.lastSuccess)}` : 'noch kein Lauf protokolliert' }}</span>
    </div>
    <KeyValueList :items="items" />
  </Panel>
</template>
