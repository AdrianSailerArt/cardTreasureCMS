<script setup lang="ts">
/** Bewertung mit Sternen, Text (ausgeblendet markiert) und Aktion Text aus-/einblenden. */
defineProps<{
  review: { id: string, ratingOverall: number, deliveredComplete: boolean, comment: string | null, hidden: boolean, createdAt: string }
  title?: string
}>()
defineEmits<{ changed: [] }>()
</script>

<template>
  <div class="flex flex-wrap items-start gap-3 py-3 text-small">
    <div class="min-w-0 flex-1">
      <p class="flex flex-wrap items-center gap-2">
        <span class="text-accent">{{ '★'.repeat(review.ratingOverall) }}<span class="text-fg-faint">{{ '★'.repeat(5 - review.ratingOverall) }}</span></span>
        <Tag v-if="!review.deliveredComplete" tone="danger">unvollständig</Tag>
        <Tag v-if="review.hidden" tone="warning">Text ausgeblendet</Tag>
        <span class="text-meta text-fg-subtle">{{ dateTime(review.createdAt) }}</span>
        <span v-if="title" class="text-meta text-fg-muted">{{ title }}</span>
      </p>
      <p v-if="review.comment" class="mt-1" :class="review.hidden ? 'text-fg-subtle line-through' : ''">{{ review.comment }}</p>
    </div>
    <ModerationActionButton
      v-if="review.comment && !review.hidden"
      label="Text ausblenden"
      action="hide-review"
      :payload="{ reviewId: review.id }"
      :require-reason="false"
      @done="$emit('changed')"
    />
    <ModerationActionButton
      v-else-if="review.hidden"
      label="Text wieder zeigen"
      action="show-review"
      tone="neutral"
      :payload="{ reviewId: review.id }"
      :require-reason="false"
      @done="$emit('changed')"
    />
  </div>
</template>
