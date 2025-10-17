# Fase 2 / Sottofase 2: API per Movimenti di Magazzino

## 1. Obiettivi

L'obiettivo di questa sottofase è implementare la logica per tracciare ogni singolo movimento di un prodotto o di un lotto all'interno del magazzino. Questo sistema è fondamentale per avere una visione accurata e in tempo reale delle giacenze.
- Creare il modulo `StockMovements` che registrerà ogni entrata, uscita, rettifica, trasferimento o spreco.
- Aggiornare automaticamente la `qtyCurrent` dei lotti in base ai movimenti registrati.

## 2. Funzionalità da Implementare

### 2.1. Modulo `StockMovements`
- **Descrizione:** Verrà creato un modulo `StockMovementsModule`. L'entità `StockMovement` è un record immutabile che descrive un'operazione di magazzino. Non sarà possibile modificare o eliminare un movimento, ma solo crearne di nuovi (eventualmente di storno).
- **Tecnologie:** NestJS modules, TypeORM entities.

### 2.2. Logica di Aggiornamento delle Giacenze
- **Descrizione:** Il servizio `StockMovementsService` conterrà la logica di business principale. Quando viene creato un nuovo movimento, il servizio dovrà:
    1. Validare l'operazione (es. non si può scaricare più quantità di quella disponibile in un lotto).
    2. Creare il record `StockMovement`.
    3. Aggiornare il campo `qtyCurrent` nell'entità `Lot` corrispondente.
    Queste operazioni dovranno essere eseguite in una transazione di database per garantire la consistenza dei dati.
- **Tecnologie:** TypeORM Transactions.

### 2.3. Tipi di Movimento
- **Descrizione:** Il sistema supporterà diversi tipi di movimento, identificati da un campo `type`:
    - `IN`: Carico merce (es. da DDT/fattura fornitore).
    - `OUT`: Scarico per vendita (es. da comanda).
    - `ADJUSTMENT`: Rettifica di inventario (es. dopo una conta fisica).
    - `TRANSFER`: Trasferimento tra magazzini/locazioni (non per MVP).
    - `WASTE`: Registrazione di uno spreco/prodotto scaduto.
- **Tecnologie:** Enum TypeScript.

### 2.4. API Endpoint per Movimenti
- **Descrizione:** Verrà esposto un endpoint protetto per la creazione di movimenti di magazzino. La lettura dei movimenti avverrà principalmente tramite query che aggregano i dati per prodotto/lotto, piuttosto che esponendo tutti i singoli movimenti.
- **Tecnologie:** NestJS controllers, NestJS Guards.

## 3. Specifiche Tecniche

### 3.1. Struttura delle Cartelle Aggiuntiva (Backend)
```
backend/
└── src/
    └── stock/
        ├── dto/
        │   └── create-stock-movement.dto.ts
        ├── entities/
        │   └── stock-movement.entity.ts
        ├── stock.controller.ts
        ├── stock.module.ts
        └── stock.service.ts
```

### 3.2. Modello Dati (Entities)
- **`StockMovement` Entity (`stock-movement.entity.ts`):**
  - `id`: `uuid` (Primary Key)
  - `venueId`: `uuid` (Foreign Key a `venues`)
  - `productId`: `uuid` (Foreign Key a `products`)
  - `lotId`: `uuid` (Foreign Key a `lots`, opzionale per alcuni movimenti)
  - `movementType`: `string` (Enum: 'IN', 'OUT', 'ADJUSTMENT', 'WASTE')
  - `quantity`: `number` (Positiva per 'IN', negativa per 'OUT', 'WASTE')
  - `referenceType`: `string` (A cosa si riferisce il movimento, es. 'order', 'document', 'inventory_count')
  - `referenceId`: `uuid` (ID del riferimento, es. ID della comanda o del documento)
  - `userId`: `uuid` (Utente che ha generato il movimento)
  - `notes`: `text` (Note opzionali)
  - `createdAt`: `timestamptz`

### 3.3. Logica del Servizio (`StockService`)
- **`createMovement(createDto)`:**
    1. Inizia una transazione.
    2. Trova il lotto (`lotId`) e bloccalo per l'aggiornamento (`SELECT ... FOR UPDATE`).
    3. Controlla se la `quantity` nel DTO è compatibile con la `qtyCurrent` del lotto (es. per un movimento `OUT`).
    4. Calcola la nuova `qtyCurrent` del lotto.
    5. Aggiorna il lotto con la nuova quantità.
    6. Crea e salva il nuovo record `StockMovement`.
    7. Esegue il commit della transazione. Se qualcosa fallisce, esegue il rollback.

### 3.4. API Endpoints
- **Stock Controller (`/stock`):**
  - `POST /movements`: Crea un nuovo movimento di magazzino. Questo è l'endpoint principale.
  - `GET /products/:productId/inventory`: Restituisce la giacenza totale di un prodotto, calcolata come somma delle `qtyCurrent` di tutti i suoi lotti attivi.
  - `GET /lots/:lotId/history`: Restituisce lo storico dei movimenti per un lotto specifico.

## 4. Criteri di Accettazione

- La creazione di un movimento `IN` aumenta correttamente la `qtyCurrent` del lotto specificato.
- La creazione di un movimento `OUT` o `WASTE` diminuisce correttamente la `qtyCurrent` del lotto.
- Il sistema impedisce di creare un movimento `OUT` se la quantità richiesta è superiore alla `qtyCurrent` del lotto, restituendo un errore `400 Bad Request`.
- Tutte le operazioni di creazione di un movimento e aggiornamento del lotto sono atomiche (o vanno a buon fine entrambe, o falliscono entrambe).
- L'endpoint di `inventory` per un prodotto restituisce la somma corretta delle quantità di tutti i suoi lotti.
- L'API è protetta e accessibile solo da utenti con ruoli autorizzati.
- Devono essere presenti test di integrazione che simulano carichi e scarichi concorrenti per verificare la robustezza del sistema di transazioni.