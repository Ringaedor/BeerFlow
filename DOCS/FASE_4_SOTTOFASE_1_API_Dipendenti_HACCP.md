# Fase 4 / Sottofase 1: API per Portale Dipendente e HACCP Base

## 1. Obiettivi

L'obiettivo di questa sottofase è implementare le funzionalità backend per la gestione del personale e per la registrazione dei dati di base per l'HACCP.
- Creare un sistema di timbratura (IN/OUT) per i dipendenti.
- Creare un sistema per la registrazione dei log di temperatura, un requisito comune per l'HACCP.
- Esporre API sicure per queste funzionalità.

## 2. Funzionalità da Implementare

### 2.1. Modulo `Staff`
- **Descrizione:** Verrà creato un modulo `StaffModule` per gestire le funzionalità relative ai dipendenti. La prima funzionalità sarà la timbratura. Verrà creata un'entità `TimeLog` per registrare ogni evento di entrata e uscita.
- **Tecnologie:** NestJS modules, TypeORM entities.

### 2.2. Modulo `HACCP`
- **Descrizione:** Verrà creato un modulo `HaccpModule` per centralizzare le funzionalità relative alla compliance. In questa fase, si implementerà la gestione dei log di temperatura. Verrà creata un'entità `TemperatureLog` per memorizzare le misurazioni.
- **Tecnologie:** NestJS modules, TypeORM entities.

### 2.3. Logica di Timbratura
- **Descrizione:** Il servizio `StaffService` gestirà la creazione dei log di timbratura. Ogni log sarà un record immutabile contenente l'ID dell'utente, il timestamp e il tipo di evento (`IN` o `OUT`).
- **Tecnologie:** NestJS services.

### 2.4. API Endpoints
- **Descrizione:** Verranno esposti endpoint protetti per permettere ai dipendenti di timbrare e al personale autorizzato di registrare e visualizzare i dati HACCP.
- **Tecnologie:** NestJS controllers, NestJS Guards.

## 3. Specifiche Tecniche

### 3.1. Struttura delle Cartelle Aggiuntiva (Backend)
```
backend/
└── src/
    ├── staff/
    │   ├── dto/
    │   │   └── create-timelog.dto.ts
    │   ├── entities/
    │   │   └── timelog.entity.ts
    │   ├── staff.controller.ts
    │   ├── staff.module.ts
    │   └── staff.service.ts
    └── haccp/
        ├── dto/
        │   └── create-temperature-log.dto.ts
        ├── entities/
        │   └── temperature-log.entity.ts
        ├── haccp.controller.ts
        ├── haccp.module.ts
        └── haccp.service.ts
```

### 3.2. Modello Dati (Entities)
- **`TimeLog` Entity (`timelog.entity.ts`):**
  - `id`: `uuid`
  - `userId`: `uuid` (Foreign Key a `users`)
  - `venueId`: `uuid` (Foreign Key a `venues`)
  - `type`: `string` (Enum: 'IN', 'OUT')
  - `timestamp`: `timestamptz`
  - `metadata`: `jsonb` (Per dati extra come geolocalizzazione, se abilitata)

- **`TemperatureLog` Entity (`temperature-log.entity.ts`):**
  - `id`: `uuid`
  - `userId`: `uuid` (Utente che ha registrato la temperatura)
  - `venueId`: `uuid`
  - `area`: `string` (es. "Frigo 1", "Cella frigo carni")
  - `temperature`: `number`
  - `notes`: `text` (Note opzionali)
  - `recordedAt`: `timestamptz`

### 3.3. API Endpoints
- **Staff Controller (`/staff`):**
  - `POST /clock`: Endpoint unico per la timbratura. Il DTO conterrà il tipo (`IN` o `OUT`). L'utente viene identificato dal JWT.
  - `GET /timelogs`: (Manager/Admin) Restituisce lo storico delle timbrature, filtrabile per utente e periodo.

- **HACCP Controller (`/haccp`):**
  - `POST /temperature-logs`: Crea un nuovo log di temperatura.
  - `GET /temperature-logs`: Restituisce i log di temperatura, filtrabili per area e periodo.

## 4. Criteri di Accettazione

- Un dipendente autenticato può timbrare l'entrata e l'uscita tramite l'endpoint `POST /staff/clock`.
- Ogni timbratura viene salvata correttamente nel database come un record `TimeLog` immutabile.
- Un utente autorizzato (es. 'manager') può visualizzare lo storico delle timbrature.
- Un utente autorizzato può registrare una nuova misurazione di temperatura tramite l'endpoint `POST /haccp/temperature-logs`.
- È possibile recuperare e visualizzare lo storico dei log di temperatura.
- Le API sono protette e l'accesso è limitato ai ruoli appropriati.
- Devono essere presenti test di integrazione per la creazione e la lettura dei log di timbratura e temperatura.