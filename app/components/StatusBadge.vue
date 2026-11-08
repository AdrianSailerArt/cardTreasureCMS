<script setup lang="ts">
const props = defineProps<{ status: string }>()

const tone = computed(() => {
  switch (props.status) {
    case 'completed': case 'succeeded': case 'published': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
    case 'paid': case 'shipped': case 'delivered': case 'running': return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
    case 'awaiting_payment': case 'pending_payment': case 'draft': return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
    case 'cancelled': case 'disputed': case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
    default: return 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'
  }
})
</script>

<template>
  <span class="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs" :class="tone">
    {{ STATUS_LABEL[status] ?? status }}
  </span>
</template>
