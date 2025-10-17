# Configurazione Ambiente di Sviluppo BeerFlow

Questo documento descrive i passaggi necessari per configurare l'ambiente di sviluppo locale per il progetto BeerFlow.

## Prerequisiti

Assicurati di avere installato i seguenti strumenti sulla tua macchina:

1.  **Git:** Per il controllo di versione. Puoi scaricarlo da [git-scm.com](https://git-scm.com/).
2.  **Node.js:** Si raccomanda l'ultima versione LTS. Puoi scaricarlo da [nodejs.org](https://nodejs.org/). Node.js include `npm`, il gestore di pacchetti che useremo.
3.  **Docker (Consigliato):** Per eseguire il database PostgreSQL in un container, in modo da non doverlo installare direttamente sul tuo sistema operativo. Puoi scaricarlo da [docker.com](https://www.docker.com/).

## Setup Iniziale

1.  **Clona il Repository:**
    Apri un terminale e clona il repository del progetto:
    ```bash
    git clone <URL_DEL_REPOSITORY>
    cd beerflow
    ```

2.  **Configura il Database (Usando Docker):**
    Dal terminale, nella root del progetto, esegui questo comando per avviare un'istanza di PostgreSQL:
    ```bash
    docker run --name beerflow-db -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_USER=beerflow -e POSTGRES_DB=beerflow_dev -p 5432:5432 -d postgres
    ```
    Questo comando avvierà un database PostgreSQL accessibile sulla porta `5432`.

## Installazione Dipendenze

Il progetto è diviso in due parti principali: `backend` e `frontend`. Ognuna ha le sue dipendenze da installare.

1.  **Installazione Dipendenze Backend:**
    ```bash
    cd backend
    npm install
    ```

2.  **Installazione Dipendenze Frontend:**
    ```bash
    cd ../frontend
    npm install
    ```

---
*Questo file verrà aggiornato man mano che verranno aggiunte nuove dipendenze o passaggi di configurazione.*