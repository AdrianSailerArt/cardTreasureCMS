<!-- KOPIE aus dem Shop (cardtresure/app/components/atoms/Table.vue); Änderungen dort machen und übernehmen. -->
<script setup lang="ts">
/**
 * Tabelle mit einheitlichem Stil: Kopf klein und gedämpft, Zeilen mit Trennlinie, waagerecht scrollbar auf schmalen Bildschirmen.
 * Kopfzellen in den Slot `head` (ohne <thead>/<tr>, optional), Zeilen in den Standard-Slot (ohne <tbody>).
 * `framed`: mit Rahmen und Kopfhintergrund (für Inhaltsseiten).
 */
const props = withDefaults(defineProps<{ minWidth?: number, framed?: boolean }>(), { minWidth: 0, framed: false })
const slots = useSlots()

// Zellabstände je Variante getrennt, damit sich keine Klassen widersprechen
const cells = computed(() => props.framed
  ? '[&_td]:px-4 [&_td]:py-2 [&_th]:px-4 [&_th]:py-2.5'
  : '[&_td]:py-2 [&_td]:pr-4 [&_td:last-child]:pr-0 [&_th]:py-2 [&_th]:pr-4 [&_th:last-child]:pr-0')
const rows = computed(() => (slots.head ? '[&_tbody_tr]:border-t' : '[&_tbody_tr+tr]:border-t'))
</script>

<template>
  <div class="overflow-x-auto" :class="framed ? 'rounded-xl border border-line bg-surface' : ''">
    <table
      class="w-full text-left text-sm [&_th]:font-normal [&_tbody_tr]:border-line"
      :class="[cells, rows]"
      :style="minWidth ? { minWidth: `${minWidth}px` } : undefined"
    >
      <thead v-if="$slots.head" class="text-xs uppercase tracking-wider text-fg-subtle" :class="framed ? 'bg-surface-muted' : ''">
        <tr><slot name="head" /></tr>
      </thead>
      <tbody>
        <slot />
      </tbody>
      <tfoot v-if="$slots.foot">
        <slot name="foot" />
      </tfoot>
    </table>
  </div>
</template>
