import nodemailer from 'nodemailer'

/*
 * Mailversand fürs CMS (nur Anmeldelinks für Admins). Lokal an Mailpit aus dem Shop-docker-compose
 * (http://localhost:8025). Ohne NUXT_SMTP_URL nur Konsole.
 */
let transport: ReturnType<typeof nodemailer.createTransport> | undefined

export const sendMail = async (to: string, subject: string, text: string, html: string) => {
  const config = useRuntimeConfig()
  if (!config.smtpUrl) {
    console.info(`[mail] an ${to}: ${subject}\n${text}`)
    return
  }
  transport ??= nodemailer.createTransport(config.smtpUrl)
  await transport.sendMail({ from: config.mailFrom, to, subject, text, html })
}
