<script setup lang="ts">
/** Umsatzanteil je Spiel als Balken. */
const props = defineProps<{ games: { game: string, gmv: number, items: number }[] }>()
const total = computed(() => Math.max(1, props.games.reduce((s, g) => s + g.gmv, 0)))
</script>

<template>
  <ul class="space-y-4">
    <li v-for="g in games" :key="g.game">
      <div class="flex justify-between text-sm">
        <span>{{ GAME_LABEL[g.game] }}</span>
        <span class="tabular-nums">{{ euro(g.gmv, 0) }}</span>
      </div>
      <div class="mt-1 h-1.5 rounded-full bg-surface-muted">
        <div class="h-full rounded-full bg-accent" :style="{ width: `${(g.gmv / total) * 100}%` }" />
      </div>
      <p class="mt-1 text-xs text-fg-subtle">{{ num(g.items) }} Karten</p>
    </li>
  </ul>
</template>
