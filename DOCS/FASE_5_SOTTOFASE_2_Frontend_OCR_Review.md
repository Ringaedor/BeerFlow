# Fase 5 / Sottofase 2: Frontend per Revisione Documenti (Human-in-the-loop)

## 1. Obiettivi

L'OCR non è mai perfetto. L'obiettivo di questa sottofase è creare un'interfaccia "Human-in-the-loop" che permetta a un operatore di visualizzare il documento originale accanto ai dati estratti, correggerli e approvarli. L'approvazione finale innescherà il carico a magazzino.
- Creare una vista elenco per i documenti in attesa di revisione.
- Sviluppare un'interfaccia di revisione a due pannelli.
- Implementare la logica per l'approvazione del documento, che creerà i lotti e i movimenti di magazzino.

## 2. Funzionalità da Implementare

### 2.1. Elenco Documenti da Revisionare
- **Descrizione:** Verrà creata una pagina che mostra una lista di tutti i documenti con stato `review_needed`. La lista mostrerà informazioni chiave come il tipo di documento, il fornitore (se estratto) e la data di caricamento.
- **Tecnologie:** Chakra UI `Table`, `react-query`.

### 2.2. Interfaccia di Revisione a Due Pannelli
- **Descrizione:** Cliccando su un documento, l'utente accederà all'interfaccia di revisione. Questa sarà divisa in due:
    - **Pannello Sinistro:** Visualizzerà l'immagine o il PDF del documento originale.
    - **Pannello Destro:** Mostrerà un form con i campi estratti dall'OCR (es. fornitore, data, righe dei prodotti). I campi saranno modificabili.
- **Tecnologie:** `react-pdf` (per visualizzare i PDF), Chakra UI `Grid` e `FormControl`.

### 2.3. Correzione e Mappatura dei Prodotti
- **Descrizione:** Per ogni riga di prodotto estratta, l'utente dovrà poter:
    - Correggere la quantità e il prezzo.
    - Mappare il testo del prodotto (es. "BIRRA BIONDA 33CL") a un prodotto esistente nell'anagrafica di BeerFlow (tramite un campo di ricerca/autocomplete).
    - Creare un nuovo lotto per quel prodotto, inserendo il codice lotto e la data di scadenza.
- **Tecnologie:** Chakra UI `AutoComplete` (o simile), `react-query`.

### 2.4. Approvazione e Carico a Magazzino
- **Descrizione:** Un bottone "Approva e Carica a Magazzino" invierà i dati corretti all'endpoint `POST /documents/:id/approve` del backend. Questa API si occuperà di creare i nuovi lotti e i movimenti di magazzino di tipo `IN`.
- **Tecnologie:** `react-query` mutations.

## 3. Specifiche Tecniche

### 3.1. Struttura delle Cartelle Aggiuntiva (Frontend)
```
frontend/
└── src/
    └── features/
        └── documents/
            ├── api/
            │   └── useDocuments.ts
            ├── components/
            │   ├── DocumentReviewForm.tsx
            │   └── DocumentViewer.tsx
            ├── pages/
            │   ├── DocumentListPage.tsx
            │   └── DocumentReviewPage.tsx
            └── types/
                └── index.ts
```

### 3.2. Flusso Utente (Magazziniere)
1.  L'utente va nella sezione "Documenti". Vede una lista di DDT in attesa di revisione.
2.  Clicca sul primo documento.
3.  Viene reindirizzato a `/documents/review/:id`.
4.  A sinistra vede l'immagine del DDT. A destra, un form pre-compilato con i dati dell'OCR.
5.  Nota che l'OCR ha letto "Quantità: 1O" invece di "10". Corregge il campo.
6.  Per la riga "BIRRA ROSSA", il sistema non ha trovato una corrispondenza. L'utente usa il campo di ricerca, seleziona il prodotto corretto "Birra Artigianale Rossa" dalla sua anagrafica.
7.  Inserisce il codice lotto "L20250110" e la data di scadenza presi dal documento.
8.  Una volta che tutti i campi e le righe sono corretti, clicca su "Approva".
9.  La richiesta parte per il backend. Il documento scompare dalla lista "da revisionare" e viene spostato in "completati".
10. Nel backend, sono stati creati i nuovi lotti e i movimenti di magazzino, aggiornando le giacenze.

## 4. Criteri di Accettazione

- La lista dei documenti da revisionare mostra solo quelli con lo stato corretto.
- L'interfaccia di revisione mostra correttamente il documento originale e il form con i dati estratti.
- L'utente può modificare tutti i campi suggeriti dall'OCR.
- L'utente può mappare correttamente una riga del documento a un prodotto esistente in anagrafica.
- Il pulsante "Approva" invia i dati corretti al backend.
- Dopo l'approvazione, il documento non è più visibile nella lista di revisione.
- L'interfaccia gestisce correttamente gli stati di caricamento e gli errori.
- L'interfaccia è ottimizzata per l'uso su desktop o tablet, dato il bisogno di spazio per i due pannelli.