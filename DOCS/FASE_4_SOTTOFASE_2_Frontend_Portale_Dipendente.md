# Fase 4 / Sottofase 2: Frontend per Portale Dipendente e HACCP

## 1. Obiettivi

L'obiettivo di questa sottofase è creare le interfacce utente per le funzionalità di gestione del personale e HACCP. Questo "Portale Dipendente" sarà una sezione dell'app dove il personale potrà eseguire compiti amministrativi.
- Creare un'interfaccia semplice per la timbratura IN/OUT.
- Sviluppare un form per l'inserimento dei log di temperatura.
- Creare le viste per la consultazione dei dati da parte dei manager.

## 2. Funzionalità da Implementare

### 2.1. Sezione "My-Portal"
- **Descrizione:** Verrà creata una nuova sezione nell'app, accessibile da tutti i dipendenti. Conterrà le funzionalità personali come la timbratura.
- **Tecnologie:** `react-router-dom`, Chakra UI.

### 2.2. Widget di Timbratura
- **Descrizione:** Sarà un componente semplice, forse nella dashboard principale del dipendente, con un grande bottone "Timbra IN" o "Timbra OUT". Il sistema saprà quale mostrare in base all'ultimo stato del dipendente. Alla pressione, invierà la richiesta all'API `POST /staff/clock`.
- **Tecnologie:** Chakra UI `Button`, `react-query` mutations.

### 2.3. Form di Registrazione Temperature
- **Descrizione:** Verrà creato un form per permettere al personale di registrare le temperature dei frigoriferi/celle. Il form includerà un campo per selezionare l'area (es. da una lista predefinita), inserire la temperatura e aggiungere note.
- **Tecnologie:** `react-hook-form`, `zod`, Chakra UI `Select` e `Input`.

### 2.4. Viste per Manager
- **Descrizione:** Per gli utenti con ruolo 'manager' o 'admin', verranno create delle viste tabellari per consultare:
    1.  **Report Presenze:** Una tabella con tutte le timbrature, filtrabile per dipendente e per data, con il calcolo delle ore lavorate.
    2.  **Storico Temperature:** Una tabella o un grafico che mostra l'andamento delle temperature registrate per ogni area.
- **Tecnologie:** Chakra UI `Table`, `recharts` (per i grafici), `date-fns` (per la manipolazione di date).

## 3. Specifiche Tecniche

### 3.1. Struttura delle Cartelle Aggiuntiva (Frontend)
```
frontend/
└── src/
    └── features/
        ├── employee/
        │   ├── api/
        │   │   └── useTimeLogs.ts
        │   ├── components/
        │   │   └── ClockWidget.tsx
        │   └── pages/
        │       └── MyPortalPage.tsx
        └── haccp/
            ├── api/
            │   └── useTemperatureLogs.ts
            ├── components/
            │   └── TemperatureLogForm.tsx
            └── pages/
                └── TemperatureReportPage.tsx
```

### 3.2. Flusso Utente
- **Dipendente:**
    1.  Esegue il login.
    2.  Nella sua dashboard, vede un bottone "Timbra IN". Lo preme.
    3.  Riceve una conferma. Il bottone ora mostra "Timbra OUT".
    4.  Durante il turno, va nella sezione HACCP, seleziona "Frigo Birre", inserisce "4.5" (°C) e salva.
- **Manager:**
    1.  Esegue il login.
    2.  Va nella sezione "Report" -> "Presenze".
    3.  Vede la tabella con le timbrature di tutti i dipendenti per la giornata odierna.
    4.  Va nella sezione "HACCP" -> "Storico Temperature".
    5.  Vede un grafico con l'andamento delle temperature del "Frigo Birre" nell'ultima settimana.

## 4. Criteri di Accettazione

- Un dipendente può timbrare l'entrata e l'uscita dalla sua dashboard personale.
- L'interfaccia di timbratura fornisce un feedback chiaro all'utente.
- Un utente autorizzato può accedere al form di registrazione temperature e salvare nuovi dati.
- I manager possono visualizzare il report delle presenze e filtrarlo per data e dipendente.
- I manager possono visualizzare lo storico delle temperature registrate.
- Tutte le nuove sezioni sono protette e accessibili solo ai ruoli appropriati.
- Le interfacce sono responsive e ben utilizzabili su dispositivi mobili.