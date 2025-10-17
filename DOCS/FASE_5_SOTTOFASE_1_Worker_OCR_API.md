# Fase 5 / Sottofase 1: Architettura Asincrona e Worker OCR

## 1. Obiettivi

L'obiettivo di questa sottofase è costruire la pipeline di elaborazione asincrona per i documenti (DDT, fatture). Questo disaccoppia l'upload, che deve essere veloce, dall'elaborazione OCR, che può essere lenta.
- Creare un endpoint API per l'upload dei documenti.
- Configurare una coda di messaggi per gestire i job di elaborazione.
- Sviluppare un worker separato che esegua l'OCR sui documenti.
- Salvare i dati estratti nel database per la revisione umana.

## 2. Architettura della Pipeline

Il flusso sarà il seguente:
1.  **Upload:** L'utente invia un file (immagine/PDF) all'API del backend.
2.  **Salvataggio e Accodamento:**
    - Il backend salva immediatamente il file su uno storage S3-compatibile.
    - Crea un record nella tabella `documents` con lo stato `processing`.
    - Inserisce un nuovo job in una coda di messaggi (es. BullMQ/Redis) con l'ID del documento.
    - Restituisce una risposta immediata all'utente confermando l'avvenuto upload.
3.  **Elaborazione (Worker):**
    - Un processo **Worker**, in esecuzione separata dal server API, preleva il job dalla coda.
    - Scarica il file dallo storage.
    - Esegue l'OCR utilizzando una libreria come Tesseract.
    - Tenta di "parsare" il testo per estrarre campi chiave (fornitore, data, prodotti, quantità).
    - Aggiorna il record del documento nel database con i dati estratti (`parsed_json`) e imposta lo stato su `review_needed`.

## 3. Funzionalità da Implementare

### 3.1. Modulo `Documents` e API di Upload
- **Descrizione:** Verrà creato un `DocumentsModule` nel backend NestJS. Conterrà un controller con un endpoint `POST /documents/upload` che gestisce il `multipart/form-data` per il file.
- **Tecnologie:** NestJS, Multer (per la gestione degli upload), AWS-SDK (per lo storage S3).

### 3.2. Configurazione della Coda di Messaggi
- **Descrizione:** Verrà aggiunto BullMQ al backend per gestire la coda dei job OCR. Verrà configurata una coda specifica (`ocr-queue`).
- **Tecnologie:** `@nestjs/bull`, `bull`, `ioredis`.

### 3.3. Sviluppo del Worker OCR
- **Descrizione:** Verrà creato un nuovo processo NestJS (o uno script Node.js) che fungerà da worker. Questo processo si connetterà alla coda Redis, preleverà i job e li elaborerà. Per l'MVP, si può usare `tesseract.js` per eseguire l'OCR direttamente in Node.js.
- **Tecnologie:** NestJS (come worker), `tesseract.js`.

## 4. Specifiche Tecniche

### 4.1. Struttura delle Cartelle (Backend)
```
backend/
└── src/
    ├── documents/
    │   ├── dto/
    │   │   └── ...
    │   ├── entities/
    │   │   └── document.entity.ts
    │   ├── documents.controller.ts
    │   ├── documents.module.ts
    │   └── documents.service.ts
    └── workers/
        ├── ocr.processor.ts    # La logica del worker BullMQ
        └── workers.module.ts   # Modulo che registra i workers
```

### 4.2. Modello Dati (Entities)
- **`Document` Entity (`document.entity.ts`):**
  - `id`: `uuid`
  - `venueId`: `uuid`
  - `uploaderId`: `uuid`
  - `type`: `string` (es. 'ddt', 'invoice')
  - `storagePath`: `string` (Percorso del file su S3)
  - `parsedJson`: `jsonb` (I dati estratti dall'OCR)
  - `status`: `string` (Enum: `processing`, `review_needed`, `failed`, `completed`)

### 4.3. API Endpoints
- **Documents Controller (`/documents`):**
  - `POST /upload`: Riceve un file, lo salva, crea il record `Document` e accoda il job.
  - `GET /`: Restituisce l'elenco dei documenti con il loro stato.
  - `GET /:id`: Restituisce i dettagli di un documento, inclusi i dati parsati se disponibili.
  - `POST /:id/approve`: (Verrà usato dalla UI di revisione) Riceve i dati corretti, crea i movimenti di magazzino e imposta lo stato a `completed`.

### 4.4. Logica del Worker (`ocr.processor.ts`)
- Metodo `process(job)`:
    1.  Estrae `documentId` dal `job.data`.
    2.  Recupera il record del documento dal database.
    3.  Scarica il file dallo `storagePath`.
    4.  Esegue `Tesseract.recognize()` sul file.
    5.  Analizza il testo estratto per cercare pattern (es. "Quantità:", "Prezzo:", nomi di prodotti noti).
    6.  Costruisce un oggetto `parsedJson`.
    7.  Aggiorna il documento nel database con il JSON e il nuovo stato `review_needed`.
    8.  Gestisce eventuali errori impostando lo stato a `failed`.

## 5. Criteri di Accettazione

- L'upload di un file tramite `POST /documents/upload` deve restituire una risposta 201 e accodare un job in BullMQ.
- Il worker OCR deve prelevare il job dalla coda.
- Il worker deve eseguire l'OCR e aggiornare il record del documento con il testo estratto e lo stato `review_needed`.
- L'intero processo, dall'upload all'aggiornamento del worker, deve essere tracciabile tramite log.
- In caso di errore durante l'OCR, lo stato del documento deve essere impostato su `failed`.
- Le API sono protette e accessibili solo agli utenti autorizzati.