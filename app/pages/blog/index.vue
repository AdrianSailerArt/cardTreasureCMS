<script setup lang="ts">
import type { PostRow } from '~/types/admin'

const { data: posts } = await useFetch<PostRow[]>('/api/posts', { default: () => [] })
</script>

<template>
  <div>
    <PageHeader title="Blog" description="Beiträge auf Deutsch und Englisch, mit Verweisen auf Karten im Katalog.">
      <UiButton to="/blog/neu">Neuer Beitrag</UiButton>
    </PageHeader>

    <Panel class="mt-8">
      <BlogPostsTable :posts="posts" />
    </Panel>
  </div>
</template>
