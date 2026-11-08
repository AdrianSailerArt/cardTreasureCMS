<script setup lang="ts">
import type { PostRow } from '~/types/admin'

const { data: posts } = await useFetch<PostRow[]>('/api/posts', { default: () => [] })
</script>

<template>
  <div>
    <UiPageHeader title="Blog" description="Beiträge auf Deutsch und Englisch, mit Verweisen auf Karten im Katalog.">
      <UiButton to="/blog/neu">Neuer Beitrag</UiButton>
    </UiPageHeader>

    <UiPanel class="mt-8">
      <BlogPostsTable :posts="posts" />
    </UiPanel>
  </div>
</template>
