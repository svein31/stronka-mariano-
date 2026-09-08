# Obsługa zamówień i pracowni

Ten etap rozszerza poprzednią wersję bez włączania płatności. Migracja 3 jest dodatkiem do istniejącej bazy: nie usuwa zamówień ani produktów. Przed aktualizacją aktywnego serwera wykonaj kopię, zatrzymaj stary proces i uruchom nowy kod. Nie uruchamiaj starego backendu równolegle z nowym. Konfiguracja właściciela i SMTP pozostaje zgodna z INTEGRATIONS.md.

## Uruchomienie na swoim komputerze

Wymagany Node.js 24+. W istniejącym folderze repozytorium:

```sh
git switch main
git pull --ff-only
npm ci
npm run dev
```

Pierwsza instalacja wymaga `npm run owner:setup`. Otwórz http://localhost:5173, pomiary są pod `/size-guide`, centrum klienta pod `/track`, panel pod `/admin`. Prywatne linki z e-maila otwierają to samo centrum. Nie przesyłaj sekretów do GitHuba ani rozmowy.

## Funkcje klienta

- Instrukcja: obwód pasa i bioder ciała oraz wewnętrzna długość nogawki ze spodni. Bez dodawania luzu przez klienta. Wyniki w tej karcie przez maksymalnie 24 godziny są dostępne w asystencie i personalizacji. Usunięcie pomiarów czyści zapis. Wymiary demonstracyjne nie zastępują zatwierdzonej tabeli danego modelu.
- Centrum: podsumowanie, wersje specyfikacji, akceptacja/prośba o zmianę, wiadomości, chronione zdjęcia realizacji i przesyłka. Każdy odczyt i zapis wymaga ważnego klucza tego zamówienia. Link w fragmencie jest usuwany z adresu.
- Akceptacja dotyczy konkretnej wersji, jej całkowitej ceny z dostawą, wymiarów i terminu. Nie pobiera pieniędzy. Po rozpoczęciu krojenia nie można przyjmować nowych wycen w tym automatycznym procesie — zmiany uzgadnia się przez rozmowę.
- Szkice wiadomości są lokalne dla karty, nie są zapisem na serwerze; wygasają po 24 godzinach. Formularze zachowują wpisy po błędzie. Ponowienie wiadomości z tym samym kluczem nie tworzy drugiej kopii. Po zmianie treści potrzebny jest nowy klucz.

## Panel pracowni

Sekcja **Obsługa i planowanie** zawiera centrum konkretnego zamówienia, plan produkcji, materiały, zespół i kolejkę.

1. Przy personalizacji kliknij „Otwórz obsługę tej personalizacji”. Powstaje jedno powiązane zamówienie z oryginalnymi pomiarami. Ta operacja jest idempotentna.
2. Wybierz zamówienie i przygotuj wersję specyfikacji. Cena to łączna kwota PLN z ustaloną dostawą; obowiązuje przez 1–30 dni. Klient otrzymuje link przez skonfigurowane SMTP. Poprzednia oczekująca wycena zostaje zastąpiona, zaakceptowana historia pozostaje niezmienna.
3. Klient akceptuje lub prosi o zmianę. Akceptacja aktualizuje zamówienie i zapisuje zdarzenie realizacji. Płatność nadal `not_requested`.
4. Ustaw minuty pracy dostępne danego dnia i dodaj zadania. Limit dotyczy całej pracowni; nie jest osobnym kalendarzem godzin każdego pracownika. Wykonane zadania nadal zajmują planowany czas, anulowane zwalniają go. Widok do 93 dni; maksymalnie 500 szczegółowych zadań, obciążenie liczone ze wszystkich.
5. Dodaj materiały: tkanina w całkowitych cm, dodatki w sztukach. Przy potwierdzonym zamówieniu rezerwuj ilości. Stan nie może spaść poniżej rezerwacji. „Zużyto” odejmuje raz, „Zwolnij” oddaje rezerwację. Po zużyciu nie można ponownie rezerwować tego samego zestawu; dodatkowe zużycie zapisz jawną korektą magazynu. Anulowanie zamówienia zwalnia niezużyte rezerwacje i przyszłe zadania.

Listy starszego panelu pokazują 100 ostatnich zamówień/zapytań. To panel małej pracowni; pełne wyszukiwanie historycznych zamówień jest osobnym rozszerzeniem. Historia zmian przechowuje identyfikator wykonawcy, operację i rekord, bez treści wiadomości czy haseł.

## Pracownicy i role

```sh
npm run staff:setup
```

Konfigurator działa wyłącznie na serwerze/komputerze z bazą. Pyta o e-mail, imię, rolę, ukryte hasło i sprawdza osobny TOTP pracownika. Ponowne wykonanie dla istniejącego e-maila resetuje jego dane dostępowe i kończy sesje. Nie generuje współdzielonego hasła w kodzie.

| Rola | Uprawnienia |
| --- | --- |
| Właściciel | Cały panel, produkty, zespół, konfiguracja operacyjna, ponowienia zadań |
| Produkcja | Plan, rezerwacje/zużycie materiałów, etapy i zdjęcia; bez anulowania zamówień, zmian cen/produktów, wycen, wysyłki i zarządzania kontami |
| Obsługa | Wyceny, wiadomości, personalizacje, przesyłki, unieważnianie dostępu; bez zmian produktów, planu, magazynu i kont |

Uprawnienia są sprawdzane w API, także przez alias `/api`. Zmiana roli lub deaktywacja kończy sesje. Główne konto właściciela nadal jest konfigurowane prywatnym `.env` i nie można go wyłączyć w tabeli pracowników.

## Trwała kolejka i osobny proces

SQLite przechowuje zadania, deduplikację, próby, termin ponowienia oraz dzierżawę z odnawianiem. Przetwarzane są e-maile, kopie, migracje mediów/miniatury i przesyłki. Domyślnie kolejka działa w procesie API. Na serwerze zalecane są dwa nadzorowane procesy na tym samym komputerze i tym samym trwałym dysku:

```sh
# W prywatnym .env ustaw WORKER_MODE=external
npm start
# Osobny terminal / osobna usługa systemowa:
npm run worker
```

Oba procesy potrzebują tych samych DB_PATH i sekretów. Nie umieszczaj pliku SQLite na sieciowym systemie plików. Planista sprawdza zadania co 30 sekund; awarie transportów są ponawiane maksymalnie 8 razy z opóźnieniem. Nieudane zadania są w panelu. Nie twierdzimy, że SMTP zapewnia dokładnie jedną dostawę — semantyka w INTEGRATIONS.md.

## Zdjęcia, filmy i kopie

| Ustawienie | Znaczenie |
| --- | --- |
| MEDIA_DIR | Lokalny prywatny katalog, domyślnie `var/media` |
| MEDIA_BUCKET | Prywatny bucket S3/R2; pusty oznacza dysk |
| MEDIA_ENDPOINT / MEDIA_REGION | Endpoint HTTPS i region (AWS: bez własnego endpointu; R2: region auto) |
| MEDIA_ACCESS_KEY_ID / MEDIA_SECRET_ACCESS_KEY | Osobne dane dostępu do mediów |
| MEDIA_QUOTA_MB | Łączny limit, domyślnie 1024 MB |

Upload sprawdza i normalizuje obrazy do WebP, usuwa metadane i zapisuje rekord oczekujący w SQLite. Kolejka przenosi plik do magazynu, tworzy miniaturę 480 px, odczytuje wynik i porównuje sumy kontrolne. Dopiero wtedy usuwa bajty z bazy. Nieprzetworzone pliki nadal są dostępne. Limit bufora SQLite: 100 MB, pliku: 12 MB, biblioteki: 10000 plików. Filmy MP4 nie są transkodowane. Publiczne miniatury: adres zdjęcia z `?size=thumb`; prywatne zdjęcia zamówienia zawsze przechodzą kontrolę klucza/sesji. Bucket pozostaje prywatny, backend pośredniczy w pobieraniu.

Nie zmieniaj istniejącego katalogu/bucketu bez przeniesienia plików i sprawdzenia zgodności. Dane bazy zawierają ścieżki i rodzaj magazynu; sama zmiana `.env` nie migruje już przeniesionych plików.

Kopia automatyczna obejmuje również media: każdy zewnętrzny plik i miniatura trafia do zaszyfrowanego obiektu `mariano/media/...`, a obok snapshotu powstaje zaszyfrowany manifest `*.enc.media.enc`. Pliki są niezmienne; kolejne kopie współdzielą obiekty o tej samej sumie kontrolnej. Każdy zapis jest odczytywany i weryfikowany przed oznaczeniem kopii jako poprawnej. Nie ustawiaj krótkiej retencji na współdzielonym prefiksie `mariano/media/`; stare obiekty mogą być nadal potrzebne nowym snapshotom. Klucz BACKUP_KEY przechowuj poza aplikacją.

Odtworzenie na osobnym, pustym celu:

```sh
npm run backup:restore -- snapshot.enc var/odtworzona.sqlite
npm run backup:restore-media -- snapshot.enc.media.enc
```

Druga komenda pobiera szyfrowane media z bucketa kopii, weryfikuje je i zapisuje do aktualnego MEDIA_DIR / MEDIA_BUCKET. Przywróć rodzaj magazynu zgodny ze snapshotem. Istniejącego odmiennego pliku nie nadpisuje. Po sprawdzeniu zatrzymaj API/worker i przełącz DB_PATH. Odtwórz też prywatne sekrety. Manifest nie powstaje, jeśli wszystkie media są jeszcze wewnątrz snapshotu albo galeria jest pusta.

## Przesyłki InPost

Zaimplementowany jest adapter **ShipX PL v1, kurier krajowy**, pobieranie PDF i cykliczne pobieranie statusu. Nie jest to InPost Pay ani integracja płatności klienta. Nie ma wyboru Paczkomatu, zamawiania podjazdu ani automatycznych zwrotów.

Potrzebujesz `INPOST_TOKEN` i `INPOST_ORGANIZATION_ID`, z danymi nadawcy uzupełnionymi na koncie organizacji. `INPOST_ENV=sandbox` jest domyślne. Do prawdziwych etykiet ustaw `INPOST_ENV=production` oraz `INPOST_ALLOW_PAID_LABELS=true` dopiero po sprawdzeniu umowy/kosztów przewoźnika. Formularz również wymaga potwierdzenia kosztu etykiety po stronie pracowni. Dane odbiorcy, telefon, rozmiar i masa paczki są sprawdzane przed kolejką. Nie utworzono rzeczywistych przesyłek w trakcie implementacji.

Zlecenie uproszczone może uruchomić rozliczenie etykiety przez przewoźnika. Asynchroniczny wynik nie oznacza fizycznego odbioru paczki. Po niejednoznacznym wyniku utworzenia **nie ponawiamy automatycznie POST**, aby nie kupić drugiej etykiety. Sprawdź panel InPost po `reference` = pełny numer zamówienia i przypisz znalezione ID ShipX w panelu; backend sprawdzi zgodność referencji. Jeżeli przewoźnik niczego nie utworzył, potrzebna jest ręczna weryfikacja administratora przed odblokowaniem zadania, nie usunięcie historii. Odczyty statusu są bezpiecznie ponawiane, aktywne przesyłki odświeżane co około 30 minut.

## Walidacja i ograniczenia

Testy automatyczne sprawdzają HTTP, uprawnienia, konflikty wersji, rezerwacje, plan, wznowienia kolejki, obrazy, odtworzenie i rendering statyczny. Transporty InPost/SMTP/S3 testowane są z atrapami. Przed rzeczywistym użyciem pozostają: własne konta usług, dostarczenie e-maila, próbna etykieta w sandboxie, rzeczywista kopia i odtworzenie oraz obsługa klawiaturą i telefonem w przeglądarce. W tym zadaniu nie wykonano browser QA ani wdrożenia.

Źródła kontraktów: [InPost tworzenie przesyłki](https://dokumentacja-inpost.atlassian.net/wiki/spaces/PL/pages/18153501), [etykiety PDF](https://dokumentacja-inpost.atlassian.net/wiki/spaces/PL/pages/18153509/Shipment+label+download), [AWS SDK S3](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html).
