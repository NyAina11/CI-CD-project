# Pipeline CI/CD — Interface & Visualisation des déploiements

Projet pédagogique DevOps en **Node.js** : une mini-plateforme qui exécute un
**vrai pipeline CI/CD** (clone d'un dépôt Git, installation, tests, build,
déploiement) et qui en **visualise l'exécution en temps réel** dans une
interface web React, avec un **historique persistant** des déploiements.

---

## 1. Architecture

```
cicd-project/
├── backend/                 # API + moteur d'exécution du pipeline
│   ├── server.js            # Point d'entrée (Express + Socket.IO)
│   ├── src/
│   │   ├── pipelineExecutor.js  # Clone le repo, exécute chaque étape, stream les logs
│   │   ├── db.js                # Persistance JSON de l'historique des déploiements
│   │   ├── socket.js             # Gestion des "rooms" Socket.IO (1 room par run)
│   │   └── routes/api.js         # Routes REST
│   ├── data/
│   │   ├── deployments.json      # Historique des déploiements (créé automatiquement)
│   │   └── logs/<id>.jsonl       # Logs complets de chaque exécution (1 ligne JSON / log)
│   └── workspaces/<id>/          # Clone Git temporaire de chaque exécution
│
└── frontend/                 # Interface React (Vite)
    └── src/
        ├── components/
        │   ├── PipelineForm.jsx       # Formulaire : dépôt, branche, étapes
        │   ├── PipelineDashboard.jsx  # Dashboard temps réel (WebSocket)
        │   ├── DeploymentHistory.jsx  # Historique des déploiements
        │   ├── DeploymentDetails.jsx  # Détails + logs archivés d'un déploiement
        │   ├── StageNode.jsx          # Nœud visuel d'une étape du pipeline
        │   └── StatusBadge.jsx        # Badge de statut réutilisable
        ├── api.js             # Client REST
        ├── socket.js          # Connexion Socket.IO partagée
        └── index.css          # Thème "pipeline" (dark + accents)
```

### Flux d'exécution

1. L'utilisateur soumet une URL de dépôt Git, une branche, et la liste des
   commandes à exécuter par étape (valeurs par défaut pré-remplies).
2. Le backend crée un enregistrement de déploiement (`status: running`),
   répond immédiatement avec un `id`, puis exécute le pipeline **en
   arrière-plan**.
3. Pour chaque étape (`clone`, `install`, `test`, `build`, `deploy`, ...) :
   - la commande est lancée avec `child_process.spawn` dans le workspace du
     run ;
   - chaque ligne de `stdout`/`stderr` est diffusée en direct via
     **Socket.IO** (`event: log`) et écrite dans `data/logs/<id>.jsonl` ;
   - le statut de l'étape (`pending → running → success|failed`) est diffusé
     via `event: stage-update` et persisté dans `deployments.json`.
4. Si une étape échoue, **toutes les étapes suivantes sont marquées
   `skipped`** et le pipeline s'arrête.
5. Le frontend affiche en direct la "tuyauterie" du pipeline (nœuds reliés
   par des tuyaux dont la couleur/animation reflète l'état) ainsi que la
   console de logs.
6. Une fois terminé, le déploiement reste consultable dans **l'historique**,
   avec ses logs complets regroupés par étape.

---

## 2. Stack technique

| Couche       | Choix                                            |
|--------------|--------------------------------------------------|
| Backend      | Node.js, Express, Socket.IO, `child_process`     |
| Persistance  | Fichier JSON (`data/deployments.json`) + logs JSONL |
| Frontend     | React 18 + Vite, React Router, `socket.io-client` |
| Style        | CSS pur (thème sombre "pipeline", sans framework) |

La persistance "fichier JSON" est volontairement simple pour un projet
pédagogique. Une vraie application remplacerait `src/db.js` par SQLite /
PostgreSQL, sans changer le reste du code (l'API de `db.js` resterait la
même).

---

## 3. Installation & lancement

Prérequis : **Node.js ≥ 18** et **git** installés sur la machine qui fait
tourner le backend (le pipeline exécute réellement `git clone`, `npm
install`, etc.).

### Backend

```bash
cd backend
npm install
npm start          # démarre l'API sur http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
npm run dev         # démarre l'interface sur http://localhost:5173
```

Le serveur de dev Vite est configuré (`vite.config.js`) pour rediriger
`/api` et `/socket.io` vers `http://localhost:4000` : il suffit donc
d'ouvrir **http://localhost:5173**.

Pour une version de production :

```bash
cd frontend
npm run build        # génère frontend/dist
npm run preview      # sert le build (adapter l'URL de l'API si besoin)
```

---

## 4. Utilisation

1. Sur la page **"Nouveau déploiement"**, renseigne :
   - l'URL HTTPS d'un dépôt public, par ex. `https://github.com/<user>/<projet>.git` ;
   - la branche (par défaut `main`) ;
   - les étapes du pipeline (pré-remplies pour un projet Node.js : `npm
     install`, `npm test`, `npm run build --if-present`, puis une étape
     `deploy` à personnaliser).
2. Clique sur **"Lancer le pipeline"** → tu es redirigé vers le dashboard
   temps réel, qui affiche :
   - la visualisation du pipeline (un nœud par étape, relié par des
     "tuyaux" colorés selon l'état) ;
   - les logs en direct, ligne par ligne.
3. Dans **"Historique"**, retrouve tous les déploiements passés, leur statut,
   leur durée, et accède au détail (logs complets par étape, repliables).

### Exemple d'étape de déploiement réaliste

L'étape `deploy` par défaut est un simple `echo` à remplacer. Quelques
exemples réalistes (à adapter selon l'environnement du serveur) :

```bash
# Build et lancement d'une image Docker
docker build -t mon-app . && docker run -d --rm -p 3000:3000 --name mon-app mon-app

# Redémarrage d'un process avec pm2
pm2 restart mon-app || pm2 start npm --name mon-app -- start

# Synchronisation vers un serveur distant
rsync -avz --delete ./dist/ user@serveur:/var/www/mon-app/
```

---

## 5. Points d'attention (sécurité)

Ce projet exécute **réellement** les commandes saisies par l'utilisateur sur
la machine hôte (`child_process.spawn` avec `shell: true`). C'est adapté à un
contexte pédagogique / démonstration locale, mais **avant un déploiement
ouvert au public**, il faudrait au minimum :

- restreindre/valider les commandes autorisées (liste blanche), ou exécuter
  chaque pipeline dans un **conteneur Docker isolé** (sandbox) ;
- limiter les permissions du processus Node (utilisateur non privilégié,
  filesystem restreint) ;
- ajouter une authentification sur l'API (actuellement ouverte) ;
- ajouter des quotas (nombre de pipelines simultanés, taille des logs, durée
  max — un timeout de 10 minutes par étape est déjà en place).

---

## 6. Pistes d'amélioration possibles

- Remplacer `data/deployments.json` par SQLite (`better-sqlite3`) pour gérer
  plusieurs exécutions concurrentes sans risque de corruption du fichier.
- Ajouter un **webhook GitHub** (`/api/webhooks/github`) pour déclencher le
  pipeline automatiquement sur chaque `push`.
- Gérer une **file d'attente** de pipelines (exécution séquentielle si
  plusieurs déclenchements arrivent en même temps).
- Ajouter un bouton **"Annuler"** pour tuer un pipeline en cours
  (`child.kill()` est déjà utilisé pour le timeout, il suffit de l'exposer).
- Authentification simple (token API) pour protéger `/api/pipelines/run`.
