# Fase 3 / Sottofase 1: API per la Gestione degli Ordini e Scarico FEFO

## 1. Obiettivi

Questa sottofase si concentra sulla costruzione del motore transazionale del sistema: la creazione e gestione degli ordini. Gli obiettivi sono:
- Implementare i moduli `Orders` e `OrderItems` per rappresentare le comande.
- Collegare la creazione di un ordine allo scarico automatico del magazzino.
- Implementare la logica FEFO (First-Expired, First-Out) per lo scarico, garantendo la compliance HACCP.
- Introdurre la comunicazione in tempo reale tramite WebSockets per notificare la cucina/bar (KDS) all'arrivo di una nuova comanda.

## 2. Funzionalità da Implementare

### 2.1. Modulo `Orders`
- **Descrizione:** Verrà creato un modulo `OrdersModule` per la gestione completa delle comande. Questo includerà le entità per `Order` e `OrderItem`, i servizi e i controller.
- **Tecnologie:** NestJS modules, TypeORM entities.

### 2.2. Logica di Scarico FEFO
- **Descrizione:** Quando un ordine viene confermato o marcato come "servito", il `OrdersService` dovrà orchestrare lo scarico del magazzino. Per ogni `OrderItem`, il servizio dovrà:
    1. Identificare il prodotto da scaricare.
    2. Trovare il lotto di quel prodotto con la data di scadenza più vicina (`expiryDate`).
    3. Invocare il `StockService` (creato nella Fase 2) per creare un movimento di tipo `OUT` da quel lotto specifico.
    Questa logica deve essere robusta e gestire i casi in cui un prodotto potrebbe non avere lotti disponibili.
- **Tecnologie:** TypeORM, Transazioni di Database.

### 2.3. Gateway per Real-time (WebSockets)
- **Descrizione:** Verrà creato un `OrdersGateway` utilizzando i WebSockets di NestJS. Quando un nuovo ordine viene creato con successo, questo gateway emetterà un evento (es. `new_order`). Il KDS (Kitchen Display System) si iscriverà a questo evento per ricevere le comande in tempo reale.
- **Tecnologie:** `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`.

## 3. Specifiche Tecniche

### 3.1. Struttura delle Cartelle Aggiuntiva (Backend)
```
backend/
└── src/
    └── orders/
        ├── dto/
        │   ├── create-order.dto.ts
        │   └── update-order.dto.ts
        ├── entities/
        │   ├── order.entity.ts
        │   └── order-item.entity.ts
        ├── orders.controller.ts
        ├── orders.gateway.ts     # Gestore WebSocket
        ├── orders.module.ts
        └── orders.service.ts
```

### 3.2. Modello Dati (Entities)
- **`Order` Entity (`order.entity.ts`):**
  - `id`: `uuid`
  - `venueId`: `uuid`
  - `tableId`: `uuid` (Foreign Key a `tables`)
  - `userId`: `uuid` (Cameriere che ha preso l'ordine)
  - `status`: `string` (Enum: `draft`, `confirmed`, `preparing`, `ready`, `completed`, `cancelled`)
  - `total`: `number`
  - Relazione: `OneToMany` con `OrderItem`

- **`OrderItem` Entity (`order-item.entity.ts`):**
  - `id`: `uuid`
  - `orderId`: `uuid` (Foreign Key a `orders`)
  - `productId`: `uuid` (Foreign Key a `products`)
  - `qty`: `number`
  - `price`: `number` (Prezzo al momento dell'ordine)
  - `lotId`: `uuid` (Foreign Key a `lots`, popolato al momento dello scarico)
  - `notes`: `text` (Note per la cucina/bar)

### 3.3. API Endpoints
- **Orders Controller (`/orders`):**
  - `POST /`: Crea un nuovo ordine (in stato `draft` o `confirmed`).
  - `GET /`: Ottiene la lista degli ordini, con filtri per stato, tavolo, ecc.
  - `GET /:id`: Ottiene i dettagli di un singolo ordine.
  - `PATCH /:id`: Aggiorna un ordine, tipicamente per cambiarne lo stato.

### 3.4. WebSocket Events
- **`OrdersGateway`:**
  - Emette l'evento `new_order` quando un ordine viene creato e confermato. Il payload dell'evento conterrà i dati completi dell'ordine.
  - Ascolta eventi dal KDS (es. `order_status_update`) per aggiornare lo stato.

## 4. Criteri di Accettazione

- La creazione di un ordine tramite `POST /orders` funziona e salva l'ordine con i suoi item.
- L'aggiornamento dello stato di un ordine a `completed` (o simile) innesca correttamente la logica di scarico FEFO.
- Il sistema seleziona il lotto corretto (quello con la data di scadenza più prossima) per lo scarico.
- Viene creato un record `StockMovement` per ogni `OrderItem` al momento dello scarico.
- Alla creazione di un ordine confermato, un evento `new_order` viene trasmesso correttamente tramite WebSocket.
- Le API sono protette e accessibili solo da utenti autenticati (es. camerieri, manager).
- Devono essere presenti test di integrazione per il flusso completo: creazione ordine -> cambio stato -> verifica creazione movimento di magazzino.