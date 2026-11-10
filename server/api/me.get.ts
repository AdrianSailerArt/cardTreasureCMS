/** Angemeldeter Admin (ID, Name, E-Mail). */
export default defineEventHandler(async event => await requireAdmin(event))
