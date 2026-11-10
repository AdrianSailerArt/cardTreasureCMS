# CardTreasure CMS

Internes Werkzeug für das CardTreasure-Team. Nur für Admins, nicht öffentlich.

- **Auswertungen:** Umsatz, Provision, Bestellungen, Bestand, Top-Verkäufer und -Produkte
- **Imports:** Katalogstand je Spiel und Protokoll der Import-Läufe
- **Blog:** Beiträge auf Deutsch und Englisch mit Kartenverweisen (`:card{ref="mtg/lightning-bolt-4457ed35"}`)
- **Skripte:** Katalog-Import, Marktplatz-Simulation, Admin-Verwaltung

## Architektur

```
                 ┌──────────────────────┐        ┌──────────────────────────┐
 Kunden  ──────► │ cardTreasure (Shop)  │        │ cardTreasureCMS          │ ◄── Team
                 │ Katalog, Käufer,     │        │ Auswertungen, Imports,   │
                 │ Verkäufer, Checkout  │        │ Blog, Simulation         │
                 └──────────┬───────────┘        └────────────┬─────────────┘
                            │   besitzt Schema + Migrationen   │ liest Schema per db:pull
                            └──────────────► Postgres ◄────────┘
```

- Das **Shop-Repo besitzt das Datenbankschema**. Migrationen entstehen nur dort.
- Dieses Repo zieht das Schema mit `bun run db:pull` aus der Datenbank nach `server/db/generated/`.
  Nach jeder Migration im Shop einmal neu ziehen und committen.
- Login über dieselbe Nutzertabelle, aber nur mit `role = 'admin'`. Registrierung ist hier abgeschaltet,
  Anmeldelinks gehen nur an Admins.

## Setup

Die Datenbank kommt aus dem Shop-Repo (`docker compose up -d` und `bun run db:migrate` dort, siehe dessen README).

```bash
bun install
cp .env.example .env          # Datenbank wie im Shop, eigenes Secret
bun run import mtg --sets=fdn,blb && bun run import pokemon --sets=sv03.5 && bun run import yugioh --sets=LOB
bun run testdata --reset      # nur Katalog + feste Testkonten (oder simulate --reset für einen großen Demo-Marktplatz)
bun run dev                   # http://localhost:3100 (gegen Staging: bun run dev:staging, braucht .env.staging)
```

### Test-Zugänge

Feste Testkonten aus `@cardtreasure/core/test-accounts`, Passwort für alle `test1234`, Übersicht im Shop-README.
Im CMS: `admin@test.cardtreasure.test`.

```bash
bun run testdata --reset            # lokal: Marktplatzdaten löschen (Katalog bleibt), Testkonten neu
bun run testdata:staging --reset    # dasselbe gegen Staging (Supabase, .env.staging)
bun run testdata add anna "Anna Test" --seller=commercial --country=FR   # weiteres Testkonto
```

- Passwort-Login nur für Konten mit Passwort und nur mit `NUXT_PUBLIC_DEMO_LOGIN=true`; im Echtbetrieb gibt es nur den Magic-Link.
- Echte Admins: `bun run make-admin du@firma.de "Dein Name"`, dann Anmeldung per Magic-Link. Die Mail landet lokal in Mailpit (http://localhost:8025, läuft im docker compose des Shops; `NUXT_SMTP_URL=smtp://localhost:1025` in der `.env`).

## Im lokalen Netzwerk

`bun run dev` erkennt die LAN-Adresse und gibt sie aus („CMS im Netzwerk: http://192.168.…:3100“). Anmeldelinks und Links zum Shop
zeigen dann auf diese Adresse (der Shop muss ebenfalls mit `bun run dev` laufen). Nur lokal: `DEV_HOST=localhost bun run dev`.

## Frontend-Aufbau

Wie im Shop: Atoms (Präfix `Ui`: Button, Input, Select, Field, Segmented, Notice, Table, Combobox), Components (`Tag`, `Panel`,
`PageHeader`, `Stat`, `StatusTag`, `EmptyState`, `CountryFlag`, `ChartFrame`, `KeyValueList`), Status- und Formatierungsregeln sowie `ui.css`
(Color-Set, Schrift Geist lokal, Formen, Fokus) kommen aus dem gemeinsamen Paket, oben allgemeine Components
(`PageHeader`, `KpiCard` …), Bereichsordner für Scope-Komponenten (`blog/`, `dashboard/`, `images/`, `layout/` …).
`useDebounced`, `useChartTheme`/`chartBase`, Versand, `slugify` und LAN-Erkennung kommen aus dem gemeinsamen Paket
[`@cardtreasure/core`](https://github.com/AdrianSailerArt/cardTreasureCore) (Nuxt-Layer, `extends` in `nuxt.config.ts`, feste Version in `package.json`).

## Befehle

| Befehl | Zweck |
|---|---|
| `bun run dev` | Admin-Tool auf Port 3100 |
| `bun run db:pull` | Schema aus der Datenbank neu erzeugen |
| `bun run import` | Katalog aller Spiele importieren |
| `bun run import mtg --sets=fdn,blb` | nur bestimmte Sets |
| `bun run simulate --reset` | Demo-Marktplatz neu erzeugen (Verkäufer, Käufer, Angebote, Bestellungen, Bewertungen, Preisverlauf) |
| `bun run simulate --clear` | alle Demo-Daten löschen |
| `bun run make-admin <email> ["Name"]` | Admin ernennen (`--revoke` zum Entziehen) |

Simulations-Optionen: `--sellers=25 --buyers=60 --products=1500 --orders=400 --days=90 --seed=42`.
Demo-Nutzer haben `is_demo = true` und E-Mails unter `@demo.cardtreasure.test`.

## Finanzen, Vertrauen, Nutzer

- **Finanzen:** Guthaben der Nutzer, Treuhand (bezahlte, offene Sendungen), Provision, Auszahlungen, Erstattungen, Monatsverlauf, höchste Guthaben.
- **Vertrauen:** auffällige Verkäufer (Regeln und Berechnung aus dem Shop über die interne API) und schlechte Bewertungen mit „Text ausblenden“.
- **Nutzer:** Suche, Detail mit Angeboten (entfernen), Bewertungen, Moderations-Protokoll, Sperren/Entsperren mit Grund.
- Moderation läuft über die interne Shop-API (`server/utils/shop.ts`, `NUXT_INTERNAL_SECRET` und `NUXT_SHOP_INTERNAL_URL` in der `.env`).
  Der Shop prüft, protokolliert und benachrichtigt; das CMS zeigt nur an und reicht weiter.

## Kartenbilder ersetzen

Unter **Kartenbilder** einen Druck suchen (Name de/en oder Set-Kürzel), eigenes Bild hochladen und einen Grund angeben,
z.B. falsche Sprache oder falscher Druck. Der Shop zeigt den Ersatz sofort, in Browsern mit altem Cache spätestens nach einer Stunde.
„Original wiederherstellen“ entfernt den Ersatz. Die Bilder liegen im Objektspeicher des Shops (SeaweedFS aus dessen
`docker compose`, localhost:8333). Bildverarbeitung und Speicher kommen aus `@cardtreasure/core`.

## Nächtlicher Import

[.github/workflows/import.yml](.github/workflows/import.yml) startet jede Nacht um 3 Uhr (UTC) den Import.
Dafür im Repo das Secret `NUXT_DATABASE_URL` setzen.
