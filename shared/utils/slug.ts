/** URL-taugliche Kurzform eines Titels: Kleinbuchstaben, Umlaute aufgelöst, Bindestriche. */
export const slugify = (title: string, max = 80) => title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max)
