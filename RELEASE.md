# Mariano — uruchomienie i publikowanie

## Model marki

Designy są tworzone ręcznie. Gotowe spodnie produkują partnerzy w Bangladeszu i wysyłają je do Polski. Strona nie deklaruje ręcznego szycia ani nanoszenia nadruków w polskiej pracowni. Fotografie obecne w repozytorium są ilustracjami koncepcyjnymi AI. Rzeczywiste zdjęcia, skład i dostępność musi zatwierdzić właściciel.

## Pełny ZIP

Zawiera źródła, backend Node/SQLite, konfigurację przykładową i skompilowany frontend `dist`. Nie zawiera bazy klientów, haseł, przesłanych prywatnych plików ani `node_modules`.

1. Zainstaluj Node.js 24 lub nowszy i rozpakuj archiwum.
2. W folderze projektu uruchom `npm ci`.
3. Uruchom `npm run owner:setup`, aby ustawić właściciela na swoim komputerze. Nie powtarzaj tego kroku, jeżeli używasz istniejącej konfiguracji.
4. W Windows CMD uruchom:

```cmd
set "API_PORT=8080"
set "PUBLIC_ORIGIN=http://localhost:8080"
npm start
```

Otwórz `http://localhost:8080`, panel jest pod `/admin`. Po zmianie źródeł użyj `npm run build` przed ponownym `npm start`. Istniejący sklep aktualizuj z kopią własnej bazy i mediów. Migracje uruchamiają się automatycznie. Dane właściciela i istniejące zamówienia pozostają w jego lokalnej bazie.

## ZIP na Netlify

To gotowy **frontend statyczny**, a nie przeniesienie bazy SQLite do Netlify. Rozpakuj i prześlij folder zawierający `index.html`, `assets`, `media`, `_redirects` i `_headers` przez ręczny deploy Netlify. Nie przesyłaj pełnego ZIP-a projektu do ręcznego deployu.

Bez backendu można oglądać wygląd i katalog demonstracyjny. Panel, zapisy, aktualne dropy i zamówienia wymagają działającego serwera Node 24 z trwałym dyskiem. Interfejs pokazuje błąd połączenia zamiast udawać zapis.

Po uruchomieniu backendu pod własnym HTTPS zastąp pierwsze reguły `_redirects` (przed regułą `/*`) poniższymi, wpisując swoją domenę:

```text
/api/* https://TWOJ-BACKEND.example/api/:splat 200
/media/uploads/* https://TWOJ-BACKEND.example/media/uploads/:splat 200
/* /index.html 200
```

Na serwerze ustaw `PUBLIC_ORIGIN` na dokładny publiczny adres sklepu na Netlify (bez końcowego ukośnika). Sekrety przechowuj wyłącznie na serwerze. Przy proxy skonfiguruj dokładne zaufane adresy według README; nie ufaj dowolnym nagłówkom IP. `DB_PATH` oraz `MEDIA_DIR` muszą wskazywać trwałe dane. Własne media wymagają działającego workera (`WORKER_MODE=embedded` domyślnie).

Potrzebne usługi: hosting Node z trwałym SQLite; SMTP dla e-maili; opcjonalnie prywatny magazyn S3 dla mediów i oddzielny dla szyfrowanych kopii. InPost pozostaje opcjonalną integracją wysyłkową. Płatności pozostają wyłączone. Wszystkie nazwy zmiennych są opisane w `.env.example` i README.

## Studio publikacji

W panelu wybierz **Dropy i wygląd strony**. Możesz edytować główną, Studio i Lookbook, tworzyć dropy, duplikować je i przenosić do kosza. Dla każdego dokumentu dostępne są:

- tytuł, nadtytuł, krótki opis, etykieta, własny adres dropu, przycisk i lokalny link;
- główne zdjęcie, kadr na telefon, film, opis alternatywny, punkt kadrowania i przyciemnienie;
- jasny/ciemny motyw, wyrównanie, wysokość okładki, układ produktów, pozycja na liście;
- produkty w wybranej kolejności, premiera, koniec dropu, odliczanie, archiwum i zapisy zainteresowanych;
- do 24 przestawianych i ukrywanych sekcji: tekst, zdjęcie, produkty, dropy i istniejące studium 3D;
- zapis roboczy, podgląd, publikacja od razu lub w przyszłości, anulowanie harmonogramu, wycofanie, historia i przywrócenie wersji do edycji.

Zmiana szkicu nie zmienia strony publicznej. Planowana publikacja używa zapisanej w danym momencie kopii; późniejsze edytowanie szkicu jej nie podmienia. Daty w panelu wpisujesz w strefie urządzenia, a witryna pokazuje czas Polski. Publikacja jest rozstrzygana po stronie serwera przy odczycie; otwarte strony odświeżają dane co 30 sekund. Data premiery jest niezależna od daty publikacji zapowiedzi. Dostępność produktu nadal kontroluje zakładka Produkty — odliczanie nie jest blokadą zakupu.

Zapisy zainteresowanych korzystają z potwierdzenia e-mail i wypisania istniejącego newslettera. Publikacja dropu nie wysyła automatycznie kampanii marketingowej. Biblioteka pokazuje ostatnie 200 publicznych plików. Usuwanie dropu nie usuwa plików użytych przez inne strony.

Podgląd 390 px pokazuje kompozycję w węższym kontenerze. To nie emulator telefonu ani test wydajności. Pełnoekranowe zdjęcia, gesty i rzeczywiste usługi wymagają sprawdzenia w docelowych przeglądarkach.

## Współpraca animacji

| Mechanizm | Właściciel ruchu |
| --- | --- |
| CSS transitions | Reakcja dotyku, mobilny nagłówek i dolny koszyk |
| CSS keyframes | Shimmer przesuwający gradient przez transform |
| WAAPI | Potwierdzenie zmiany licznika koszyka oraz transform migawki zdjęcia |
| Motion for React (Framer Motion) | Dotychczasowe menu, boczny koszyk na PC i ruch kart przy filtrowaniu |
| GSAP / ScrollTrigger | Istniejąca zasłona nawigacji, paralaksa, przypięte rozdziały i narracja 3D |
| GSAP FLIP | Przełączenie siatki / dużych kadrów na PC, na osobnych kontenerach kart |
| View Transitions | Przejście zdjęcia do produktu i mobilne zmiany stron, zamiast równoległej zasłony GSAP |

Brak obsługi View Transitions przywraca dotychczasową nawigację. Systemowe ograniczenie ruchu jest respektowane. Na telefonie wyłączone są backdrop blur i box-shadow. Przeciąganie koszyka zapisuje transform bez aktualizacji stanu React na każdej klatce. FLIP mierzy geometrię tylko na komputerze. View Transitions odczytuje geometrię na granicach zmiany widoku, a animuje transform i opacity.

Nie deklarujemy pomiaru 60–120 FPS ani bezwzględnego zera reflow/repaint: zmiana dokumentu, załadowanie obrazu i tworzenie migawek wymagają pracy przeglądarki. Nowe animacje mobilne nie interpolują rozmiaru, położenia layoutu, blur ani cieni. Dotychczasowe WebGL pozostaje osobną, automatycznie skalowaną warstwą.

Referencje implementacji: [MDN — startViewTransition](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition), [GSAP FLIP](https://gsap.com/docs/v3/Plugins/Flip/), [Netlify — rewrites i proxy](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/).
