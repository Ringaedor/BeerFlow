# Fase 2 / Sottofase 1: API per Anagrafica Prodotti e Lotti

## 1. Obiettivi

L'obiettivo di questa sottofase è estendere il backend per gestire le entità fondamentali del magazzino: i `Prodotti` e i `Lotti`. Questo è un passaggio cruciale per la tracciabilità e la gestione dell'inventario.
- Implementare il modulo `Products` per gestire l'anagrafica di tutto ciò che viene venduto o utilizzato.
- Implementare il modulo `Lots` per tracciare i lotti di acquisto di ogni prodotto, fondamentale per la compliance HACCP e la gestione FEFO (First-Expired, First-Out).

## 2. Funzionalità da Implementare

### 2.1. Modulo `Products`
- **Descrizione:** Verrà creato un modulo `ProductsModule` che gestirà tutte le operazioni CRUD (Create, Read, Update, Delete) per i prodotti. Ogni prodotto sarà associato a una `venue`.
- **Tecnologie:** NestJS modules, TypeORM entities.

### 2.2. Modulo `Lots`
- **Descrizione:** Verrà creato un modulo `LotsModule` per la gestione dei lotti. Un lotto rappresenta una specifica partita di un prodotto, caratterizzata da un codice lotto, una quantità iniziale e una data di scadenza. I lotti sono sempre collegati a un prodotto.
- **Tecnologie:** NestJS modules, TypeORM entities.

### 2.3. API Endpoints per Prodotti e Lotti
- **Descrizione:** Verranno esposti degli endpoint API protetti per permettere la gestione di prodotti e lotti. L'accesso a queste API sarà limitato a ruoli specifici (es. 'manager', 'magazziniere').
- **Tecnologie:** NestJS controllers, NestJS Guards (JWT e Roles).

## 3. Specifiche Tecniche

### 3.1. Struttura delle Cartelle Aggiuntiva (Backend)
```
backend/
└── src/
    ├── products/
    │   ├── dto/
    │   │   ├── create-product.dto.ts
    │   │   └── update-product.dto.ts
    │   ├── entities/
    │   │   └── product.entity.ts
    │   ├── products.controller.ts
    │   ├── products.module.ts
    │   └── products.service.ts
    └── lots/
        ├── dto/
        │   ├── create-lot.dto.ts
        │   └── update-lot.dto.ts
        ├── entities/
        │   └── lot.entity.ts
        ├── lots.controller.ts
        ├── lots.module.ts
        └── lots.service.ts
```

### 3.2. Modello Dati (Entities)
- **`Product` Entity (`product.entity.ts`):**
  - `id`: `uuid` (Primary Key)
  - `venueId`: `uuid` (Foreign Key a `venues`)
  - `sku`: `string` (Stock Keeping Unit, opzionale)
  - `name`: `string`
  - `unit`: `string` (es. 'kg', 'lt', 'pz')
  - `cost`: `number` (Costo di acquisto)
  - `price`: `number` (Prezzo di vendita)
  - `attributes`: `jsonb` (es. { "brand": "...", "supplier": "..." })
  - `active`: `boolean`
  - Relazione: `OneToMany` con `Lot`

- **`Lot` Entity (`lot.entity.ts`):**
  - `id`: `uuid` (Primary Key)
  - `productId`: `uuid` (Foreign Key a `products`)
  - `lotCode`: `string` (Codice del lotto, es. "L20240915")
  - `expiryDate`: `date` (Data di scadenza)
  - `qtyInit`: `number` (Quantità iniziale del lotto)
  - `qtyCurrent`: `number` (Quantità attuale del lotto)
  - `storageLocation`: `string` (Ubicazione fisica in magazzino, es. "Scaffale A-3")
  - Relazione: `ManyToOne` con `Product`

### 3.3. API Endpoints
Le API saranno protette e richiederanno un ruolo specifico (es. `Manager`).

- **Products Controller (`/products`):**
  - `POST /`: Crea un nuovo prodotto per la venue dell'utente.
  - `GET /`: Restituisce tutti i prodotti della venue.
  - `GET /:id`: Restituisce un prodotto specifico.
  - `PATCH /:id`: Aggiorna un prodotto.
  - `DELETE /:id`: Disattiva (soft delete) un prodotto.

- **Lots Controller (`/lots`):**
  - `POST /`: Crea un nuovo lotto per un prodotto.
  - `GET /`: Restituisce tutti i lotti (filtrabili per prodotto).
  - `GET /:id`: Restituisce un lotto specifico.
  - `PATCH /:id`: Aggiorna un lotto (es. per correggere una data di scadenza).
  - `DELETE /:id`: Elimina un lotto (solo se non utilizzato).

## 4. Criteri di Accettazione

- Un utente con il ruolo corretto può creare, leggere, aggiornare e disattivare un prodotto tramite API.
- Ogni operazione sui prodotti è correttamente associata alla `venue` dell'utente autenticato.
- Un utente con il ruolo corretto può creare un nuovo lotto associato a un prodotto esistente.
- Il campo `qtyCurrent` di un nuovo lotto è inizializzato con lo stesso valore di `qtyInit`.
- È possibile recuperare tutti i lotti associati a un singolo prodotto.
- Un utente con un ruolo non autorizzato che tenta di accedere a queste API riceve un errore `403 Forbidden`.
- Devono essere presenti test di integrazione per le operazioni CRUD di base su Prodotti e Lotti.