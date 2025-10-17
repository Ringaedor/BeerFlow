# Fase 7 / Sottofase 1: API per CRM e Manutenzione

## 1. Obiettivi

L'obiettivo di questa sottofase è implementare le fondamenta per due moduli cruciali per la gestione del cliente e delle infrastrutture: il CRM e il sistema di ticketing per la manutenzione.
- Creare i moduli per gestire le anagrafiche dei `Customers` e dei loro `Consents` (per la privacy/GDPR).
- Creare il modulo `Tickets` per tracciare le richieste di manutenzione.

## 2. Funzionalità da Implementare

### 2.1. Modulo `CRM`
- **Descrizione:** Verrà creato un `CrmModule`. La sua responsabilità principale è gestire l'anagrafica dei clienti (`Customer`) e, cosa molto importante, il registro dei loro consensi (`Consent`). Ogni cliente può avere più identità (es. email, telefono), che verranno gestite in una tabella separata `CustomerIdentity`.
- **Tecnologie:** NestJS modules, TypeORM entities.

### 2.2. Modulo `Maintenance`
- **Descrizione:** Verrà creato un `MaintenanceModule` per la gestione dei ticket. Un ticket rappresenta una richiesta di intervento (es. "Frigo rotto", "Luce sala non funzionante") e avrà uno stato, una priorità e un assegnatario.
- **Tecnologie:** NestJS modules, TypeORM entities.

## 3. Specifiche Tecniche

### 3.1. Struttura delle Cartelle Aggiuntiva (Backend)
```
backend/
└── src/
    ├── crm/
    │   ├── entities/
    │   │   ├── customer.entity.ts
    │   │   ├── customer-identity.entity.ts
    │   │   └── consent.entity.ts
    │   ├── crm.controller.ts
    │   ├── crm.module.ts
    │   └── crm.service.ts
    └── maintenance/
        ├── entities/
        │   └── ticket.entity.ts
        ├── maintenance.controller.ts
        ├── maintenance.module.ts
        └── maintenance.service.ts
```

### 3.2. Modello Dati (Entities)
- **`Customer` Entity (`customer.entity.ts`):**
  - `id`: `uuid`
  - `name`: `string`
  - `dob`: `date` (Data di nascita)
  - `attrs`: `jsonb` (Attributi extra)
- **`CustomerIdentity` Entity (`customer-identity.entity.ts`):**
  - `id`: `uuid`
  - `customerId`: `uuid`
  - `provider`: `string` (es. 'email', 'phone')
  - `identifier`: `string` (l'email o il numero di telefono)
- **`Consent` Entity (`consent.entity.ts`):**
  - `id`: `uuid`
  - `customerId`: `uuid`
  - `purpose`: `string` (es. 'marketing', 'profiling')
  - `channel`: `string` (es. 'email', 'sms')
  - `granted`: `boolean`
- **`Ticket` Entity (`ticket.entity.ts`):**
  - `id`: `uuid`
  - `venueId`: `uuid`
  - `reporterId`: `uuid` (Chi ha aperto il ticket)
  - `assigneeId`: `uuid` (A chi è assegnato)
  - `area`: `string` (es. "Cucina", "Sala")
  - `description`: `text`
  - `priority`: `string` (Enum: `low`, `medium`, `high`)
  - `status`: `string` (Enum: `open`, `in_progress`, `resolved`, `closed`)

### 3.3. API Endpoints
- **CRM Controller (`/customers`):**
  - `POST /`: Crea un nuovo cliente (con la sua prima identità).
  - `GET /`: Restituisce i clienti con funzionalità di ricerca.
  - `GET /:id`: Restituisce il profilo completo di un cliente.
  - `POST /:id/consents`: Aggiunge o aggiorna un consenso per un cliente.

- **Maintenance Controller (`/tickets`):**
  - `POST /`: Crea un nuovo ticket di manutenzione.
  - `GET /`: Restituisce i ticket, filtrabili per stato o assegnatario.
  - `PATCH /:id`: Aggiorna un ticket (es. per cambiarne lo stato o assegnarlo).

## 4. Criteri di Accettazione

- È possibile creare un nuovo cliente con almeno un'identità.
- È possibile registrare e aggiornare i consensi privacy per un cliente.
- Un utente può creare un nuovo ticket di manutenzione.
- Un manager può assegnare un ticket a un tecnico.
- Un tecnico può aggiornare lo stato di un ticket a lui assegnato.
- Le API sono protette e l'accesso è gestito tramite ruoli.