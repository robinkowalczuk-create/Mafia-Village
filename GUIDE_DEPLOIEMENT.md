# 🐺 Mafia Village — Guide de déploiement

## Stack
- **Frontend** : React + Vite + Tailwind CSS
- **Base de données** : Supabase (PostgreSQL + Realtime)
- **Déploiement** : Vercel
- **Repo** : GitHub

---

## Étape 1 — Supabase

### 1.1 Créer le projet
1. Va sur [supabase.com](https://supabase.com) → **New Project**
2. Nom : `mafia-village`, choisis une région proche (ex: `eu-west-1`)
3. Génère un mot de passe fort et note-le

### 1.2 Créer les tables
1. **SQL Editor** → **New Query**
2. Colle le contenu de `supabase_schema.sql`
3. Clique **Run** (▶)

### 1.3 Récupérer les clés API
1. **Settings** → **API**
2. Note :
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

> ⚠️ N'utilise jamais la `service_role` key en frontend !

### 1.4 Vérifier le Realtime
1. **Database** → **Replication**
2. Vérifie que les tables `games`, `players`, `actions`, `votes` sont cochées dans **Source**

---

## Étape 2 — GitHub

### 2.1 Créer le repo
1. [github.com/new](https://github.com/new) → `mafia-village` (privé ou public)

### 2.2 Uploader les fichiers
Option A — Interface web GitHub :
1. **Add file** → **Upload files**
2. Glisse tout le dossier `mafia-village/`

Option B — Terminal :
```bash
cd mafia-village
git init
git remote add origin https://github.com/TON_COMPTE/mafia-village.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

---

## Étape 3 — Vercel

### 3.1 Importer le projet
1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**
2. Sélectionne `mafia-village`
3. **Framework Preset** → `Vite` (détecté automatiquement)

### 3.2 Variables d'environnement
Dans **Environment Variables**, ajoute :

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://xxxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbG...` |

### 3.3 Déployer
Clique **Deploy** → ton app sera disponible sur `https://mafia-village-xxx.vercel.app`

---

## Étape 4 — Test local

```bash
cd mafia-village
cp .env.example .env.local
# Remplis .env.local avec tes vraies clés Supabase

npm install
npm run dev
```

Ouvre `http://localhost:5173` sur ton téléphone (même réseau Wi-Fi) ou partage via ngrok.

---

## Structure des fichiers

```
mafia-village/
├── src/
│   ├── lib/
│   │   ├── supabase.js      # Client Supabase
│   │   ├── constants.js     # Rôles, phases, compositions
│   │   ├── gameUtils.js     # Attribution rôles, victoire, votes
│   │   └── sounds.js        # Web Audio API (sons procéduraux)
│   ├── hooks/
│   │   ├── useGame.js       # Realtime subscription game
│   │   ├── usePlayers.js    # Realtime subscription players
│   │   ├── useVotes.js      # Realtime subscription votes
│   │   └── useActions.js    # Realtime subscription actions
│   ├── components/
│   │   ├── ui/              # Button, CountdownTimer, PhaseOverlay
│   │   └── screens/         # HomeScreen → VictoryScreen
│   ├── App.jsx              # Routeur de phases
│   ├── main.jsx
│   └── index.css            # Tailwind + animations
├── supabase_schema.sql      # Script SQL complet
├── .env.example
└── index.html
```

---

## Rôles disponibles (4–12 joueurs)

| Joueurs | Composition |
|---------|------------|
| 4 | 1 Villageois · 1 Loup · 1 Voyante · 1 Sorcière |
| 5 | 2 Villageois · 1 Loup · 1 Voyante · 1 Sorcière |
| 6 | 2 Villageois · 1 Loup · 1 Voyante · 1 Sorcière · 1 Chasseur |
| 7 | 2 Villageois · 2 Loups · 1 Voyante · 1 Sorcière · 1 Chasseur |
| 8 | 3 Villageois · 2 Loups · 1 Voyante · 1 Sorcière · 1 Chasseur |
| 9 | + Cupidon |
| 10 | + Garde du Corps |
| 11 | 3 Villageois · 3 Loups · ... |
| 12 | + Petite Fille |

---

## Dépannage fréquent

**"Missing Supabase environment variables"**
→ Vérifie que `.env.local` existe et que les variables commencent bien par `VITE_`

**Realtime ne fonctionne pas**
→ Vérifie dans Supabase > Database > Replication que les 4 tables sont activées

**"Partie introuvable"**
→ Le code est case-sensitive côté DB. L'app force le uppercase automatiquement.

**Joueur déconnecté et veut reprendre**
→ Le `player_id` est stocké en `sessionStorage`. Il persiste dans l'onglet mais pas entre navigateurs.
