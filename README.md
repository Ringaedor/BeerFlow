# Documentazione di Progetto — Gestionale per Birreria (BeerFlow)

**Versione:** 1.0

**Scopo del documento:** questa è la documentazione tecnica e funzionale completa destinata a un'azienda di sviluppo incaricata della realizzazione del gestionale "BeerFlow" per birrerie, pub, brewpub e locali ristorativi. Contiene la visione di prodotto, requisiti funzionali e non funzionali, architettura logica, dati, API di riferimento, UI/UX, criteri di accettazione e deliverable richiesti.

---

## 1. Executive summary

BeerFlow è una piattaforma gestionale modulare, mobile‑first e cloud‑ready pensata per locali di ristorazione con focus su birrerie e brewpub. L'obiettivo è fornire un ecosistema unico che unisca: gestione tavoli e comande, magazzino e tracciabilità lotti (HACCP), OCR/document understanding per DDT e fatture, gestione personale (badge, checklist, presenze), ticket manutentivo e CRM/profilazione multicanale. La piattaforma dovrà essere modulare (attivazione funzionalità a livello venue) e integrabile con sistemi esterni (pagamenti, booking, delivery, sensori IoT).

---

## 2. Visione e obiettivi di progetto

**Visione:** trasformare le operazioni quotidiane di un locale in flussi dati coerenti e automatizzati, eliminando inserimenti manuali ridondanti, garantendo compliance HACCP e GDPR e fornendo insight operativi e commerciali in tempo reale.

**Obiettivi principali:**
- Semplificare la presa ordini e la gestione sala con interfacce mobile per camerieri e pannello staff per il manager.
- Garantire tracciabilità completa (lotti → prodotto finito → vendita) e automazione dei registri HACCP.
- Automatizzare l'acquisizione documentale (DDT / fatture) tramite OCR con workflow di revisione umana.
- Fornire strumenti avanzati di magazzino: gestione lotti, fusti/keg, inventari e suggerimenti riordino.
- Centralizzare la gestione del personale: timbrature, checklist, formazione e messaggistica interna.
- Offrire una piattaforma CRM/profilazione multicanale con gestione consensi GDPR.
- Integrare ticket manutentivi con logiche preventive e registro pezzi di ricambio.

---

## 3. Stakeholder e user personas

**Stakeholder primari:** proprietario/gestore, mastro birraio / responsabile produzione, capo sala, camerieri, cuoco, magazziniere, responsabile HACCP, tecnico manutentivo, contabile/consulente.

**User personas sintetiche:**
- **Manager:** view globale, KPI e report, configurazione multi‑venue. 
- **Cameriere:** presa comande mobile PWA, gestione tavoli, check-in, messaggistica rapida. 
- **Mastro birraio:** produzione, lotti, scadenze, HACCP, gestione ricette. 
- **Magazziniere:** ricezione merce, inventari, conteggi ciclici, creazione lotti. 
- **Operatore manutenzione:** dashboard ticket, storico interventi, gestione pezzi. 
- **Cliente:** prenotazione, storicizzazione ordini, loyalty e ricezione promozioni (profilazione). 

---

## 4. Ambito funzionale (scope)

Il sistema è modulare. Ogni modulo indicato può essere attivato/disattivato a livello di singola venue.

### 4.1 Modulo Core
- Autenticazione (email/password, SSO opzionale). 
- RBAC avanzato (ruoli e permessi granulare). 
- Multi‑venue e multi‑layout per sale. 
- Configurazione aziendale (valute, tasse, modalità documentali locali).

### 4.2 Magazzino & Produzione
- Anagrafica prodotti con unità e conversioni. 
- Movimenti di magazzino (in/out/adjustment/transfer/waste). 
- Gestione lotti e scadenze (FEFO/FIFO). 
- Ricezione merce con creazione lotti. 
- Gestione fusti/keg (serial, residuo stimato, vuoto a rendere). 
- Inventari e conteggi ciclici mobile. 
- Alert soglie e PO draft.

### 4.3 Sala / POS / Comande / Prenotazioni
- Presa comanda mobile (PWA) per camerieri. 
- POS (cassa) con split bill, pagamenti multipli, sconti e gestione mance. 
- KDS per cucina/bar con timers e priorità. 
- Gestione tavoli visuale (drag & drop), unione/split tavoli, layout multipli. 
- Prenotazioni multicanale: sito, QR, app, integrazione con TheFork/booking esterni e API. 

### 4.4 HACCP & Qualità
- Temperature logs manuali e integrazione sensori. 
- Checklists operative per inizio/fine turno con firma. 
- Non‑conformità e CAPA workflow (registrazione, assegnazione, follow-up). 
- Tracciabilità ingredienti → lotto → piatto → vendita. 

### 4.5 Document Intelligence & OCR
- Upload immagini/PDF, preprocessing (deskew, contrast). 
- OCR (Tesseract/EasyOCR iniziale, opzione cloud GA/MS/AWS). 
- Parsing fattura/DDT (vendor, date, lines, totals). 
- Human-in-the-loop review UI. 
- Collegamento documenti → magazzino (carico automatico) e contabilità.

### 4.6 Personale & Portale Dipendente
- Timbratura IN/OUT (QR/NFC/geofencing). 
- Gestione turni e shift swap con approvazione. 
- Checklist di turno e manuali operativi per ruolo con versioning. 
- Messaggistica interna per reparti. 

### 4.7 CRM & Profilazione Multicanale
- Customer ID centrale con multi‑identities (email, phone, device, pos_card). 
- Gestione consensi (scopi e canali) con versioning. 
- Event stream per tutti gli eventi cliente. 
- Segmentazione dinamica e campagne (email/SMS/push). 
- Loyalty & coupon system.

### 4.8 Manutenzione & Facility
- Ticketing con foto, priorità, area e assegnazione. 
- Pianificazione manutenzione preventiva e materiali di ricambio. 
- Integrazione con HACCP (ticket critico → NC automatico).

### 4.9 Analytics & BI
- Dashboard KPI (vendite, margini, food/pour cost, occupazione). 
- Product insights e menu engineering. 
- Esportazioni e report per commercialista e controllo qualità.

### 4.10 Integrazioni & API
- Webhooks & REST API (event bus). 
- Integrazione POS hardware, stampanti termiche, lettori barcode, sensori IoT. 
- Opzioni OCR cloud, gateway SMS/email, payment providers, sistemi di prenotazione.

---

## 5. Requisiti funzionali dettagliati (selezione critica)

Di seguito le user stories più importanti (MUST) che devono essere consegnate per l'accettazione MVP.

### 5.1 Badge IN/OUT e presenze
- Come dipendente voglio timbrare IN/OUT dal mio smartphone; il sistema registra timestamp, location (se abilitata), e collega lo time sheet al turno pianificato.
- Acceptance: ogni timbratura crea record immutabile con user_id, timestamp e metodo; amministrazione esporta report periodo.

### 5.2 Checklist inizio/fine turno
- Checklists differenziate per ruolo, obbligatorie per procedere; firmate con nome e timestamp.
- Acceptance: record storico visibile e esportabile.

### 5.3 Presa comanda mobile e scarico magazzino
- Comanda inviata dal cameriere appare al KDS; quando contrassegnata come servita genera stock_movements collegati a lotti (FEFO).
- Acceptance: comanda ha id, stato, cameriere, tavolo; scarico decrementa lotti e aggiorna giacenza.

### 5.4 OCR DDT/fatture (MVP light)
- Upload immagine/PDF; OCR estrae campi principali; documenti con bassa confidenza passano in review.
- Acceptance: creazione document record + parsed JSON; approvazione crea carico e lotto.

### 5.5 Gestione tavoli con drag & drop
- Pannello staff con canvas; possibilità di spostare, unire, modificare tavoli; associarvi prenotazioni.
- Acceptance: salvataggio layout, undo/redo basilare.

### 5.6 Ticket manutentivo rapido
- Creazione ticket con foto e urgenza; assegnazione e storico; integrazione con HACCP per NC.
- Acceptance: ticket genera notifiche e storico modifiche.

### 5.7 Profilazione cliente & consensi
- Creazione customer con identità multiple e registro consensi immutabile; double opt‑in per email/SMS.
- Acceptance: endpoint per export dati cliente e revoca consenso.

### 5.8 Temperature logs & HACCP alerts
- Registrazione manuale temperature e soglie di alert; storico grafico disponibile.
- Acceptance: creazione temperature_logs con user_id e area; alert generati se out of range.

### 5.9 Inventario mobile
- Conteggio dal device con scan barcode; generazione stock adjustments con motivo.
- Acceptance: reconciliate differenze e storicità movimenti.

---

## 6. Requisiti non funzionali

### 6.1 Scalabilità
- Multi‑tenant (multi‑venue). Il backend deve scalare orizzontalmente; i workers OCR e background jobs devono essere separati e scalabili.

### 6.2 Disponibilità e tolleranza ai guasti
- SLA desiderabile: alta disponibilità per funzionalità critiche (POS, KDS). Progettare retry e job queue per operazioni offline.

### 6.3 Performance
- Interfacce operative (PWA comande, KDS) con latenza percepita <200ms per operazioni chiave su reti locali. API per dashboard possono essere meno reattive.

### 6.4 Sicurezza e compliance
- TLS everywhere, crittografia at‑rest per PII sensibili (email/phone/hash), RBAC rigoroso, audit log immutabile per eventi critici. DPA con terzi.

### 6.5 GDPR & privacy
- Registro consensi versionato e immutabile; endpoint per DSAR (export/cancellazione). Minimizzazione dati e retention policy configurabile.

### 6.6 Locale / Offline support
- PWA offline queue per presa comande e caricamento documenti; sincronizzazione quando raggiunta connessione.

---

## 7. Architettura consigliata (alto livello)

### 7.1 Componenti
- Frontend: React + Vite, TailwindCSS, PWA support; mobile‑first per app camerieri. 
- Backend: Node.js (Express / NestJS) o alternatives (Python/Django) con REST+GraphQL. 
- DB: PostgreSQL (schema relazionale) + Redis per queue/cache. 
- Storage: S3 compatible (Supabase Storage / AWS S3) per file/documenti. 
- Workers: servizi separati per OCR (Python recommended), processing documenti, jobs asincroni (BullMQ/Redis). 
- Real‑time: WebSockets / Supabase Realtime / Socket.io per comande/KDS/update tavoli.

### 7.2 Pipeline OCR
- Upload → object storage → enqueue job → worker preprocessing (OpenCV) → OCR (Tesseract/EasyOCR) → parsing (invoice2data/spaCy/layout-parser) → store parsed JSON → confidence score → if low -> mark review, else map to PO/stock.

### 7.3 Event bus
- Ogni evento (comanda creata, documento approvato, ticket aperto) pubblica event sul bus (webhooks + internal pub/sub). Questo consente integrazione e plugin esterni.

### 7.4 Multi‑venue data partitioning
- Shared DB with `venue_id` scoping; per-tenant configuration table. Optionally schema separation per customer per esigenze enterprise.

---

## 8. Modello dati (sintesi / tabelle chiave)

Elenco ridotto di tabelle e campi essenziali (esempi concisi):
- venues(id, name, settings)
- users(id, venue_id, email, role, permissions)
- products(id, venue_id, sku, name, unit, cost, price, attributes)
- lots(id, product_id, lot_code, qty_init, qty_current, expiry_date, location)
- stock_movements(id, lot_id, product_id, qty, type, reference_type, reference_id, user_id, created_at)
- tables(id, venue_id, name, seats, position_json, status)
- reservations(id, customer_id, table_id, start_time, end_time, status, source)
- orders(id, table_id, user_id, status, total)
- order_items(id, order_id, product_id, qty, price, lot_id)
- documents(id, venue_id, uploader_id, type, storage_path, parsed_json, status)
- temperature_logs(id, venue_id, area, temp, recorded_at, user_id)
- tickets(id, venue_id, area, description, priority, status, assignee_id)
- customers(id, name, dob, attrs)
- customer_identities(id, customer_id, provider, identifier, verified)
- consents(id, customer_id, purpose, channel, granted, version, granted_at)

(Il documento consegnato al dev team dovrà includere lo schema ER completo con relazioni, vincoli e indici suggeriti.)

---

## 9. API & Contracts (indicativo)

Fornire contratti REST/GraphQL comprensivi di request/response. Esempio breve REST:

- `POST /api/v1/auth/login` → {email,password} → {token, user}
- `GET /api/v1/venues/:id/tables` → lista tavoli
- `POST /api/v1/orders` → {venue_id, table_id, user_id, items: [{product_id, qty, notes}]} → {order_id, status}
- `POST /api/v1/documents/upload` → multipart file → {document_id, status}
- `GET /api/v1/documents/:id` → {parsed, status, storage_path}
- `POST /api/v1/stock_movements` → crea movimento (in/out/adjust)
- `POST /api/v1/tickets` → crea ticket manutentivo
- `POST /api/v1/customers` → crea/merge customer identity

Ogni endpoint deve essere documentato (fields, validations, error codes) e protetto con autorizzazioni.

---

## 10. UI/UX e design system

- Il team design riceverà i wireframe già prodotti nella canvas (Staff & POS). Il sistema UI dovrà includere component library React (Tailwind + tokens). 
- Pattern importanti: mobile-first, touch-friendly, grandi touch-target, feedback immediato su operazioni (toast, spinner), modalità offline per PWA con sync status. 
- Fornire varianti colore a contrasto alto per visibilità in ambienti poco illuminati.

---

## 11. Quality Assurance e Testing

- Test funzionali: user flows critici (presa comanda → KDS → scarico stock; ricezione merce → creazione lotto; OCR review → carico magazzino). 
- Test di integrazione: POS, stampanti, payment gateway, sensori. 
- Test di sicurezza: scansione vulnerabilità, pen test sulle API, controllo accessi. 
- Test di performance: carichi su KDS/Comande con simulazione concorrenza e test di fallback offline. 

---

## 12. Criteri di accettazione e deliverable

**Deliverable minimi per il passaggio in produzione (MVP):**
1. Backend API complete e documentate (OpenAPI/Swagger). 
2. Frontend PWA: Staff Map, POS, KDS, Inventory, Employee Portal, OCR Review, Ticketing. 
3. Database schema (migrations) e seed data per test. 
4. Worker OCR funzionante con pipeline (Tesseract) e UI review. 
5. Sistema di autenticazione e RBAC. 
6. Documentazione di deploy e runbook: setup infra, backup, logging, monitoring.
7. Test report funzionali e di sicurezza.
8. Documentazione operativa: manuale admin, manuale utente (cameriere, magazziniere), procedure HACCP integrate.

**Acceptance criteria (esempi):**
- Comanda presa da PWA è visibile nel KDS entro X secondi (document in canvas should not include time; omit specifics). 
- Ricezione merce via OCR produce suggerimento lotto con confidenza >= soglia o va in review. 
- Sistema registra badge IN/OUT e produce report presenze esportabile. 
- Ticket manutentivo ha workflow e notifiche funzionanti.

---

## 13. Deployment e operazioni

- Ambiente consigliato: cloud provider (AWS, GCP, Azure) o Supabase for managed Postgres + Storage. 
- Consigli: containerizzazione (Docker), orchestrazione (Kubernetes or managed service), CI/CD pipeline (GitHub Actions / GitLab CI). 
- Osservability: logging centralizzato (ELK/Cloudwatch), metrics (Prometheus/Grafana), alerting su errori critici e queue backpressure.

---

## 14. Roadmap funzionale (ordine di rilascio raccomandato)

1. CORE (auth, venues, RBAC) + Magazzino base + Anagrafica prodotti.
2. PWA presa comanda mobile + KDS + POS basico (chiusura conto senza multi‑split avanzato).
3. Employee Portal (badge + checklist) + Ticket manutentivo.
4. OCR pipeline MVP + OCR review UI + auto carico lotti.
5. Prenotazioni e gestione tavoli avanzata (drag & drop, layout multipli).
6. CRM & profilazione multicanale + consensi.
7. Advanced analytics, BI, predictive ordering e menu engineering.

(Questo è un suggerimento di priorità funzionale; tempi e scadenze verranno concordati con il team di sviluppo.)

---

## 15. Governance del progetto e documenti da consegnare al team sviluppo

- Documento dei requisiti completo (questo documento). 
- Wireframes e mockups high‑fidelity (Figma files). 
- API contract (OpenAPI spec). 
- DB migrations & seed scripts. 
- Test cases e acceptance test plan. 
- Runbook operazionale e manuali utente. 

---

## 16. Appendix

### 16.1 Tecnologie suggerite
- Frontend: React, Vite, TailwindCSS, React Query, Zustand (o Redux). 
- Backend: Node.js (NestJS / Express) o Python (FastAPI/Django) + PostgreSQL. 
- OCR worker: Python (OpenCV, pytesseract, invoice2data, layout-parser). 
- Message queue: Redis + BullMQ o RabbitMQ. 
- Storage: S3-compatible. 
- Realtime: Socket.io / Supabase Realtime.

### 16.2 Glossario
- **PWA:** Progressive Web App. 
- **KDS:** Kitchen Display System. 
- **HACCP:** Hazard Analysis and Critical Control Points. 
- **FEFO:** First Expired First Out. 

---

> Nota finale: questo documento è pensato come base di partenza esaustiva per la realizzazione del progetto. Il team di sviluppo riceverà, oltre a questo specifico documento, i wireframe già presenti nella canvas, il codice scaffold React e le linee di design. Per ogni sezione il team dovrà produrre definizioni tecniche e API spec dettagliate (OpenAPI) prima di partire con l'implementazione.


---

## 17. OpenAPI 3.0 - SPEC BASE (YAML)

Di seguito una **spec OpenAPI 3.0** di base che il team backend potrà usare come starting point e arricchire. Copiare/convertire in `openapi.yaml` e caricare su Swagger / Redoc per revisione.

```yaml
openapi: 3.0.3
info:
  title: BeerFlow API
  version: 1.0.0
  description: API base per il gestionale BeerFlow (auth, tavoli, comande, magazzino, documenti, ticket, clienti)
servers:
  - url: https://api.example.com/v1
    description: Production server
  - url: http://localhost:3000/v1
    description: Local dev
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
        name:
          type: string
        role:
          type: string
    Venue:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        settings:
          type: object
    Table:
      type: object
      properties:
        id:
          type: string
          format: uuid
        venue_id:
          type: string
        name:
          type: string
        seats:
          type: integer
        position_json:
          type: object
        status:
          type: string
          enum: [free, booked, occupied, cleaning, out_of_service]
    Product:
      type: object
      properties:
        id: { type: string, format: uuid }
        venue_id: { type: string }
        sku: { type: string }
        name: { type: string }
        unit: { type: string }
        cost: { type: number, format: float }
        price: { type: number, format: float }
        attributes: { type: object }
    Lot:
      type: object
      properties:
        id: { type: string, format: uuid }
        product_id: { type: string }
        lot_code: { type: string }
        qty_init: { type: number }
        qty_current: { type: number }
        expiry_date: { type: string, format: date }
        location: { type: string }
    StockMovement:
      type: object
      properties:
        id: { type: string }
        lot_id: { type: string }
        product_id: { type: string }
        qty: { type: number }
        type: { type: string }
        reference_type: { type: string }
        reference_id: { type: string }
        user_id: { type: string }
        created_at: { type: string, format: date-time }
    Order:
      type: object
      properties:
        id: { type: string }
        venue_id: { type: string }
        table_id: { type: string }
        user_id: { type: string }
        status: { type: string }
        total: { type: number }
        items:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
    OrderItem:
      type: object
      properties:
        product_id: { type: string }
        qty: { type: integer }
        price: { type: number }
        notes: { type: string }
    Document:
      type: object
      properties:
        id: { type: string }
        venue_id: { type: string }
        uploader_id: { type: string }
        type: { type: string }
        storage_path: { type: string }
        parsed_json: { type: object }
        status: { type: string }
    Ticket:
      type: object
      properties:
        id: { type: string }
        venue_id: { type: string }
        area: { type: string }
        description: { type: string }
        priority: { type: string }
        status: { type: string }
        assignee_id: { type: string }
    Customer:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        dob: { type: string, format: date }
        attrs: { type: object }
    Consent:
      type: object
      properties:
        id: { type: string }
        customer_id: { type: string }
        purpose: { type: string }
        channel: { type: string }
        granted: { type: boolean }
        version: { type: string }
        granted_at: { type: string, format: date-time }
security:
  - bearerAuth: []
paths:
  /auth/login:
    post:
      summary: Login
      tags: [Auth]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email: { type: string }
                password: { type: string }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  token: { type: string }
                  user: { $ref: '#/components/schemas/User' }
  /venues/{venueId}/tables:
    get:
      summary: Lista tavoli per venue
      tags: [Venue]
      parameters:
        - name: venueId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Table'
  /orders:
    post:
      summary: Crea una nuova comanda
      tags: [Orders]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [venue_id, table_id, user_id, items]
              properties:
                venue_id: { type: string }
                table_id: { type: string }
                user_id: { type: string }
                items:
                  type: array
                  items: { $ref: '#/components/schemas/OrderItem' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
  /documents/upload:
    post:
      summary: Upload document
      tags: [Documents]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
                type:
                  type: string
      responses:
        '201':
          description: Uploaded
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Document'
  /documents/{id}:
    get:
      summary: Ottieni documento e parsed JSON
      tags: [Documents]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Document'
  /stock_movements:
    post:
      summary: Crea movimento di magazzino
      tags: [Inventory]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/StockMovement'
      responses:
        '201':
          description: Created
  /tickets:
    post:
      summary: Crea ticket manutentivo
      tags: [Maintenance]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [venue_id, area, description]
              properties:
                venue_id: { type: string }
                area: { type: string }
                description: { type: string }
                priority: { type: string }
                reporter_id: { type: string }
      responses:
        '201':
          description: Created
  /customers:
    post:
      summary: Crea / unisce customer identity
      tags: [CRM]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string }
                identities:
                  type: array
                  items:
                    type: object
                    properties:
                      provider: { type: string }
                      identifier: { type: string }
      responses:
        '201':
          description: Created
  /reservations:
    post:
      summary: Crea prenotazione
      tags: [Reservations]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [venue_id, start_time, people_count]
              properties:
                venue_id: { type: string }
                customer_id: { type: string }
                table_id: { type: string }
                start_time: { type: string, format: date-time }
                end_time: { type: string, format: date-time }
                people_count: { type: integer }
      responses:
        '201':
          description: Created
  /inventory/products:
    get:
      summary: Lista prodotti inventario
      tags: [Inventory]
      parameters:
        - name: venue_id
          in: query
          required: true
          schema: { type: string }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Product' }
```

> Nota: questa spec è volutamente base — il team dovrà arricchirla con validazioni, codici di errore standardizzati (RFC 7807 problem+json), limiti rate, paginazione e parametri di ricerca per ogni endpoint.

---

## 18. SQL MIGRATIONS (Postgres) - SCHEMA INIZIALE

Di seguito una serie di migration SQL per creare le tabelle chiave. Salvare come `migrations/0001_init.sql`.

```sql
-- Abilitare estensione per UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Venues
CREATE TABLE venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id) ON DELETE SET NULL,
  email varchar(255) UNIQUE NOT NULL,
  password_hash varchar(255) NOT NULL,
  name varchar(255),
  role varchar(50),
  permissions jsonb DEFAULT '{}'::jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Products
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  sku varchar(100),
  name varchar(255) NOT NULL,
  unit varchar(50),
  cost numeric(12,4),
  price numeric(12,4),
  attributes jsonb DEFAULT '{}'::jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_products_venue ON products(venue_id);

-- Lots
CREATE TABLE lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  lot_code varchar(200),
  supplier_id uuid,
  received_at timestamptz,
  expiry_date date,
  qty_init numeric(12,4) DEFAULT 0,
  qty_current numeric(12,4) DEFAULT 0,
  unit varchar(50),
  storage_location varchar(200),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_lots_product ON lots(product_id);

-- Locations (magazzino fisico)
CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  name varchar(200),
  capacity numeric(12,2),
  temp_controlled boolean DEFAULT false
);

-- Stock movements
CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  product_id uuid REFERENCES products(id),
  lot_id uuid REFERENCES lots(id),
  movement_type varchar(50), -- in,out,adjustment,transfer,waste
  quantity numeric(12,4),
  reference_type varchar(100),
  reference_id uuid,
  user_id uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_stock_prod ON stock_movements(product_id);

-- Tables (sala)
CREATE TABLE tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  name varchar(100),
  seats integer,
  position_json jsonb,
  status varchar(50) DEFAULT 'free'
);

-- Reservations
CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  customer_id uuid,
  table_id uuid REFERENCES tables(id),
  start_time timestamptz,
  end_time timestamptz,
  people_count integer,
  status varchar(50) DEFAULT 'pending',
  source varchar(100),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Orders
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  table_id uuid REFERENCES tables(id),
  user_id uuid REFERENCES users(id),
  status varchar(50) DEFAULT 'draft',
  total numeric(12,4) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  qty integer,
  price numeric(12,4),
  lot_id uuid REFERENCES lots(id),
  notes text
);

-- Documents
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  uploader_id uuid REFERENCES users(id),
  type varchar(50), -- ddt, invoice, other
  storage_path varchar(1024),
  parsed_json jsonb,
  status varchar(50) DEFAULT 'processing',
  created_at timestamptz DEFAULT now()
);

-- Temperature logs
CREATE TABLE temperature_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  area varchar(200),
  temp numeric(6,2),
  recorded_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES users(id),
  notes text
);

-- Tickets manutentivi
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id),
  area varchar(200),
  description text,
  priority varchar(50) DEFAULT 'medium',
  status varchar(50) DEFAULT 'open',
  reporter_id uuid REFERENCES users(id),
  assignee_id uuid REFERENCES users(id),
  cost numeric(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Customers & identities
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255),
  dob date,
  attrs jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE customer_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  provider varchar(100),
  identifier varchar(500),
  verified boolean DEFAULT false,
  source varchar(100),
  created_at timestamptz DEFAULT now(),
  UNIQUE(provider, identifier)
);

CREATE TABLE consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  purpose varchar(100),
  channel varchar(50),
  granted boolean,
  version text,
  granted_at timestamptz,
  revoked_at timestamptz
);

-- Indexes and constraints suggestions
CREATE INDEX idx_orders_table ON orders(table_id);
CREATE INDEX idx_reservations_venue_time ON reservations(venue_id, start_time);
CREATE INDEX idx_docs_status ON documents(status);
```

> Nota: le migrazioni fornite sono un punto di partenza. Il team di sviluppo dovrà trasformarle in migration files (Flyway/Knex/TypeORM/Prisma) con rollback, constraints aggiuntive, check constraints, e procedure per data migration dove necessario.

---

## 19. Prossimi artefatti che ho già predisposto (e posso generare subito)
1. OpenAPI YAML (file pronto da scaricare).  
2. SQL migrations (file .sql pronto da scaricare).  
3. ER diagram (SVG/PDF).  
4. Seed data SQL per ambiente di test (prodotti, tavoli, utente admin).  
5. Pacchetto zip con componenti React separati (App, StaffMap, POS, KDS, Inventory, OCRReview, EmployeePortal, TicketMaintenance). 
