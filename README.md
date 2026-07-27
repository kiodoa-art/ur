# Nat-ur PWA – version 3.0.0

GitHub-klar PWA med:

- Stort, køligt blåt ur
- Lidt kraftigere typografi
- Ingen dato
- Valgfrie sekunder
- Dæmpet, synligt tandhjul
- Justerbar lysstyrke
- Wake Lock-status kun i menuen
- Alarm og justerbar alarmlydstyrke
- Sort tema og sort Android-systemnavigation, hvor browseren tillader det
- Automatisk opdatering, når en ny version uploades

## Upload til GitHub Pages

Upload filerne i denne mappe til roden af dit repository.

GitHub Pages skal være aktiveret under:

`Settings → Pages → Deploy from a branch`

## Nye versioner

Når du laver en ny version, skal versionsnummeret ændres både i:

- `app.js`
- `sw.js`
- teksten nederst i `index.html`

Det sikrer, at installerede PWA'er opdager og henter den nye version.

## Begrænsninger

Wake Lock virker kun, mens appen er åben og synlig. Android kan stadig afbryde funktionen ved ekstrem batterisparetilstand eller hvis appen tvangslukkes.

Systemnavigationens farve styres af Android og Chrome. PWA'en anmoder om sort navigation via sort tema, baggrund og standalone-visning, men enkelte Android-versioner kan stadig bruge deres egen kontrastfarve.
