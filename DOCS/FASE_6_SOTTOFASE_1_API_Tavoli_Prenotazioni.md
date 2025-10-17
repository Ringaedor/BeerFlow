# Fase 6 / Sottofase 1: API per Gestione Tavoli e Prenotazioni

## 1. Obiettivi

L'obiettivo di questa sottofase è costruire il backend per la gestione avanzata della sala, inclusa la configurazione dei tavoli e la creazione di prenotazioni.
- Implementare un modulo `Tables` per gestire l'anagrafica dei tavoli, inclusa la loro posizione in una mappa visuale.
- Implementare un modulo `Reservations` per creare e gestire le prenotazioni dei clienti.
- Aggiornare lo stato dei tavoli in tempo reale quando vengono occupati, liberati o prenotati.

## 2. Funzionalità da Implementare

### 2.1. Modulo `Tables`
- **Descrizione:** Verrà creato un modulo `TablesModule` per le operazioni CRUD sui tavoli. Un tavolo sarà definito da un nome, un numero di posti e una posizione (coordinate x, y) per il rendering su una mappa visuale.
- **Tecnologie:** NestJS modules, TypeORM entities.

### 2.2. Modulo `Reservations`
- **Descrizione:** Verrà creato un modulo `ReservationsModule` per gestire le prenotazioni. Una prenotazione collegherà un cliente (dal modulo CRM), un tavolo, una data/ora di inizio e una durata.
- **Tecnologie:** NestJS modules, TypeORM entities.

### 2.3. Aggiornamento Stato Tavoli
- **Descrizione:** Lo stato di un tavolo (`status` nell'entità `Table`) verrà aggiornato automaticamente da diverse azioni nel sistema:
    - `POST /orders`: Un nuovo ordine per un tavolo lo imposta su `occupied`.
    - Chiusura conto (futuro): Imposta lo stato su `cleaning` o `free`.
    - `POST /reservations`: Imposta lo stato su `booked` per la fascia oraria della prenotazione.
- **Tecnologie:** NestJS services, WebSockets.

### 2.4. Notifiche in Tempo Reale
- **Descrizione:** Qualsiasi cambiamento di stato di un tavolo (es. da `free` a `occupied`) verrà notificato ai client frontend (come la PWA dei camerieri) tramite un evento WebSocket (`table_status_update`).
- **Tecnologie:** `@nestjs/websockets`.

## 3. Specifiche Tecniche

### 3.1. Struttura delle Cartelle Aggiuntiva (Backend)
```
backend/
└── src/
    ├── tables/
    │   ├── entities/
    │   │   └── table.entity.ts
    │   ├── tables.controller.ts
    │   ├── tables.module.ts
    │   └── tables.service.ts
    └── reservations/
        ├── entities/
        │   └── reservation.entity.ts
        ├── reservations.controller.ts
        ├── reservations.module.ts
        └── reservations.service.ts
```

### 3.2. Modello Dati (Entities)
- **`Table` Entity (`table.entity.ts`):**
  - `id`: `uuid`
  - `venueId`: `uuid`
  - `name`: `string`
  - `seats`: `number`
  - `positionJson`: `jsonb` (es. `{ "x": 100, "y": 250 }`)
  - `status`: `string` (Enum: `free`, `occupied`, `booked`, `cleaning`)

- **`Reservation` Entity (`reservation.entity.ts`):**
  - `id`: `uuid`
  - `venueId`: `uuid`
  - `customerId`: `uuid`
  - `tableId`: `uuid`
  - `startTime`: `timestamptz`
  - `endTime`: `timestamptz`
  - `peopleCount`: `number`
  - `status`: `string` (Enum: `pending`, `confirmed`, `cancelled`, `no-show`)
  - `notes`: `text`

### 3.3. API Endpoints
- **Tables Controller (`/tables`):**
  - `GET /`: Restituisce tutti i tavoli di una venue con il loro stato attuale.
  - `POST /`: (Manager) Crea un nuovo tavolo.
  - `PATCH /:id`: (Manager) Aggiorna un tavolo (es. per modificarne la posizione).
  - `POST /layout`: (Manager) Salva la posizione di tutti i tavoli in un'unica chiamata (drag & drop).

- **Reservations Controller (`/reservations`):**
  - `POST /`: Crea una nuova prenotazione.
  - `GET /`: Restituisce le prenotazioni, filtrabili per data.
  - `PATCH /:id`: Aggiorna lo stato di una prenotazione.

### 3.4. WebSocket Events
- Emette l'evento `table_status_update` con payload `{ tableId, newStatus }` ogni volta che lo stato di un tavolo cambia.

## 4. Criteri di Accettazione

- Un manager può creare, modificare e posizionare i tavoli per la sua venue.
- Un utente autorizzato può creare una nuova prenotazione per un cliente.
- Il sistema impedisce la doppia prenotazione per lo stesso tavolo nella stessa fascia oraria.
- La creazione di un ordine imposta correttamente lo stato del tavolo su `occupied`.
- Qualsiasi modifica allo stato di un tavolo viene notificata in tempo reale ai client connessi.
- Le API sono protette e soggette a controllo dei ruoli.