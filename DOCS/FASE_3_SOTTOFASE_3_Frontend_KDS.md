# Fase 3 / Sottofase 3: Frontend KDS (Kitchen Display System)

## 1. Obiettivi

L'obiettivo di questa sottofase è sviluppare l'interfaccia per la cucina e/o il bar (KDS), che visualizzerà le comande in arrivo in tempo reale. Questo componente è cruciale per l'efficienza operativa del locale.
- Creare un'interfaccia a colonne che mostri gli ordini nei diversi stati di preparazione.
- Ricevere i nuovi ordini in tempo reale tramite WebSockets.
- Permettere al personale di cucina/bar di aggiornare lo stato di un ordine.

## 2. Funzionalità da Implementare

### 2.1. Connessione WebSocket
- **Descrizione:** Il KDS stabilirà una connessione persistente con il server WebSocket del backend. Si metterà in ascolto dell'evento `new_order` per ricevere e visualizzare le nuove comande non appena vengono inviate dai camerieri.
- **Tecnologie:** `socket.io-client`.

### 2.2. Vista a Colonne (Kanban)
- **Descrizione:** L'interfaccia principale del KDS sarà una vista stile Kanban con colonne che rappresentano gli stati dell'ordine:
    - **Da Preparare:** Nuovi ordini in arrivo.
    - **In Preparazione:** Ordini che il personale ha iniziato a lavorare.
    - **Pronto:** Ordini completati, pronti per essere serviti.
Ogni ordine sarà rappresentato da una "card".
- **Tecnologie:** Chakra UI, `react-beautiful-dnd` (o simile) per un futuro drag-and-drop.

### 2.3. Card dell'Ordine
- **Descrizione:** Ogni card mostrerà le informazioni essenziali della comanda:
    - Nome del tavolo e del cameriere.
    - Elenco degli item da preparare, con quantità e note.
    - Un timer che indica da quanto tempo l'ordine è in attesa.
- **Tecnologie:** Chakra UI `Card`.

### 2.4. Aggiornamento dello Stato dell'Ordine
- **Descrizione:** Ogni card avrà dei bottoni per far avanzare l'ordine nel flusso di lavoro. Ad esempio, un bottone "Prepara" sposterà la card dalla colonna "Da Preparare" a "In Preparazione". Questa azione invierà una richiesta `PATCH /orders/:id` al backend per aggiornare lo stato e potrebbe notificare il cameriere (funzionalità avanzata).
- **Tecnologie:** `axios`, `react-query` mutations.

## 3. Specifiche Tecniche

### 3.1. Struttura delle Cartelle Aggiuntiva (Frontend)
```
frontend/
├── src/
│   ├── features/
│   │   └── kds/
│   │       ├── api/
│   │       │   └── useKdsOrders.ts # Hook per fetch e update ordini
│   │       ├── components/
│   │       │   ├── OrderCard.tsx
│   │       │   └── KdsColumn.tsx
│   │       ├── hooks/
│   │       │   └── useKdsSocket.ts # Hook per gestire la logica WebSocket
│   │       └── pages/
│   │           └── KdsPage.tsx
│   └── store/
│       └── kdsStore.ts           # Store per gli ordini del KDS
└── ...
```

### 3.2. Flusso Utente (Personale Cucina/Bar)
1.  Il cuoco/barista apre la pagina del KDS su un tablet o schermo in cucina.
2.  La pagina si connette al WebSocket e carica gli ordini già presenti negli stati 'confirmed' e 'preparing'.
3.  Un cameriere invia una nuova comanda dal suo terminale.
4.  Istantaneamente, una nuova card appare nella colonna "Da Preparare" del KDS, magari con un suono di notifica.
5.  Il cuoco vede la nuova card, legge gli item e clicca su "Inizia Preparazione".
6.  La card si sposta nella colonna "In Preparazione". Lo stato dell'ordine viene aggiornato nel backend.
7.  Una volta che tutti gli item sono pronti, il cuoco clicca su "Ordine Pronto".
8.  La card si sposta nella colonna "Pronto". Un'eventuale notifica può essere inviata al cameriere (non in questo MVP).

### 3.3. Gestione dello Stato
- Si utilizzerà una combinazione di `react-query` per il caricamento iniziale degli ordini e `socket.io-client` per gli aggiornamenti in tempo reale.
- Uno store (es. `zustand`) gestirà la lista degli ordini visualizzati, aggiungendo, aggiornando o rimuovendo card in base agli eventi ricevuti dal WebSocket e alle azioni dell'utente.

## 4. Criteri di Accettazione

- All'apertura, il KDS carica correttamente gli ordini attivi dal backend.
- Il KDS si connette con successo al server WebSocket.
- Una nuova comanda inviata da un altro client appare sul KDS in tempo reale (latenza < 2 secondi).
- Il personale può aggiornare lo stato di un ordine cliccando sui bottoni appropriati.
- L'aggiornamento dello stato viene comunicato correttamente al backend.
- L'interfaccia è chiara, leggibile da una certa distanza e ottimizzata per l'uso su tablet in un ambiente di lavoro frenetico.
- Il timer su ogni card mostra in modo affidabile il tempo trascorso.