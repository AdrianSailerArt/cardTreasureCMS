/** Jede Seite außer /login nur für angemeldete Admins. */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return
  const me = useMe()
  if (me.value) return
  try {
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    me.value = await $fetch<Me>('/api/me', { headers })
  }
  catch {
    return navigateTo({ path: '/login', query: to.fullPath !== '/' ? { next: to.fullPath } : undefined })
  }
})
