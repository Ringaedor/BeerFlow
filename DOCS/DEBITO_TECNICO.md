# Debito Tecnico e Attività da Completare

Questo documento tiene traccia delle questioni tecniche note, dei problemi da risolvere e delle attività lasciate indietro che dovranno essere affrontate in futuro.

## 1. Configurazione Test Frontend (Vitest + Chakra UI)

-   **Problema:** L'ambiente di test Vitest non riesce a processare correttamente i componenti che utilizzano Chakra UI, restituendo l'errore `TypeError: (0 , extendTheme) is not a function`.
-   **Tentativi Effettuati:**
    -   Aggiunta del `theme` al `ChakraProvider` nei test.
    -   Configurazione di `deps.inline` e `deps.optimizer.web.include` in `vite.config.ts`.
-   **Stato Attuale:** I test del frontend sono temporaneamente commentati per non bloccare la pipeline di sviluppo. Il server di sviluppo (`npm run dev`) funziona correttamente.
-   **Azione Richiesta:** Investigare ulteriormente la causa dell'incompatibilità. Possibili strade:
    -   Verificare le versioni delle dipendenze (`vitest`, `jsdom`, `@chakra-ui/react`).
    -   Cercare issue simili nei repository GitHub delle rispettive librerie.
    -   Creare un "test-wrapper" personalizzato che fornisca tutti i provider necessari in modo isolato.
-   **Priorità:** Media. Da risolvere prima di implementare una suite di test frontend estesa.