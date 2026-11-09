import type { ReportView } from '~/types/admin'

/** Meldungen aus dem Shop: ?status=open | handled | all */
export default defineEventHandler(async (event): Promise<ReportView[]> => {
  const s = getQuery(event).status
  return await shopInternal<ReportView[]>(event, 'reports', { query: { status: typeof s === 'string' ? s : 'open' } })
})
