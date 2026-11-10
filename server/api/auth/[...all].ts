/** Anmeldung (better-auth) für Admins: Magic-Link, Demo-Passwort, Sitzung, Abmelden. */
export default defineEventHandler(event => useAuth().handler(toWebRequest(event)))
