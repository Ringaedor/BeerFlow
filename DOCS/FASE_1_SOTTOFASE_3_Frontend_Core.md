# Fase 1 / Sottofase 3: Core Frontend e Pagina di Login

## 1. Obiettivi

L'obiettivo di questa sottofase è creare le fondamenta dell'applicazione frontend. Questo include:
- Configurare un nuovo progetto React con Vite.
- Installare e configurare una libreria di componenti UI (Chakra UI, come suggerito nel `README.md`).
- Implementare il routing di base.
- Creare una pagina di Login funzionante che comunichi con le API di autenticazione del backend.
- Impostare un sistema di gestione dello stato globale per l'autenticazione.

## 2. Funzionalità da Implementare

### 2.1. Scaffolding del Progetto Frontend
- **Descrizione:** Verrà creato un nuovo progetto React + TypeScript utilizzando Vite all'interno della cartella `frontend`.
- **Tecnologie:** Vite, React, TypeScript.

### 2.2. Libreria di Componenti UI
- **Descrizione:** Verrà installata e configurata Chakra UI. Questo fornirà un set di componenti React pronti all'uso (bottoni, input, modali, ecc.) e un sistema di theming per personalizzare l'aspetto dell'applicazione in linea con lo stile "industrial, modern, minimal" richiesto.
- **Tecnologie:** `@chakra-ui/react`, `@emotion/react`, `@emotion/styled`, `framer-motion`.

### 2.3. Routing
- **Descrizione:** Verrà configurato il routing lato client utilizzando `react-router-dom`. Saranno definite le rotte pubbliche (es. `/login`) e le rotte private (es. `/dashboard`), accessibili solo agli utenti autenticati.
- **Tecnologie:** `react-router-dom`.

### 2.4. Gestione dello Stato Globale
- **Descrizione:** Verrà implementato un sistema per la gestione dello stato globale (es. Zustand o Redux Toolkit). Questo servirà a memorizzare lo stato dell'autenticazione (token JWT, informazioni utente) e a renderlo accessibile in tutta l'applicazione.
- **Tecnologie:** `zustand` (leggero e moderno) o `redux-toolkit`.

### 2.5. Comunicazione con le API (Client HTTP)
- **Descrizione:** Verrà configurato un client HTTP (Axios) per effettuare le chiamate alle API del backend. Verrà creata un'istanza di Axios con la configurazione di base (es. `baseURL`) e un interceptor per aggiungere automaticamente il token JWT a tutte le richieste verso le API protette.
- **Tecnologie:** `axios`.

### 2.6. Pagina di Login
- **Descrizione:** Verrà creata la pagina di login con un form per inserire email e password. Alla sottomissione del form, verrà effettuata una chiamata all'endpoint `POST /auth/login` del backend. In caso di successo, il token JWT e i dati utente verranno salvati nello stato globale e l'utente verrà reindirizzato alla dashboard.
- **Tecnologie:** React hooks (`useState`, `useEffect`), `react-hook-form` (per la gestione del form).

### 2.7. Rotte Protette
- **Descrizione:** Verrà creato un componente `ProtectedRoute` che verificherà la presenza del token nello stato globale. Se l'utente non è autenticato, verrà reindirizzato alla pagina di login.

## 3. Specifiche Tecniche

### 3.1. Struttura delle Cartelle (Frontend)
```
frontend/
├── src/
│   ├── api/
│   │   └── axiosClient.ts  # Configurazione di Axios
│   ├── components/
│   │   └── ProtectedRoute.tsx # Componente per le rotte protette
│   ├── features/
│   │   └── auth/
│   │       ├── components/
│   │       │   └── LoginForm.tsx
│   │       └── LoginPage.tsx
│   ├── hooks/
│   │   └── useAuth.ts      # Hook per accedere allo stato di auth
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   └── LoginPage.tsx    # (Potrebbe essere lo stesso di features/auth/LoginPage)
│   ├── router/
│   │   └── AppRouter.tsx    # Definizione delle rotte
│   ├── store/
│   │   └── authStore.ts     # Store di stato (Zustand)
│   ├── App.tsx
│   └── main.tsx
├── .env.example
└── package.json
```

## 4. Criteri di Accettazione

- Il frontend si avvia senza errori con il comando `npm run dev`.
- La pagina di login viene visualizzata correttamente all'indirizzo `/login`.
- Un utente può inserire le proprie credenziali e, cliccando sul bottone di login, viene effettuata una chiamata all'API del backend.
- In caso di login riuscito, l'utente viene reindirizzato a una pagina protetta (es. `/dashboard`).
- In caso di login fallito, viene mostrato un messaggio di errore all'utente.
- Se un utente non autenticato cerca di accedere direttamente a `/dashboard`, viene reindirizzato a `/login`.
- Il token JWT ricevuto dal backend viene salvato correttamente (es. in `localStorage`) e nello stato globale.