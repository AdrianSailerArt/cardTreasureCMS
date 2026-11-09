import { createMailer, mailerKind, type Mailer } from '@cardtreasure/core/mailer'

/*
 * Mailversand fürs CMS (nur Anmeldelinks für Admins), gleicher Mailer wie im Shop:
 * Brevo (NUXT_BREVO_API_KEY, optional NUXT_BREVO_SANDBOX), sonst SMTP (NUXT_SMTP_URL, lokal Mailpit), sonst Konsole.
 */
let mailer: Mailer | undefined

const useMailer = () => {
  if (!mailer) {
    const config = useRuntimeConfig()
    const cfg = { from: config.mailFrom, smtpUrl: config.smtpUrl || undefined, brevoApiKey: config.brevo.apiKey || undefined, brevoSandbox: String(config.brevo.sandbox) === 'true' }
    mailer = createMailer(cfg)
    console.info(`[mail] Versand über ${mailerKind(cfg)}`)
  }
  return mailer
}

export const sendMail = async (to: string, subject: string, text: string, html: string, tag = 'cms_magic_link') =>
  await useMailer().send({ to, subject, text, html, tag })
