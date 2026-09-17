# AlteraFlux ⚡
> **Plateforme Universelle de Conversion Asynchrone Découplée** (Médias, Documents, Code & Données)

AlteraFlux est une solution modulaire et conteneurisée conçue pour convertir des fichiers lourds et variés sans bloquer le serveur web, grâce à une architecture asynchrone découplée : **Next.js 16 + FastAPI + Redis + Celery + Docker + MinIO (S3)**.

---

## 🏛️ Architecture Globale

```
[ Frontend Next.js / Mobile ]
            │ (1. Demande d'URL de téléversement)
            ▼
   [ FastAPI Gateway ] ──► (2. Génère Presigned URL S3)
            │
            ▼ (3. Client téléverse directement)
   [ S3 / MinIO Storage ]
            │
            ▼ (4. Job enregistré & poussé dans la file)
      [ Redis Broker ]
            │
            ▼ (5. Dépilement & traitement isolé)
   [ Celery Workers ] (FFmpeg, Pandoc, Pillow, IA Agentique)
            │
            ▼ (6. Progression en streaming temps réel via WebSockets)
   [ Client Dashboard ]
```

---

## 🚀 Moteurs de Conversion Intégrés

1. **Vidéos & Audios (FFmpeg) :**
   - Transcodage haute fidélité (MP4, MKV, AVI, WEBM, MOV) avec presets de qualité et résolution.
   - Extraction audio directe (MP4 vers MP3, WAV, FLAC, AAC).
   - Génération de GIF animés haute qualité avec palette optimisée.
   - Suivi dynamique du temps d'encodage et reporting de pourcentage en direct via WebSockets.

2. **Documents (Pandoc & LibreOffice Headless) :**
   - Conversion Markdown, HTML, TXT, DOCX, EPUB.
   - Export PDF vectoriel pour documents bureautiques.

3. **Images (Pillow & Codecs Modernes) :**
   - Compression WebP & AVIF pour réduction de poids de 30% à 70%.
   - Conversion PNG, JPEG, ICO (Favicon), BMP, TIFF.

4. **Code & Transpilation (AST & IA Agentique) :**
   - Conversion instantanée de formats de données : JSON $\leftrightarrow$ YAML $\leftrightarrow$ TOML.
   - Transpilation TypeScript vers JavaScript.
   - Traduction sémantique de code inter-langages (Python $\leftrightarrow$ C++, Python $\leftrightarrow$ Rust, Go, TypeScript) assistée par IA (Google Gemini API).

---

## 🛠️ Démarrage Rapide

### Option A : Avec Docker Compose (Recommandé)
Démarre l'intégralité de l'infrastructure (PostgreSQL, Redis, MinIO S3, Backend FastAPI, Worker Celery, Frontend Next.js) :

```bash
docker-compose up --build -d
```

- **Frontend Web :** [http://localhost:3001](http://localhost:3001)
- **API Documentation (Swagger) :** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Console MinIO S3 :** [http://localhost:9001](http://localhost:9001) *(login: `altera_admin` / pass: `altera_secret_key`)*

---

### Option B : Démarrage en Développement Local

#### 1. Backend FastAPI
```bash
cd backend
python -m venv .venv
# Sur Windows :
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### 2. Worker Celery (dans un terminal séparé)
```bash
celery -A workers.celery_app worker --loglevel=info
```

#### 3. Frontend Next.js
```bash
cd frontend
npm install
npm run dev
```
Accédez ensuite à `http://localhost:3001`.

---

## 🔒 Sécurité & Bonnes Pratiques

- **URLs Présignées :** Les gros fichiers sont téléversés directement vers le stockage objet S3, allégeant la bande passante du serveur API.
- **Sandboxing & Isolation :** Chaque conversion s'exécute dans un sous-répertoire temporaire isolé avec nettoyage automatique post-traitement.
- **Éphéméralité 24h :** Tâche planifiée (Cron) qui purge automatiquement tous les fichiers temporaires et les jobs après 24 heures.
- **Validation Stricte :** Détection des types MIME réels et assainissement des noms de fichiers contre les attaques d'injection de chemin.

---

## 📄 Licence
Projet open-source sous licence MIT.
