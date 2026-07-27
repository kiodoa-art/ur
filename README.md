# Nat-ur PWA 5.0.0

## Ændringer

- Den tidligere JavaScript-alarm er fjernet.
- Alarmtid vælges i menuen og gemmes lokalt.
- **Sæt telefonens alarm** sender et Android `ACTION_SET_ALARM`-intent med tidspunkt, navnet **Natbord** og synlig alarm-UI.
- Hvis intentet ikke kan åbnes, vises knappen **Åbn alarm-appen**, som forsøger `ACTION_SHOW_ALARMS`.
- Det senest valgte tidspunkt kan vises diskret under uret og kan skjules i menuen.
- Ur, størrelse, lysstyrke, sekunder, Wake Lock, fullscreen og PWA-installation er bevaret.

## Begrænsning

En PWA kan ikke aflæse Androids eksisterende alarmer eller bekræfte, at en alarm er aktiv. Chrome kan kun starte alarm-appen, hvis telefonens alarm-app tillader det fra browser-intents. Brugeren skal kontrollere alarmen i alarm-appen.

## Upload

Upload alle filer til roden af GitHub-repositoriet og overskriv de gamle filer.
