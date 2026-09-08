# Mariano API v1

Maszynowy kontrakt OpenAPI 3.1: `GET /api/v1/openapi.json` (źródło `server/openapi.mjs`). Nowe integracje używają `/api/v1`; dotychczasowe `/api` pozostają aliasem do tych samych kontroli. Odpowiedź wersjonowana zawiera `API-Version: 1`. Zmiana niekompatybilna wymaga nowej wersji; dodawanie opcjonalnych pól nie wymaga v2.

Wymagany JSON i ten sam Origin dla POST; cookies SameSite Strict nie zastępują CSRF. Każdy błąd JSON ma `error` (komunikat), `code`, `requestId` i `fields`. 400 walidacja, 401 sesja, 403 uprawnienia/origin/CSRF, 404 brak zasobu lub prywatnego dostępu, 409 konflikt wersji/stanu, 429 limit (`Retry-After`), 5xx awaria. Nie loguj body, cookies, bearerów ani fragmentów linków.

## Uwierzytelnianie

- Klient: `Authorization: Bearer <klucz zamówienia>`, odczyt i zapis dotyczą wyłącznie zamówienia przypisanego do klucza. Wygasa po 30 dniach lub unieważnieniu. Formularz odzyskiwania wymaga numeru i właściwego e-maila, ale odpowiedź nie ujawnia zgodności.
- Pracownik: `POST /admin/login` z `{email,password,otp}` ustawia HttpOnly `mariano_owner`, Path `/api`; zwraca `{csrf,role,actorId}`. `GET /admin/session` odnawia odczyt danych sesji. Zapis wymaga `X-CSRF-Token`. Nie przekazuj tokenu sesji JavaScriptowi.
- `POST /admin/logout` kończy sesję. Role egzekwuje serwer; ukrycie przycisku nie jest zabezpieczeniem.

## Centrum klienta

| Endpoint pod `/api/v1` | Dane / wynik |
| --- | --- |
| GET `/service/orders/{id}` | Produkty, etapy/zdjęcia, pierwotny snapshot, wersje specyfikacji, wiadomości, status i numer przesyłki |
| POST `/service/orders/{id}/decision` | `{specificationId,decision:"accept" lub "changes",acknowledged:true,note?}`; `note` wymagane przy zmianach |
| POST `/service/orders/{id}/messages` | `{content,requestKey}`; treść 1–3000 znaków, klucz 16–80; ponowienie tego samego zapisu zwraca `replayed:true` |

Oferta: `amount` w całkowitych groszach PLN (łączna kwota wraz z ustaloną dostawą), `estimated_date` YYYY-MM-DD, `expires` Unix ms. `content` zawiera opis, materiał, pomiary i dostawę. Statusy: `offered`, `accepted`, `changes_requested`, `superseded`. Akceptacja starej, wygasłej lub niemożliwej do wykonania wersji zwraca 409. Cena z żądania klienta nigdy nie steruje wyceną. Oryginalny snapshot zamówienia i każda wersja treści są zachowane.

## Operacje pracowni

| Endpoint | Metoda / wymagane dane |
| --- | --- |
| `/admin/service?from=YYYY-MM-DD&to=YYYY-MM-DD` | GET; plan do 93 dni, materiały, role; właściciel dodatkowo zadania i historia |
| `/admin/service/orders/{id}` | GET; szczegóły, specyfikacje, rozmowa, rezerwacje i ID przesyłki |
| `/admin/service/orders/{id}/specifications` | POST; `{previousVersion,amount,estimatedDate,validDays,description,measurements,material,delivery}` |
| `/admin/service/orders/{id}/messages` | POST; `{content,requestKey}` |
| `/admin/service/custom/{id}/convert` | POST `{}`; jeden powiązany order ID, bez automatycznej akceptacji |
| `/admin/service/stock` | POST; `{id?,name?,unit?:"cm" lub "piece",delta,note,requestKey}`; nazwa/jednostka przy nowym materiale |
| `/admin/service/orders/{id}/reservations` | POST; `{items:[{materialId,quantity}]}`; atomowe zastąpienie całego zestawu |
| `/admin/service/orders/{id}/materials` | POST; `{action:"consume" lub "release"}` |
| `/admin/service/capacity` | POST; `{day,capacity}` w minutach |
| `/admin/service/tasks` | POST; `{id?,revision?,orderId,day,minutes,title,assignee?,status}`; status planned/done/cancelled |
| `/admin/service/staff` | POST; `{id,revision,role,active}`; kończy sesje zmienionego konta |
| `/admin/service/jobs/retry` | POST `{id}`; tylko nieudane zadania, bez ponawiania tworzenia przesyłki |
| `/admin/service/orders/{id}/shipment` | POST; dane nadania opisane w schemacie Shipment; idempotencja: jedna przesyłka na zamówienie |
| `/admin/service/shipments/{id}/refresh` | POST `{}`; dodaje odczyt do kolejki |
| `/admin/service/shipments/{id}/reconcile` | POST `{providerId}`; sprawdza referencję po stronie InPost |
| `/admin/service/shipments/{id}/label` | GET; PDF, sesja i rola właściciel/obsługa |

Nie ma publicznego endpointu nadawania ról ani tworzenia kont. Lokalny `staff:setup` to operacja administratora serwera. Historia zmian używa ID pracownika. Szczegółowa macierz ról i konfiguracja integracji w OPERATIONS.md.

## Zachowany checkout i pozostałe endpointy

`GET /catalog` zwraca konfig sklepu, produkty z bazy i opcje dostawy. `POST /quote` przyjmuje `{lines:[{slug,size,variant,quantity}],shipping}`. Wynik: canonical lines, shipping, subtotal, total, currency PLN i fingerprint.

`POST /orders`: te same lines/shipping, `quoteFingerprint`, `idempotencyKey` (24–80 znaków), `accessToken` (64 hex, generowany przez klienta), `acknowledged:true`, `customer:{name,email,notes,street?,city?,postalCode?,country?}`. Kurier wymaga polskiego adresu i country PL. Zapis ceny pochodzi wyłącznie z backendu. Utrata odpowiedzi: ponów dokładnie ten sam request i klucze. Ten sam klucz z innym requestem: 409. Nie generuj kolejnego zamówienia automatycznie. `GET /orders/{id}` zwraca prywatne pierwotne potwierdzenie, a centrum przechowuje późniejsze ustalenia.

`POST /contact` `{name,email,message,acknowledged:true}` zapisuje wiadomość. `POST /newsletter` `{email,consent:true}` uruchamia double opt-in po skonfigurowaniu SMTP. `POST /newsletter/action` `{purpose:"confirm" lub "unsubscribe",token}` wymaga ważnego jednorazowego tokena. `POST /personalizations` przyjmuje slug, name, email, material, print, waist, hips, inseam, notes, acknowledged — pomiary w cm, dostępne opcje z katalogu; nie przyjmuje ceny klienta.

Starsze endpointy `/admin/products/{slug}`, `/admin/uploads`, `/admin/orders/{id}/progress`, `/admin/orders/{id}/revoke`, `/admin/custom/{id}` i `/admin/mail/retry` nadal działają z rolami. Produkt wysyłany jest jako pełny rekord z `revision`. Upload: `{data:<base64>,mime,orderId?}`, do 12 MB. Progress: `{revision,stage,estimatedDate,note,photos:[assetId]}`. Zmiana produktu/zamówienia z nieaktualną rewizją: 409, wymagane odświeżenie i ponowne przejrzenie danych. Schematy Record w OpenAPI dla starszych endpointów oznaczają kontrakty opisane tutaj, nie zgodę na dowolne pola wejściowe.

Płatności pozostają wyłączone. Adapter przyszłych płatności nie jest uruchamiany przez przyjęcie wyceny ani utworzenie etykiety przewoźnika.
