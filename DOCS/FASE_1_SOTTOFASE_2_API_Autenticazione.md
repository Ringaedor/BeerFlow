# Fase 1 / Sottofase 2: API di Autenticazione e Gestione Utenti

## 1. Obiettivi

L'obiettivo di questa sottofase è implementare un sistema di autenticazione sicuro basato su JSON Web Tokens (JWT). Questo permetterà agli utenti di registrarsi, effettuare il login e accedere a rotte protette. Verrà anche creato il modulo per la gestione degli utenti, strettamente legato a quello di autenticazione.

## 2. Funzionalità da Implementare

### 2.1. Modulo `Users`
- **Descrizione:** Verrà creato il modulo per la gestione degli utenti (`UsersModule`). Questo includerà l'entità TypeORM per la tabella `users`, un servizio per interagire con il database e un controller per esporre le API relative agli utenti.
- **Tecnologie:** NestJS modules, TypeORM entities.

### 2.2. Hashing delle Password
- **Descrizione:** Le password degli utenti non verranno mai salvate in chiaro. Prima di salvare un nuovo utente nel database, la sua password verrà "hashata" utilizzando un algoritmo robusto come `bcrypt`. Lo stesso algoritmo verrà usato per confrontare la password fornita durante il login con quella salvata.
- **Tecnologie:** `bcryptjs`.

### 2.3. Modulo `Auth`
- **Descrizione:** Questo modulo conterrà la logica per l'autenticazione. Implementerà le strategie di login (locale, basata su email/password) e di validazione dei JWT.
- **Tecnologie:** `@nestjs/passport`, `@nestjs/jwt`, `passport`, `passport-local`, `passport-jwt`.

### 2.4. Endpoint di Registrazione e Login
- **Descrizione:** Verranno creati due endpoint pubblici:
    - `POST /auth/register`: Per creare un nuovo utente.
    - `POST /auth/login`: Per autenticare un utente e restituire un JWT.
- **Tecnologie:** NestJS controllers.

### 2.5. Protezione delle Rotte (Route Guarding)
- **Descrizione:** Verrà implementata una "Guard" JWT. Questa `Guard` potrà essere applicata a qualsiasi endpoint dell'API per renderlo accessibile solo a utenti autenticati (ovvero, che forniscono un JWT valido nell'header della richiesta).
- **Tecnologie:** NestJS Guards, `@nestjs/jwt`.

### 2.6. Gestione Ruoli e Permessi (RBAC - Base)
- **Descrizione:** Verrà implementata una base per il Role-Based Access Control. L'entità `User` includerà un campo `role` (es. 'admin', 'manager', 'waiter'). Verrà creata una `RolesGuard` che permetterà di limitare l'accesso a specifici endpoint solo a utenti con determinati ruoli.
- **Tecnologie:** NestJS Guards.

## 3. Specifiche Tecniche

### 3.1. Struttura delle Cartelle Aggiuntiva (Backend)
```
backend/
└── src/
    ├── auth/
    │   ├── dto/
    │   │   ├── login.dto.ts
    │   │   └── register.dto.ts
    │   ├── strategies/
    │   │   ├── jwt.strategy.ts
    │   │   └── local.strategy.ts
    │   ├── guards/
    │   │   ├── jwt-auth.guard.ts
    │   │   └── roles.guard.ts
    │   ├── auth.controller.ts
    │   ├── auth.module.ts
    │   └── auth.service.ts
    └── users/
        ├── dto/
        │   ├── create-user.dto.ts
        │   └── update-user.dto.ts
        ├── entities/
        │   └── user.entity.ts
        ├── users.controller.ts
        ├── users.module.ts
        └── users.service.ts
```

### 3.2. Modello Dati (Entities)
- **`User` Entity (`user.entity.ts`):**
  - `id`: `uuid` (Primary Key)
  - `email`: `string` (Unique)
  - `passwordHash`: `string` (Non verrà mai esposto nelle API)
  - `name`: `string`
  - `role`: `string` (es. 'admin', 'manager')
  - `venueId`: `uuid` (Foreign Key a `venues`)
  - `active`: `boolean`

### 3.3. API Endpoints
- **Auth Controller (`/auth`):**
  - `POST /register`: Crea un nuovo utente.
  - `POST /login`: Effettua il login e restituisce un `access_token`.
  - `GET /profile`: Rotta protetta di esempio che restituisce il profilo dell'utente loggato.
- **Users Controller (`/users`):**
  - `GET /`: (Admin) Restituisce tutti gli utenti.
  - `GET /:id`: (Admin) Restituisce un utente specifico.
  - `PATCH /:id`: (Admin) Aggiorna un utente.
  - `DELETE /:id`: (Admin) Disattiva un utente.

## 4. Criteri di Accettazione

- Un nuovo utente può registrarsi con successo tramite l'endpoint `POST /auth/register`.
- La password dell'utente viene salvata nel database in formato hashato e non in chiaro.
- Un utente registrato può effettuare il login tramite `POST /auth/login` e ricevere un JWT valido.
- Un utente non autenticato che tenta di accedere a una rotta protetta (es. `GET /auth/profile`) riceve un errore `401 Unauthorized`.
- Un utente autenticato può accedere con successo alle rotte protette fornendo il JWT.
- Un utente con un ruolo non autorizzato che tenta di accedere a una rotta protetta da `RolesGuard` riceve un errore `403 Forbidden`.
- Devono essere presenti test di integrazione per il flusso di registrazione e login.