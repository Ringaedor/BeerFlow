# Fase 6 / Sottofase 2: Frontend per Gestione Tavoli e Prenotazioni

## 1. Obiettivi

L'obiettivo è creare l'interfaccia visuale che il personale di sala (manager, capo sala, camerieri) userà per monitorare e gestire la sala.
- Sviluppare una mappa della sala "drag-and-drop" per permettere ai manager di configurare il layout.
- Visualizzare lo stato dei tavoli in tempo reale sulla mappa.
- Creare un'interfaccia per creare e visualizzare le prenotazioni.

## 2. Funzionalità da Implementare

### 2.1. Modalità Layout (Manager)
- **Descrizione:** I manager avranno accesso a una "modalità layout". In questa modalità, i tavoli sulla mappa possono essere trascinati (`drag-and-drop`) per posizionarli. Un pulsante "Salva Layout" invierà le nuove coordinate di tutti i tavoli al backend.
- **Tecnologie:** `react-dnd` o una libreria simile per il drag-and-drop.

### 2.2. Vista Operativa (Camerieri/Staff)
- **Descrizione:** Questa è la vista standard. Mostra la mappa dei tavoli ma non permette il drag-and-drop. I tavoli saranno colorati in base al loro stato (`free`, `occupied`, `booked`), che si aggiornerà in tempo reale grazie ai WebSockets. Cliccando su un tavolo si potranno avviare azioni contestuali (es. "Nuovo Ordine", "Visualizza Conto").
- **Tecnologie:** `socket.io-client`, Chakra UI.

### 2.3. Interfaccia di Prenotazione
- **Descrizione:** Verrà creata una nuova sezione "Prenotazioni". Includerà:
    - Un calendario o una vista a timeline per visualizzare le prenotazioni esistenti.
    - Un form per creare una nuova prenotazione, che permetterà di selezionare un cliente (dal CRM), un tavolo, una data/ora e il numero di persone.
- **Tecnologie:** Una libreria di calendari come `react-big-calendar` o una soluzione custom, Chakra UI `Modal` per il form.

## 3. Specifiche Tecniche

### 3.1. Struttura delle Cartelle Aggiuntiva (Frontend)
```
frontend/
└── src/
    └── features/
        ├── tables/
        │   ├── api/
        │   │   └── useTables.ts
        │   ├── components/
        │   │   ├── TableMap.tsx
        │   │   └── DraggableTable.tsx
        │   ├── hooks/
        │   │   └── useTableSocket.ts
        │   └── pages/
        │       └── RoomManagementPage.tsx
        └── reservations/
            ├── api/
            │   └── useReservations.ts
            ├── components/
            │   ├── ReservationCalendar.tsx
            │   └── ReservationForm.tsx
            └── pages/
                └── ReservationsPage.tsx
```

### 3.2. Flusso Utente
- **Manager (Configurazione):**
    1.  Va su "Gestione Sala".
    2.  Attiva la "Modalità Layout".
    3.  Trascina i tavoli per replicare la disposizione fisica del locale.
    4.  Salva il layout. Le posizioni vengono inviate al backend.
- **Cameriere (Operativo):**
    1.  Apre la PWA e va su "Mappa Sala".
    2.  Vede i tavoli colorati: verde (libero), rosso (occupato), blu (prenotato).
    3.  Un cliente si siede al tavolo T5 (verde). Il cameriere clicca sul tavolo e seleziona "Nuovo Ordine".
    4.  Mentre prende l'ordine, vede che il tavolo T8 è diventato rosso: un collega ha appena inviato una comanda per quel tavolo. L'aggiornamento è avvenuto in tempo reale.
- **Staff (Prenotazioni):**
    1.  Riceve una telefonata. Va su "Prenotazioni".
    2.  Visualizza il calendario, vede che alle 20:00 c'è posto.
    3.  Clicca su "Nuova Prenotazione", compila i dati del cliente e salva.
    4.  Il tavolo corrispondente sulla mappa della sala ora appare blu per la fascia oraria delle 20:00.

## 4. Criteri di Accettazione

- Un manager può posizionare i tavoli su una mappa tramite drag-and-drop e salvare il layout.
- Lo stato dei tavoli sulla mappa si aggiorna in tempo reale in base agli eventi del sistema (nuovi ordini, prenotazioni).
- Cliccare su un tavolo apre un menu contestuale con le azioni appropriate.
- È possibile creare una nuova prenotazione tramite l'interfaccia dedicata.
- Le prenotazioni esistenti sono visualizzabili in un calendario o in una lista.
- L'interfaccia è intuitiva e ottimizzata per l'uso su tablet.