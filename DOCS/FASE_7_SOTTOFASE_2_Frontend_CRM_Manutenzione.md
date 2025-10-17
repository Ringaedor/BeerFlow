# Fase 7 / Sottofase 2: Frontend per CRM e Manutenzione

## 1. Obiettivi

L'obiettivo è fornire al personale le interfacce per interagire con i moduli CRM e Manutenzione.
- Creare una sezione per la gestione dei clienti.
- Sviluppare un'interfaccia per la gestione dei ticket di manutenzione.

## 2. Funzionalità da Implementare

### 2.1. Sezione CRM
- **Descrizione:** Verrà creata una nuova sezione "Clienti". Conterrà:
    - Una vista elenco per cercare e visualizzare i clienti.
    - Una pagina di dettaglio del cliente che mostra i suoi dati, lo storico degli ordini (futuro) e una sezione per gestire i consensi privacy.
- **Tecnologie:** Chakra UI, `react-query`.

### 2.2. Gestione Consensi
- **Descrizione:** Nella pagina di dettaglio del cliente, una serie di switch o checkbox permetterà di attivare/disattivare i consensi per i vari scopi (marketing, profilazione) e canali (email, SMS), inviando le richieste all'API del backend.
- **Tecnologie:** Chakra UI `Switch`.

### 2.3. Sezione Manutenzione
- **Descrizione:** Verrà creata una sezione "Manutenzione" che mostrerà una vista Kanban o una tabella dei ticket. Gli utenti potranno:
    - Creare un nuovo ticket tramite un form modale.
    - Filtrare i ticket per stato o assegnatario.
    - Cliccare su un ticket per vederne i dettagli e aggiornarlo.
- **Tecnologie:** Chakra UI `Table` o libreria Kanban, `react-query`.

## 3. Specifiche Tecniche

### 3.1. Struttura delle Cartelle Aggiuntiva (Frontend)
```
frontend/
└── src/
    └── features/
        ├── crm/
        │   ├── api/
        │   │   └── useCustomers.ts
        │   ├── components/
        │   │   └── ConsentManager.tsx
        │   └── pages/
        │       ├── CustomerListPage.tsx
        │       └── CustomerDetailPage.tsx
        └── maintenance/
            ├── api/
            │   └── useTickets.ts
            ├── components/
            │   └── TicketCard.tsx
            └── pages/
                └── MaintenancePage.tsx
```

### 3.2. Flusso Utente
- **Manager (CRM):**
    1.  Va su "Clienti". Cerca il cliente "Mario Rossi".
    2.  Entra nella sua scheda. Vede che il cliente ha dato il consenso per il marketing via email ma non via SMS.
    3.  Attiva lo switch per gli SMS. Viene inviata la richiesta al backend.
- **Cameriere (Manutenzione):**
    1.  Nota che una luce in sala è fulminata.
    2.  Va su "Manutenzione" -> "Nuovo Ticket".
    3.  Compila il form: Area="Sala", Priorità="Bassa", Descrizione="Luce tavolo T12 fulminata". Salva.
- **Tecnico (Manutenzione):**
    1.  Apre la sezione "Manutenzione". Vede il nuovo ticket.
    2.  Lo apre, se lo assegna, e cambia lo stato in "In Corso".
    3.  Una volta riparato il guasto, cambia lo stato in "Risolto".

## 4. Criteri di Accettazione

- Un utente autorizzato può cercare e visualizzare i clienti.
- È possibile aggiornare i consensi privacy di un cliente dall'interfaccia.
- Qualsiasi dipendente può creare un nuovo ticket di manutenzione.
- Un tecnico può visualizzare i ticket, assegnarseli e aggiornarne lo stato.
- Le interfacce sono protette e mostrano le azioni appropriate in base al ruolo dell'utente.
- Le viste sono responsive e funzionali su tablet e desktop.