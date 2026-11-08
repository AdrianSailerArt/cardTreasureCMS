/*
 * KOPIE von cardTreasure: shared/utils/shipping.ts. Bei Änderungen dort hier übernehmen.
 */
/*
 * Versandberechnung: Gewicht und Dicke einer Sendung schätzen und die günstigste passende Versandart wählen.
 * Wird von Server (Checkout) und Oberfläche (Versand-Rechner) gleichermaßen genutzt.
 *
 * Karten werden fast nie nackt verschickt: Jede Karte steckt in einer Hülle, wertvolle zusätzlich im Toploader,
 * dazu Umschlag und ggf. Pappe. Deshalb wird alles mit Schutz gerechnet und am Ende ein Puffer aufgeschlagen,
 * damit die Sendung lieber ein Format größer als zu knapp frankiert ist.
 */

export const SHIPPING_FORMATS = ['standard', 'compact', 'large', 'maxi', 'parcel'] as const
export type ShippingFormat = (typeof SHIPPING_FORMATS)[number]

/** Grenzen der Formate (Deutsche Post / DHL), Gewicht in Gramm, Dicke in Millimetern. */
export const FORMAT_LIMITS: Record<ShippingFormat, { maxWeightG: number, maxThicknessMm: number }> = {
  standard: { maxWeightG: 20, maxThicknessMm: 5 }, //    Standardbrief
  compact: { maxWeightG: 50, maxThicknessMm: 10 }, //    Kompaktbrief
  large: { maxWeightG: 500, maxThicknessMm: 20 }, //     Großbrief
  maxi: { maxWeightG: 1000, maxThicknessMm: 50 }, //     Maxibrief
  parcel: { maxWeightG: 5000, maxThicknessMm: 600 }, //  Paket
}

/** Annahmen fürs Verpacken. Werte sind bewusst eher großzügig. */
export const PACKING = {
  card: { weightG: 1.8, thicknessMm: 0.32 },
  sleeve: { weightG: 0.5, thicknessMm: 0.1 },
  /** Karten ab diesem Stückpreis kommen zusätzlich in einen Toploader */
  toploaderFromCents: 300,
  toploader: { weightG: 5, thicknessMm: 1.7 },
  envelope: { weightG: 6, thicknessMm: 0.5 },
  /** Pappe zum Verstärken, wenn keine Karte im Toploader steckt */
  stiffener: { weightG: 6, thicknessMm: 1 },
  /** Sicherheitsaufschlag aufs Gewicht (Klebeband, Teambags, feuchtes Papier …) */
  weightBuffer: 0.15,
  /** Sicherheitsaufschlag auf die Dicke in Millimetern */
  thicknessBufferMm: 1,
  /** Sealed-Produkte (Booster, Displays …) gehen grundsätzlich als Paket */
  sealedWeightG: 400,
}

export interface PackageItem {
  kind: 'single' | 'sealed'
  quantity: number
  unitPriceCents: number
}

export interface PackageEstimate {
  weightG: number
  thicknessMm: number
  cards: number
  toploaders: number
  sealed: number
  valueCents: number
}

/** Schätzt Gewicht und Dicke einer Sendung inklusive Schutz, Verpackung und Puffer. */
export const estimatePackage = (items: PackageItem[]): PackageEstimate => {
  let weight = PACKING.envelope.weightG
  let thickness = PACKING.envelope.thicknessMm
  let cards = 0
  let toploaders = 0
  let sealed = 0
  let valueCents = 0

  for (const item of items) {
    valueCents += item.quantity * item.unitPriceCents
    if (item.kind === 'sealed') {
      sealed += item.quantity
      weight += item.quantity * PACKING.sealedWeightG
      continue
    }
    cards += item.quantity
    const inToploader = item.unitPriceCents >= PACKING.toploaderFromCents
    if (inToploader) toploaders += item.quantity
    weight += item.quantity * (PACKING.card.weightG + PACKING.sleeve.weightG + (inToploader ? PACKING.toploader.weightG : 0))
    // Toploader liegen nebeneinander-gestapelt; Karte + Hülle steckt darin und zählt nicht extra
    thickness += item.quantity * (inToploader ? PACKING.toploader.thicknessMm : PACKING.card.thicknessMm + PACKING.sleeve.thicknessMm)
  }

  if (cards > 0 && toploaders === 0) {
    weight += PACKING.stiffener.weightG
    thickness += PACKING.stiffener.thicknessMm
  }

  return {
    weightG: Math.ceil(weight * (1 + PACKING.weightBuffer)),
    thicknessMm: Math.round((thickness + PACKING.thicknessBufferMm) * 10) / 10,
    cards,
    toploaders,
    sealed,
    valueCents,
  }
}

export interface ShippingOption {
  id: string
  name: string
  format: ShippingFormat
  maxWeightG: number
  maxThicknessMm: number
  priceCents: number
  tracked: boolean
  maxOrderValueCents: number | null
  destinationCountries: string[]
  active: boolean
}

export type ShippingRejection = 'country' | 'weight' | 'thickness' | 'value' | 'sealed' | 'inactive'

/** Warum eine Versandart für diese Sendung nicht passt, oder null, wenn sie passt. */
export const rejectReason = (option: ShippingOption, pkg: PackageEstimate, country: string): ShippingRejection | null => {
  if (!option.active) return 'inactive'
  if (!option.destinationCountries.includes(country.toUpperCase())) return 'country'
  if (pkg.sealed > 0 && option.format !== 'parcel') return 'sealed'
  if (pkg.weightG > option.maxWeightG) return 'weight'
  if (pkg.thicknessMm > option.maxThicknessMm) return 'thickness'
  if (option.maxOrderValueCents !== null && pkg.valueCents > option.maxOrderValueCents) return 'value'
  return null
}

/** Günstigste passende Versandart; bei gleichem Preis die mit Sendungsverfolgung. */
export const chooseShipping = <T extends ShippingOption>(options: T[], pkg: PackageEstimate, country: string): T | null =>
  options
    .filter(o => rejectReason(o, pkg, country) === null)
    .sort((a, b) => a.priceCents - b.priceCents || Number(b.tracked) - Number(a.tracked))[0] ?? null

export const EU_SHIPPING_COUNTRIES = ['AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'] as const

/**
 * Plattform-Tarif: welche Versandarten es gibt und was sie kosten. Verkäufer pflegen nichts selbst,
 * der Versand jeder Sendung wird daraus automatisch berechnet.
 * Preise: Deutsche Post / DHL, Stand 2025 (Richtwerte, vor dem Start mit der aktuellen Preisliste abgleichen).
 * Für Verkäufer außerhalb Deutschlands gilt vorerst derselbe Tarif als Näherung.
 */
export const shippingTariff = (originCountry: string): ShippingOption[] => {
  const origin = originCountry.toUpperCase()
  const home = [origin]
  const abroad = EU_SHIPPING_COUNTRIES.filter(c => c !== origin)
  const option = (format: ShippingFormat, name: string, priceCents: number, region: string[], tracked = false, maxValue: number | null = 2500): ShippingOption => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name, format, ...FORMAT_LIMITS[format], priceCents, tracked, maxOrderValueCents: maxValue, destinationCountries: region, active: true,
  })
  return [
    option('standard', 'Standardbrief', 95, home),
    option('compact', 'Kompaktbrief', 110, home),
    option('large', 'Großbrief', 180, home),
    option('maxi', 'Maxibrief', 290, home),
    option('compact', 'Kompaktbrief Einschreiben', 345, home, true, 25000),
    option('large', 'Großbrief Einschreiben', 415, home, true, 25000),
    option('parcel', 'DHL Paket', 699, home, true, null),
    option('standard', 'Standardbrief International', 125, abroad),
    option('compact', 'Kompaktbrief International', 180, abroad),
    option('large', 'Großbrief International', 330, abroad),
    option('large', 'Großbrief International Einschreiben', 680, abroad, true, 25000),
    option('parcel', 'DHL Paket EU', 1899, abroad, true, null),
  ]
}

export interface ShippingQuote {
  service: string
  format: ShippingFormat
  tracked: boolean
  priceCents: number
  weightG: number
  thicknessMm: number
}

/**
 * Versand für eine Sendung automatisch berechnen: Gewicht und Dicke schätzen und die günstigste
 * passende Versandart aus dem Tarif wählen. Null, wenn nichts passt (z.B. Ziel außerhalb der EU).
 */
export const quoteShipping = (items: PackageItem[], originCountry: string, destinationCountry: string): ShippingQuote | null => {
  const pkg = estimatePackage(items)
  const option = chooseShipping(shippingTariff(originCountry), pkg, destinationCountry)
  return option
    ? { service: option.name, format: option.format, tracked: option.tracked, priceCents: option.priceCents, weightG: pkg.weightG, thicknessMm: pkg.thicknessMm }
    : null
}
