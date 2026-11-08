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
bun run simulate --reset      # Demo-Marktplatz und Demo-Konten
bun run dev                   # http://localhost:3100
```

### Test-Zugänge

| Rolle | App | E-Mail | Passwort |
|---|---|---|---|
| Admin | CMS | `admin@demo.cardtreasure.test` | `demo1234` |
| Käuferin | Shop | `kaeufer@demo.cardtreasure.test` | `demo1234` |
| Privater Verkäufer (kauft auch) | Shop | `verkaeufer@demo.cardtreasure.test` | `demo1234` |
| Gewerbliche Händlerin | Shop | `haendler@demo.cardtreasure.test` | `demo1234` |

- Entstehen bei `bun run simulate` (Definition: `DEMO_ACCOUNTS` in [scripts/simulate.ts](scripts/simulate.ts)).
- Passwort-Login nur für diese Konten und nur mit `NUXT_PUBLIC_DEMO_LOGIN=true`; im Echtbetrieb gibt es nur den Magic-Link.
- Echte Admins: `bun run make-admin du@firma.de "Dein Name"`, dann Anmeldung per Magic-Link (lokal in der Server-Konsole).

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

## Nächtlicher Import

[.github/workflows/import.yml](.github/workflows/import.yml) startet jede Nacht um 3 Uhr (UTC) den Import.
Dafür im Repo das Secret `NUXT_DATABASE_URL` setzen.
