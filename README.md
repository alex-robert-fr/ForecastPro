# ForecastPro

Application de gestion financière construite avec AdonisJS et Vue.js.

## Prérequis

- Node.js (v20 ou supérieur)
- Docker et Docker Compose (recommandé) OU PostgreSQL (v14 ou supérieur)
- npm ou yarn

## Installation

1. **Cloner le repository et installer les dépendances**
   ```bash
   npm install
   ```

2. **Configurer les variables d'environnement**
   ```bash
   cp .env.example .env
   ```

   Puis éditer le fichier `.env` et configurer :
   - `APP_KEY` : Générer une clé avec `node ace generate:key`

   Si tu utilises Docker (recommandé), les paramètres par défaut de `.env.example` sont déjà configurés correctement.

3. **Démarrer la base de données PostgreSQL avec Docker**
   ```bash
   docker compose up -d
   ```

   Vérifier que PostgreSQL est bien démarré :
   ```bash
   docker compose ps
   ```

   > **Alternative sans Docker** : Si tu préfères installer PostgreSQL manuellement, crée la base de données :
   > ```bash
   > psql -U postgres
   > CREATE DATABASE app;
   > \q
   > ```

4. **Exécuter les migrations**
   ```bash
   node ace migration:run
   ```

## Lancement du projet

### Mode développement
```bash
npm run dev
```
L'application sera accessible sur `http://localhost:3333`

### Mode production
```bash
# Construire l'application
npm run build

# Démarrer le serveur
npm start
```

## Scripts disponibles

### Application
- `npm run dev` - Lance le serveur en mode développement avec hot reload
- `npm run build` - Compile l'application pour la production
- `npm start` - Démarre le serveur en mode production
- `npm test` - Lance les tests
- `npm run lint` - Vérifie le code avec ESLint
- `npm run format` - Formate le code avec Prettier
- `npm run typecheck` - Vérifie les types TypeScript

### Base de données (Docker)
- `docker compose up -d` - Démarre PostgreSQL en arrière-plan
- `docker compose down` - Arrête PostgreSQL
- `docker compose logs -f postgres` - Affiche les logs PostgreSQL
- `docker compose restart postgres` - Redémarre PostgreSQL

## Stack technique

- **Backend** : AdonisJS v6
- **Frontend** : Vue.js 3 + Inertia.js
- **Base de données** : PostgreSQL
- **Styling** : Tailwind CSS v4
- **ORM** : Lucid (AdonisJS)

## Structure du projet

```
ForecastPro/
├── app/                # Code applicatif
│   ├── controllers/    # Contrôleurs
│   ├── models/         # Modèles de données
│   ├── services/       # Services métier
│   └── middleware/     # Middlewares
├── config/             # Fichiers de configuration
├── database/           # Migrations et seeders
├── inertia/            # Code Vue.js frontend
└── start/              # Fichiers de démarrage
```
