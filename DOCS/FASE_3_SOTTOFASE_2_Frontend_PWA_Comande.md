# Fase 3 / Sottofase 2: Frontend PWA per la Presa Comande

## 1. Obiettivi

L'obiettivo di questa sottofase è sviluppare l'interfaccia mobile-first che i camerieri useranno per prendere e gestire le comande. L'applicazione deve essere una Progressive Web App (PWA) per garantire performance elevate, la possibilità di essere "installata" sulla homescreen dei dispositivi e funzionalità offline di base.
- Creare la vista di selezione del tavolo.
- Sviluppare l'interfaccia per la creazione di una comanda.
- Configurare il progetto come PWA.

## 2. Funzionalità da Implementare

### 2.1. Configurazione PWA
- **Descrizione:** Il progetto Vite verrà configurato per essere una PWA. Questo include la creazione di un `manifest.json` (per definire l'icona dell'app, il nome, ecc.) e la configurazione di un Service Worker per la cache delle risorse e il supporto offline.
- **Tecnologie:** `vite-plugin-pwa`.

### 2.2. Vista di Selezione Tavolo/Sala
- **Descrizione:** Dopo il login, il cameriere visualizzerà una mappa semplificata della sala o una lista di tavoli. I tavoli avranno stati diversi (libero, occupato) indicati da colori. Il cameriere potrà selezionare un tavolo per visualizzare una comanda esistente o crearne una nuova. Per questa fase, una semplice lista/griglia di tavoli è sufficiente.
- **Tecnologie:** `react-router-dom`, Chakra UI `Grid` e `Card`.

### 2.3. Interfaccia di Creazione Comanda
- **Descrizione:** Una volta selezionato un tavolo, si accede all'interfaccia di presa comanda. Questa sarà divisa in due parti:
    1.  **Lista Prodotti:** Un elenco di prodotti ordinabili, divisi per categoria (es. Birre, Antipasti, Primi). I prodotti avranno un pulsante per aggiungerli alla comanda.
    2.  **Riepilogo Comanda:** Un carrello che mostra gli item aggiunti, con la possibilità di modificare la quantità o aggiungere note.
- **Tecnologie:** Chakra UI, `react-query` per il fetching dei prodotti.

### 2.4. Invio Comanda
- **Descrizione:** Un pulsante "Invia Comanda" effettuerà la chiamata `POST /orders` al backend. Alla conferma, l'interfaccia tornerà alla vista dei tavoli, che ora mostrerà lo stato aggiornato. Verrà gestito il feedback per l'utente (spinner durante l'invio, messaggio di successo/errore).
- **Tecnologie:** `axios`, `react-query` mutations.

### 2.5. Supporto Offline (Base)
- **Descrizione:** Grazie al Service Worker, l'app e i dati statici (come la lista prodotti) saranno disponibili anche in caso di connessione instabile. Per l'MVP, le operazioni di scrittura (invio comanda) richiederanno una connessione attiva. La vera coda di sincronizzazione offline verrà implementata in una fase successiva.
- **Tecnologie:** Service Workers (tramite `vite-plugin-pwa`).

## 3. Specifiche Tecniche

### 3.1. Struttura delle Cartelle Aggiuntiva (Frontend)
```
frontend/
├── public/
│   └── manifest.json         # Generato da vite-plugin-pwa
├── src/
│   ├── features/
│   │   ├── pos/
│   │   │   ├── api/
│   │   │   │   └── useOrders.ts
│   │   │   ├── components/
│   │   │   │   ├── ProductMenu.tsx
│   │   │   │   └── OrderCart.tsx
│   │   │   ├── pages/
│   │   │   │   ├── TableSelectionPage.tsx
│   │   │   │   └── OrderPage.tsx
│   │   │   └── types/
│   │   │       └── index.ts
│   └── service-worker.js       # Generato da vite-plugin-pwa
└── vite.config.ts            # Configurazione PWA
```

### 3.2. Flusso Utente (Cameriere)
1.  Il cameriere apre l'app (PWA) sul suo dispositivo mobile.
2.  Effettua il login.
3.  Visualizza la lista dei tavoli. Seleziona il tavolo "Tavolo 5" (libero).
4.  Viene reindirizzato a `/order/new?table=5`.
5.  Sulla sinistra, vede le categorie di prodotti. Clicca su "Birre".
6.  Vede la lista delle birre. Aggiunge 2 "Pilsner" e 1 "IPA".
7.  Sulla destra, il riepilogo si aggiorna mostrando gli item.
8.  Aggiunge una nota ("Senza schiuma") alla IPA.
9.  Clicca su "Invia Comanda".
10. La richiesta parte verso il backend. Al successo, viene riportato alla vista tavoli, dove "Tavolo 5" ora appare "occupato".

## 4. Criteri di Accettazione

- L'applicazione frontend supera i controlli di Lighthouse per le PWA (installabilità, performance di base).
- Un cameriere può selezionare un tavolo e visualizzare un'interfaccia per creare una nuova comanda.
- L'elenco dei prodotti è caricato correttamente dall'API e navigabile per categorie.
- È possibile aggiungere/rimuovere prodotti e modificare quantità e note nel carrello della comanda.
- Il pulsante "Invia Comanda" invia correttamente i dati all'API del backend.
- L'interfaccia fornisce un feedback chiaro durante e dopo l'invio della comanda.
- L'applicazione è progettata con un approccio mobile-first e risulta fluida e facile da usare su smartphone.