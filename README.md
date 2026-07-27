# Nat-ur PWA 3.1.0

Denne version er bygget om fra bunden. CSS og JavaScript ligger i samme index.html, så browseren ikke kan blande filer fra forskellige versioner.

- Menuen er testet til at åbne, lukke og gemme indstillinger.
- Wake Lock-status vises kun i menuen.
- Installeret visning er sat til fullscreen for at fjerne Androids hvide navigationsbjælke.
- Uret bruger telefonens lokale systemtid og virker offline.
- Service workeren cacher kun den samlede index.html som offline-reserve.

Upload alle filer til roden af GitHub-repositoriet. Da manifestets visning er ændret til fullscreen, bør den eksisterende PWA afinstalleres og installeres igen én gang.
