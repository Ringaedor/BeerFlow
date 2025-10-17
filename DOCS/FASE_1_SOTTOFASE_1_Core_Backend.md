# Fase 1 / Sottofase 1: Core Backend e Multi-Venue

## 1. Obiettivi

L'obiettivo di questa sottofase è costruire le fondamenta del backend di BeerFlow. Questo include:
- Creare un nuovo progetto NestJS, che fornirà un'architettura robusta e scalabile.
- Configurare la connessione al database PostgreSQL.
- Implementare il modulo `Venues`, che è il pilastro dell'architettura multi-tenant del sistema. Ogni dato nell'applicazione sarà legato a una "venue" (locale).

## 2. Funzionalità da Implementare

### 2.1. Scaffolding del Progetto Backend
- **Descrizione:** Verrà creato un nuovo progetto NestJS all'interno della cartella `backend`. Questo comando genera la struttura base del progetto, con i moduli, i controller e i servizi iniziali.
- **Tecnologie:** NestJS CLI.

### 2.2. Configurazione dell'Ambiente
- **Descrizione:** Verrà implementato un sistema di gestione delle variabili d'ambiente utilizzando il modulo `@nestjs/config`. Questo permetterà di gestire in modo sicuro le configurazioni sensibili (es. credenziali del database, chiavi segrete) senza salvarle direttamente nel codice. Verrà creato un file `.env.example` come modello.
- **Tecnologie:** `@nestjs/config`, `dotenv`.

### 2.3. Modulo di Connessione al Database
- **Descrizione:** Verrà creato un modulo centralizzato (`DatabaseModule`) per gestire la connessione con il database PostgreSQL. Si utilizzerà un ORM come TypeORM (o Prisma, come suggerito nel README) per mappare le tabelle del database a classi TypeScript (Entities), semplificando le operazioni di lettura e scrittura.
- **Tecnologie:** `@nestjs/typeorm`, `typeorm`, `pg`.

### 2.4. Modulo `Venues`
- **Descrizione:** Questo è il primo modulo funzionale. Rappresenta una singola entità "Venue" (es. un pub, una birreria). Verrà creata l'entità TypeORM corrispondente alla tabella `venues` del database e un servizio per gestire le operazioni di base (CRUD - Create, Read, Update, Delete).
- **Tecnologie:** NestJS modules, TypeORM entities.

## 3. Specifiche Tecniche

### 3.1. Struttura delle Cartelle (Backend)
```
backend/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── config/
│   │   └── typeorm.config.ts  # Configurazione di TypeORM
│   ├── database/
│   │   └── database.module.ts # Modulo per la connessione al DB
│   └── venues/
│       ├── dto/
│       │   ├── create-venue.dto.ts
│       │   └── update-venue.dto.ts
│       ├── entities/
│       │   └── venue.entity.ts # Definizione della tabella venues
│       ├── venues.controller.ts # (Verrà implementato nella prossima sottofase)
│       ├── venues.module.ts
│       └── venues.service.ts
├── .env.example
└── package.json
```

### 3.2. Modello Dati (Entities)
- **`Venue` Entity (`venue.entity.ts`):**
  - `id`: `uuid` (Primary Key)
  - `name`: `string`
  - `settings`: `jsonb` (impostazioni specifiche del locale, es. valuta, fuso orario)
  - `createdAt`: `timestamptz`
  - `updatedAt`: `timestamptz`

### 3.3. Servizi
- **`VenuesService`:**
  - `create(createVenueDto)`: Crea una nuova venue.
  - `findAll()`: Restituisce tutte le venues.
  - `findOne(id)`: Restituisce una venue specifica.
  - `update(id, updateVenueDto)`: Aggiorna una venue.
  - `remove(id)`: Elimina una venue.

## 4. Criteri di Accettazione

- Il backend deve avviarsi senza errori con il comando `npm run start:dev`.
- L'applicazione deve stabilire con successo una connessione al database PostgreSQL all'avvio.
- Le operazioni CRUD per le venues, gestite tramite il `VenuesService`, devono funzionare correttamente (verificabile tramite test unitari e di integrazione).
- Devono essere presenti test unitari per il `VenuesService` che coprano i casi d'uso principali.