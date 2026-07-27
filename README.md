# Nat-ur PWA V2

En meget enkel naturs-app med:

- Stort digitalt ur
- Lysstyrke fra 1–25 % inde i appen
- Valgfri dato og sekunder
- Screen Wake Lock, hvor browseren understøtter det
- Enkel alarm og vibration
- Offline-cache og PWA-manifest

## Installation

Upload hele mappen til en HTTPS-host, fx Cloudflare Pages eller GitHub Pages.
Åbn siden i Chrome på Android og vælg **Føj til startskærm** eller **Installer app**.

## Begrænsninger

En almindelig PWA kan ikke styre telefonens fysiske systemlysstyrke.
Alarmen kan heller ikke garanteres, hvis browseren eller appen er lukket af Android.
Brug derfor telefonens normale alarm som backup, hvis det er vigtigt at vågne.


## V2

- Uret fylder langt mere af skærmen i både stående og liggende format.
- Tallene er ændret til en meget afdæmpet, kølig blå.
- Appen kontrollerer efter en ny service worker ved hver opstart, når appen åbnes igen og hver 30. minut.
- HTML hentes netværk-først, så en ny GitHub Pages-udgave ikke bliver låst fast bag den gamle cache.
- Ved fremtidige releases skal `VERSION` øges i `sw.js`, fx fra `2.0.0` til `2.0.1`.
