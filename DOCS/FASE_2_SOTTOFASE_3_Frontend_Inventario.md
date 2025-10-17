# Fase 2 / Sottofase 3: Frontend per Gestione Inventario

## 1. Obiettivi

L'obiettivo di questa sottofase è costruire le interfacce utente (UI) che permetteranno al personale autorizzato (es. manager, magazzinieri) di gestire l'anagrafica dei prodotti e di visualizzare le giacenze di magazzino.
- Creare una sezione "Inventario" all'interno dell'applicazione frontend.
- Sviluppare le viste per listare, creare e modificare i prodotti.
- Mostrare i dettagli di un prodotto, inclusi i lotti associati e le quantità correnti.

## 2. Funzionalità da Implementare

### 2.1. Sezione Inventario
- **Descrizione:** Verrà aggiunta una nuova voce di menu ("Inventario" o "Magazzino") nella navigazione principale, accessibile solo agli utenti con i permessi necessari. Questa porterà a una nuova sezione dell'app dedicata alla gestione dell'inventario.
- **Tecnologie:** `react-router-dom`, Componenti di layout Chakra UI.

### 2.2. Vista Elenco Prodotti
- **Descrizione:** Sarà la pagina principale della sezione. Mostrerà una tabella o una lista di tutti i prodotti della venue. La tabella includerà colonne come SKU, Nome, Prezzo, Costo e Giacenza Totale. Saranno presenti funzionalità di paginazione, ricerca e filtro. Un bottone "Aggiungi Prodotto" porterà al form di creazione.
- **Tecnologie:** Chakra UI `Table`, `react-query` o `swr` per il data-fetching e la cache.

### 2.3. Form di Creazione/Modifica Prodotto
- **Descrizione:** Verrà creato un form modale o una pagina dedicata per inserire o modificare i dati di un prodotto. Il form conterrà campi per nome, SKU, unità, prezzo, costo, ecc. e sarà validato lato client prima dell'invio al backend.
- **Tecnologie:** Chakra UI `Modal` o pagina dedicata, `react-hook-form` per la gestione del form, `zod` per la validazione dello schema.

### 2.4. Vista Dettaglio Prodotto
- **Descrizione:** Cliccando su un prodotto dalla lista, l'utente accederà a una pagina di dettaglio. Questa pagina mostrerà tutte le informazioni del prodotto e una sezione dedicata ai lotti.
- **Tecnologie:** `react-router-dom` (rotta dinamica `/inventory/products/:id`).

### 2.5. Vista Elenco Lotti per Prodotto
- **Descrizione:** All'interno della pagina di dettaglio del prodotto, verrà visualizzata una tabella con tutti i lotti associati. Per ogni lotto saranno mostrati il codice, la quantità iniziale, la quantità corrente e la data di scadenza. Questo darà una visione chiara di quali lotti sono disponibili per un dato prodotto.
- **Tecnologie:** Chakra UI `Table`, `react-query`.

## 3. Specifiche Tecniche

### 3.1. Struttura delle Cartelle Aggiuntiva (Frontend)
```
frontend/
└── src/
    ├── features/
    │   └── inventory/
    │       ├── api/
    │       │   ├── useProducts.ts   # Hook per fetch/create/update prodotti
    │       │   └── useLots.ts       # Hook per fetch lotti di un prodotto
    │       ├── components/
    │       │   ├── ProductForm.tsx
    │       │   ├── ProductsTable.tsx
    │       │   └── LotsTable.tsx
    │       ├── pages/
    │       │   ├── ProductListPage.tsx
    │       │   └── ProductDetailPage.tsx
    │       └── types/
    │           └── index.ts        # Tipi TypeScript per Product, Lot, etc.
    └── router/
        └── AppRouter.tsx        # Aggiunta delle nuove rotte protette
```

### 3.2. Flusso Utente
1.  L'utente (manager) effettua il login.
2.  Nel menu di navigazione, clicca su "Inventario".
3.  Viene reindirizzato a `/inventory/products`. La pagina carica e mostra l'elenco dei prodotti.
4.  L'utente clicca su "Aggiungi Prodotto". Si apre un modale con il form di creazione.
5.  L'utente compila il form e salva. Viene effettuata una chiamata `POST /products`. La lista dei prodotti si aggiorna.
6.  L'utente clicca su un prodotto esistente.
7.  Viene reindirizzato a `/inventory/products/:id`. La pagina carica i dettagli del prodotto e, in una sezione separata, l'elenco dei suoi lotti con le relative giacenze.

### 3.3. Gestione dello Stato (Data Fetching)
- Si utilizzerà `react-query` (o SWR) per gestire lo stato del server.
- `useProducts`: un custom hook che incapsula la logica per:
    - `query`: recuperare la lista dei prodotti (con paginazione/filtri).
    - `mutation`: creare, aggiornare o eliminare un prodotto. Gestirà automaticamente l'invalidazione della cache per aggiornare la UI.
- `useLots(productId)`: un custom hook per recuperare i lotti di un prodotto specifico.

## 4. Criteri di Accettazione

- La sezione "Inventario" è visibile solo a utenti con i permessi corretti.
- La pagina elenco prodotti mostra correttamente i dati ricevuti dall'API `GET /products`.
- Il form di creazione/modifica prodotto permette di inviare i dati al backend e, in caso di successo, la UI si aggiorna di conseguenza.
- La validazione del form impedisce l'invio di dati incompleti o errati.
- La pagina di dettaglio di un prodotto mostra correttamente le informazioni del prodotto e l'elenco dei suoi lotti.
- Le interfacce sono responsive e utilizzabili anche su dispositivi mobili (tablet).
- Il caricamento dei dati è gestito con indicatori di stato (loading spinner, messaggi di errore).