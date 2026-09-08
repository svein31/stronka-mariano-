# Uruchomienie funkcji Mariano

Płatności pozostają wyłączone. Kod obsługuje katalog w bazie, szybki podgląd, asystenta rozmiaru, personalizację, panel właściciela, realizację i zdjęcia zamówień. Zewnętrzne konta nie zostały utworzone ani połączone automatycznie.

## Na własnym komputerze

Node.js 24+, Git oraz npm. Przełącz na gałąź codex/workshop-management, wykonaj npm ci, a potem:

```sh
npm run owner:setup
npm run dev
```

Konfigurator pyta o e-mail właściciela, hasło i drugi składnik logowania. Podaj wskazany przez siebie adres. Ustaw nowe, unikatowe hasło zamiast hasła udostępnionego w rozmowie. Konfiguracja zapisuje tylko hash hasła i klucze w prywatnym .env. Nie zapisuje ich w Git. Po sklonowaniu repo trzeba wykonać konfigurator na komputerze/serwerze uruchamiającym aplikację — prywatne ustawienia nie przychodzą z repozytorium.

Panel: http://localhost:5173/admin. Publiczne funkcje: /shop, /track, /personalize/botanika. Npm run dev uruchamia frontend i API razem. Nie jest wdrożeniem. Do lokalnego podglądu produkcyjnego: npm run build i npm start; ustaw PUBLIC_ORIGIN=http://localhost:3001.

## Potrzebne usługi i ustawienia

| Funkcja | Usługa / dane | Zmienne |
| --- | --- | --- |
| Produkty, panel, personalizacja, zdjęcia i realizacja | Lokalna baza SQLite, bez konta/API | DB_PATH; trwały dysk i uprawnienia do katalogu var |
| Właściciel | Lokalny konfigurator oraz aplikacja TOTP, np. Google Authenticator lub 2FAS | ADMIN_EMAIL, ADMIN_PASSWORD_HASH, ADMIN_TOTP_SECRET |
| E-maile transakcyjne, potwierdzanie newslettera i wypisanie | Konto SMTP z zatwierdzonym nadawcą | SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM; DATA_KEY |
| Kopie poza serwerem | Prywatny bucket Amazon S3 lub zgodny z S3, np. Cloudflare R2 | BACKUP_BUCKET, BACKUP_ENDPOINT, BACKUP_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY; BACKUP_KEY |
| Publiczny sklep | Domena, DNS, serwer Node z trwałym dyskiem, reverse proxy TLS | PUBLIC_ORIGIN, STORE_MODE; opcjonalnie TRUSTED_PROXIES |
| Alarmy błędów | Opcjonalny odbiornik webhook HTTPS przyjmujący opisany JSON | ALERT_WEBHOOK_URL, opcjonalnie ALERT_WEBHOOK_TOKEN |
| Wykrywanie całkowitej awarii | Zewnętrzny monitor HTTP sprawdzający /api/health | Konfiguracja URL w monitorze; aplikacja nie potrzebuje jego klucza API |
| Kontrole kodu | GitHub Actions, Dependabot, CodeQL | Brak ręcznie wpisywanego tokena; włącz Actions i ochronę gałęzi w repo |

Żadnych kluczy nie umieszczaj w zmiennych VITE_, w komponentach React ani w rozmowie. W produkcji wpisz je w menedżerze sekretów hostingu.

## E-maile: co dokładnie skonfigurować

Wybierz dostawcę SMTP, który pozwala wysyłać pocztę transakcyjną z Twojej domeny. Potrzebny jest host, port 587 lub 465, login, hasło SMTP i zatwierdzony adres MAIL_FROM. W panelu dostawcy wykonaj wymagane rekordy DNS SPF/DKIM i konfigurację DMARC. Hasło SMTP nie musi być hasłem do panelu strony i nie powinno nim być.

PUBLIC_ORIGIN musi wskazywać adres strony dostępny dla odbiorcy, ponieważ trafia do linków. Localhost w e-mailu otworzy komputer odbiorcy — do testów pomiędzy urządzeniami potrzebny jest dostępny adres testowy.

DATA_KEY szyfruje oczekujące wiadomości w SQLite. Konfigurator tworzy go lokalnie. Zachowaj ten klucz poza serwerem razem z prywatną konfiguracją; bez niego nie odczytasz oczekujących wiadomości po odtworzeniu bazy.

Proces aplikacji sprawdza kolejkę co 30 sekund. Ustawione SMTP oznacza gotowość konfiguracji, nie potwierdzenie dostarczenia do skrzynki. Błędy są ponawiane z opóźnieniem do 8 prób, potem widoczne jako failed. SMTP może dostarczyć duplikat po awarii między przyjęciem wiadomości a zapisem statusu; Message-ID pozostaje stały. Nie deklarujemy exactly-once delivery ani dostarczenia do inboxa.

Wysyłane są: potwierdzenie zamówienia, zmiany etapów/wysyłka, odzyskanie dostępu, odpowiedź na wycenę oraz potwierdzenie/wypisanie newslettera. Nie ma narzędzia masowej kampanii marketingowej. Bez SMTP formularze zapisują dane; nie udają wysłania poczty.

## Dostęp do realizacji

Pierwotny klucz potwierdzenia oraz klucze e-mail wygasają po 30 dniach. Właściciel może unieważnić wszystkie dotychczasowe klucze. Klient może uzyskać nowy przez podanie numeru zamówienia i pasującego e-maila; odpowiedź API nie ujawnia, czy dane pasowały. Potrzebne jest działające SMTP.

Link e-mail zawiera sekret w fragmencie po #, który nie jest wysyłany w żądaniu HTTP. Strona usuwa fragment z bieżącego adresu, zapisuje dostęp tylko w sesji karty i używa nagłówka Authorization. Sam link jest poufny — nie należy go udostępniać. Zdjęcia realizacji wymagają uprawnienia do konkretnego zamówienia. Publiczny katalog i publiczne zdjęcia produktów są dostępne bez konta.

## Kopie i przywracanie

Utwórz PRYWATNY bucket poza serwerem aplikacji. Token powinien mieć tylko odczyt i zapis obiektów w wyznaczonym buckecie/prefiksie mariano/. Nie włączaj publicznego odczytu. Dla R2 ustaw endpoint z panelu i region auto; dla AWS S3 ustaw właściwy region, pozostaw endpoint pusty. BACKUP_KEY to osobny losowy klucz AES-256 wygenerowany przez konfigurator. Przechowuj go w menedżerze haseł poza serwerem i bucketem.

Aplikacja wykonuje kopię online przez SQLite backup API, szyfruje AES-GCM, wysyła do bucketu, pobiera ją ponownie, odszyfrowuje i sprawdza integralność bazy oraz zgodność bajtów ze snapshotem. Harmonogram działa tylko, gdy proces aplikacji jest uruchomiony, domyślnie co 24 godziny. Wynik pojawia się w panelu. Ręczne wykonanie:

```sh
npm run backup
npm run backup:restore -- pobrana-kopia.enc var/odtworzona.sqlite
```

Przywracanie wymaga pobranego obiektu .enc i BACKUP_KEY. Nigdy nie nadpisuje istniejącego pliku. Po weryfikacji zatrzymaj aplikację i ustaw DB_PATH na odtworzony plik. Zachowaj oryginalny DATA_KEY dla kolejki e-mail. Unieważnij stare sesje właściciela i klucze klientów po odtwarzaniu historycznej bazy, jeśli mogły zostać odwołane po dacie kopii. Zmiana hasła właściciela unieważnia stare sesje.

Galeria jest ograniczona do 100 MB łącznie / 1000 plików; pojedynczy upload do 12 MB. Snapshot do 256 MB. To świadomy budżet małej pracowni; większa biblioteka wymaga osobnego storage plików i strumieniowych kopii. Zdjęcia są normalizowane do WebP bez metadanych. MP4 są przechowywane jako przesłane pliki; dodaj napisy, jeżeli film zawiera istotną mowę.

Ustaw retencję obiektów i wersjonowanie w buckecie, zgodnie z potrzebami pracowni. Kod nie usuwa zdalnych kopii. Regularnie ćwicz także pełne odtworzenie aplikacji na innym urządzeniu, wraz z prywatnymi ustawieniami; automatyczny test sprawdza bazę, nie całą infrastrukturę.

## HTTPS, proxy i monitorowanie

Przykład Caddy jest w ops/Caddyfile. Domena musi wskazywać na serwer, a porty 80/443 być dostępne dla proxy. Backend pozostaje na 127.0.0.1:3001. PUBLIC_ORIGIN ustaw na dokładny adres https://twoja-domena bez końcowego /. TRUSTED_PROXIES ustaw wyłącznie na faktyczny adres bezpośredniego proxy (w tym przykładzie 127.0.0.1). Proxy MUSI nadpisywać X-Real-IP, nie doklejać danych klienta. Nie ufamy X-Forwarded-For ani dowolnym adresom.

Jeśli przed Caddy dodasz kolejny CDN/proxy, skonfiguruj osobno zaufanie do niego; nie kopiuj nagłówków klienta jako adresu IP. HTTPS/HSTS dotyczą publicznego środowiska, lokalny podgląd pozostaje HTTP.

Dziennik zapisuje kody zdarzeń, czasy i identyfikatory, bez treści formularzy, haseł, adresów klientów i tokenów. Webhook otrzymuje wyłącznie JSON:
```json
{"service":"mariano","events":{"server_error":2,"owner_login_failed":3}}
```
Można go skierować do własnego endpointu lub webhooka automatyzacji, który przekaże alarm. To nie jest bezpośredni format webhooka Slack/Discord. Nigdy nie zapisuj sekretnego URL w repo. Dodaj niezależny monitor /api/health — wyłączony serwer nie może sam wysłać alarmu. Sprawdzaj też worker_last_ok oraz datę backup_verified.

## GitHub i walidacja

Workflow uruchamia build, testy, audyt palety, kontrolę typowych wzorców sekretów, Gitleaks, npm audit i CodeQL. Dependabot proponuje aktualizacje npm i Actions. Gitleaks nie wymaga ręcznego klucza licencji dla repozytorium na koncie osobistym; przeniesienie repo do organizacji wymaga sprawdzenia warunków narzędzia. W repo włącz Actions, secret scanning/push protection, jeżeli dostępne, oraz regułę gałęzi wymagającą zielonych kontroli przed merge. Sam plik workflow nie ustawia reguł repozytorium. Jeśli CodeQL default setup jest już aktywny, wybierz jeden tryb konfiguracji.

Testy obejmują serwer HTTP, bazę, uprawnienia i renderowanie statyczne. SMTP i S3 testowane z kontrolowanymi atrapami transportów, nie z rzeczywistymi usługami. Nie przeprowadzono testów gestów/fokusu w przeglądarce ani pomiarów na fizycznym telefonie. Przed publicznym użyciem zweryfikuj pełny przepływ w przeglądarce, prawdziwą dostawę e-mail, zdalną kopię, konfigurację proxy, zdjęcia/wymiary produktów i dokumenty prawne.

Źródła implementacji: [Nodemailer SMTP](https://nodemailer.com/smtp), [Node SQLite backup](https://nodejs.org/api/sqlite.html), [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [otplib](https://github.com/yeojz/otplib), [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).
