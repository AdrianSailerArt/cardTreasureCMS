import type { FinanceChecks } from '~/types/admin'

/** Prüfungen im Zahlungsverkehr aus dem Shop (interne API): Auffälligkeiten bei Einzahlung, Erstattung, Auszahlung, Provision und gemeldete Vorfälle. */
export default defineEventHandler(async (event): Promise<FinanceChecks> => await shopInternal(event, 'finance/checks'))
