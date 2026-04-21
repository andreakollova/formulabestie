# REDESIGN AUDIT — Formulka / Pit Wall
Fáza 0 · Audit bez zmien

---

## 1. Mapa projektu

```
/Users/antik/formulka/
├── pitwall.html        ← Celá aplikácia (1 súbor, 1663 riadkov)
├── favicon.png         ← Favicon
├── vercel.json         ← Vercel routing (/ → pitwall.html)
├── render.yaml         ← Render cron job pre scraper
└── scraper/
    ├── espn_scraper.py     ← Python scraper (ESPN F1 → Supabase)
    ├── requirements.txt
    └── .env.example
```

**Framework:** žiadny — vanilla HTML / CSS / JS v jednom súbore
**Styling:** inline `<style>` s CSS custom properties
**Build system:** žiadny
**Routing:** žiadny (single page)

---

## 2. Sekcie / "stránky" (všetky v 1 HTML súbore)

| Sekcia | Popis |
|--------|-------|
| `#splash` | Name gate — animovaný splash s meno inputom |
| `.ticker-wrap` | Čierny ticker pás s F1 dátami |
| `.hero` | Hero sekcia — meno, dátum, veľký titulok |
| `.race-hero` | Karta ďalšieho závodu (countdown) |
| `.cal-section` | Horizontálny kalendár sezóny |
| `.main-grid` | 3 stĺpce: Driver standings / Constructor standings / Paddock Intel |
| `.stats-ribbon` | 4 štatistické boxy (tmavý pás) |
| `.footer-wrap` | Footer |

**Neexistujúce stránky (z guide):** Driver profile, Race detail, Constructor page, Article page, Search, Login, 404 — tieto sú mimo scope tejto fázy, idú neskôr.

---

## 3. JavaScript moduly (IIFEs)

| IIFE | Účel |
|------|------|
| Name gate | Splash screen, sessionStorage, pozdrav |
| Countdown | Odpočítavanie do ďalšieho závodu |
| F1 Live Data | Jolpica API + OpenF1 API, cache, polling |
| Calendar scroll | Auto-scroll na ďalší závod |
| ESPN News loader | Supabase fetch, renderNews |

---

## 4. Hardcoded hodnoty — čo treba zmeniť

### Farby (CSS variables — väčšina správna, treba doladiť)
| Premenná | Aktuálne | Podľa guide | Zmena? |
|----------|----------|-------------|--------|
| `--paper` | `#F5F0E8` | `#F5F0E8` | ✅ OK |
| `--black` | `#0A0A0A` | `#0A0A0A` | ✅ OK |
| `--red` | `#E8022D` | `#E8022D` | ✅ OK |
| `--gray` | `#6B6B6B` | `#8B8680` | ⚠️ Zmeniť |
| `--gray-light` | `#D4D4D4` | `#E8E4DC` | ⚠️ Zmeniť |
| `--paper-2` | `#EDE7DB` | — | ⚠️ Sladiť s guide |
| `--ink-2`, `--ink-3` | rôzne | — | ⚠️ Zjednotiť |
| `--rule` | `#D4D4D4` | `#E8E4DC` | ⚠️ Zmeniť |
| chýba | — | `#FFFFFF` (karty) | ➕ Pridať |

### Font — KRITICKÁ ZMENA
| Aktuálne | Podľa guide |
|----------|-------------|
| `Playfair Display` | **Fraunces** (Google Fonts, variable, free) |
| `Inter` | `Inter` ✅ OK |
| `JetBrains Mono` | `JetBrains Mono` ✅ OK |

### Typografická škála — treba updatovať
| Element | Aktuálne | Podľa guide |
|---------|----------|-------------|
| Hero title | `clamp(52px, 9vw, 120px)` | `96–120px / line-height 0.95` |
| H2 (race name) | `clamp(40px, 5.5vw, 72px)` | `72px / 1.0` |
| H3 (col-name) | `22px` | `28px` |
| Section spacing | `52px` | `min 96px` |
| Body | `16px / 1.6` | `16px / 1.6` ✅ |

### Spacing — väčšina sekcií má `padding: 52px` → treba `96px`
```
.hero           → padding-top: 96px (aktuálne 52px)
.race-hero      → margin-top: 96px  (aktuálne 0)
.cal-section    → padding-top: 96px (aktuálne 52px)
.main-section   → padding-top: 96px (aktuálne 52px)
.stats-ribbon   → padding-top: 96px (aktuálne 52px)
```

---

## 5. Komponenty a ich stav

### Tlačidlá
- `splash-btn`: padding 15px (guide: 14px 28px), border-radius 0 ✅, font ✅
- Žiadne secondary/ghost varianty zatiaľ

### LIVE indikátor
- `.live-badge`: ✅ má pulz, červená — ale text "Live Edition" nie je UPPERCASE mono správne
- Správne: `[●] LIVE EDITION` s konkrétnym pulz animáciou

### Race card
- ✅ tmavý blok, countdown, metadata
- ❌ chýba diagonálna textúra (3% opacity) — guide hovorí áno
- ❌ padding 44px namiesto 64px
- ❌ "Grand Prix" má byť kurzíva červenej, "Miami" čierne (aktuálne naopak)

### Tabuľka standings
- ✅ základná štruktúra
- ❌ chýba `POS DRIVER TEAM PTS` hlavička v mono UPPERCASE
- ❌ font veľkosti nezodpovedajú guide
- ❌ `.driver-name` je Playfair, má byť sans-serif 16px 500

### News/Article karty
- ✅ základná štruktúra
- ❌ `.news-headline` je Playfair — guide: serif display pre hero, sans pre article cards?
- TODO: confirm s guide čo presne

### Countdown
- ✅ 4 bloky, číslo + label
- ❌ čísla majú byť **sans-serif bold 64px** (nie mono) per guide
- ❌ label 10px mono UPPERCASE ✅
- ❌ bloky majú byť tmavé `#0A0A0A` s bielym textom (v race card) — aktuálne `#161616` (blízke)

### Splash
- ✅ básická štruktúra
- ❌ chýba brand guide dizajn — guide nemá splash definovaný explicitne, treba odvodiť z DNA

### Ticker
- ✅ funguje
- ❌ `sym` farba — má byť red, `val` white, `pts` — guide hovorí o FL time v žltej (ale žltá nie je v palete?) TODO: confirm

### Calendar
- ✅ horizontálny scroll, NEXT čierny
- ❌ karta "done" — guide: winner name s `▲` červenou ✅ (aktuálne OK)
- ❌ country label nie je presne ako v guide

---

## 6. Animácie — stav vs guide

| Animácia | Aktuálne | Guide |
|----------|----------|-------|
| Page fade | ✅ | `600ms cubic-bezier(0.4,0,0.2,1)` |
| Link hover | ❌ chýba underline LTR | `300ms` |
| LIVE pulz | ✅ opacity | `0.4 → 1 → 0.4, 2s` |
| Countdown flip | ❌ chýba | `300ms subtle 3D` |
| Scroll reveal | ❌ chýba | `fade + 16px up, 600ms` |
| Button hover | ✅ | `200ms` |
| Ticker | ✅ | — |
| Bar grow | ✅ | — |

---

## 7. Potenciálne problémy

1. **Fraunces font** — treba otestovať či náhrada za Playfair Display nevyzerá divne s existujúcimi veľkosťami
2. **Spacing 96px** — výrazne zväčší výšku stránky, treba skontrolovať na mobile
3. **Countdown čísla** — guide hovorí sans-serif 64px, nie mono — vizuálna zmena bude výrazná
4. **Driver name font** — aktuálne Playfair (serif), guide hovorí sans 16px 500 — veľká zmena v tabulkách
5. **Diagonálna textúra na race card** — guide explicitne hovorí "áno", ale v predchádzajúcom redesigne bola odstránená. Treba potvrdiť.
6. **Jazyk** — guide hovorí SK jazyk, ale user naposledy žiadal EN. **TODO: potvrdiť s userom.**

---

## 8. Odhad náročnosti (single HTML súbor)

| Fáza | Náročnosť |
|------|-----------|
| 1 — Design tokens | Nízka — update CSS vars |
| 2 — Fonty | Nízka — swap Google Fonts URL |
| 3 — Core components | Stredná — prepísanie CSS tried |
| 4 — Layout | Stredná — spacing, nav štruktúra |
| 5 — Špecializované | Stredná — race card, standings, calendar |
| 6 — Stránky | Nízka — 1 stránka existuje, ostatné nové HTML sekcie |
| 7 — Polish | Stredná — animácie, a11y, responsive |

**Celkový odhad:** 1 stránka (pitwall.html) bude prerobiená v Fázach 1–5. Nové stránky (driver, race, atď.) budú nové HTML sekcie alebo separátne súbory v Fáze 6.

---

*Audit vytvorený: 2026-04-21 · Fáza 0 dokončená*
