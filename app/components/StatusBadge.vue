<script setup lang="ts">
/** Status als farbiges Tag (Ampel: grün erledigt, blau in Arbeit, gelb wartet, rot Problem). */
defineProps<{ status: string }>()
</script>

<template>
  <Tag :tone="statusTone(status)" class="rounded-full px-2 font-normal">
    {{ STATUS_LABEL[status] ?? status }}
  </Tag>
</template>
