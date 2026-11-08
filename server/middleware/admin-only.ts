/**
 * Alle API-Routen außer dem Login sind nur für Admins.
 * Seiten schützt zusätzlich die Route-Middleware app/middleware/auth.global.ts.
 */
export default defineEventHandler(async (event) => {
  const path = event.path
  if (!path.startsWith('/api/') || path.startsWith('/api/auth/')) return
  event.context.admin = await requireAdmin(event)
})
