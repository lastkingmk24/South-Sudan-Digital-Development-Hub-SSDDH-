# South Sudan Digital Development Hub (SSDDH)

**Founder: Mabruk Kei Ring**

An offline-first, AI-assisted citizen services platform: a verified services directory, community issue
reporting, and an information assistant that answers **only** from approved documents and cites them.

> **Demo data is synthetic.** Every facility and document created by the seed script is a fictional
> placeholder labelled `[DEMO]`. Nothing in this repository represents a real facility, government
> partnership or official approval. Real data must be entered and verified by authorised staff.

| Part | Folder | Stack |
|---|---|---|
| Backend API | `backend/` | Python FastAPI, SQLAlchemy, Alembic, PostgreSQL + PostGIS |
| Admin dashboard | `admin-dashboard/` | Next.js 14 + TypeScript |
| Android app | `mobile/` | Flutter / Dart, SQLite (sqflite) |
| AI assistant | `backend/app/services/rag.py` | RAG (BM25 retrieval) + optional local Ollama model |
| Infra | `docker-compose.yml` | Docker Compose (db, backend, admin, optional MinIO / Ollama) |
| Docs | `docs/` | API, architecture, security, deployment, troubleshooting |

## What is implemented

**Backend** – registration with consent, JWT login, bcrypt hashing, roles (citizen / moderator / admin),
TOTP multi-factor auth for staff, facility directory (search, filter, radius search, verify, soft delete),
community reports (idempotent create, approximate location, validated photo upload), moderation with
citizen notifications, knowledge document upload (PDF/TXT/MD) with admin approval, RAG assistant,
delta sync for offline clients, statistics, audit log, rate limiting, security headers,
account export / erasure, retention purge.

**Admin dashboard** – staff login (with MFA code), overview statistics, facility management, report
moderation, AI knowledge document management, user/role management, audit log, MFA enrolment.

**Android app** – registration/login with privacy consent, dashboard, offline service directory with
search/filter and freshness indicator, saved items, report drafting offline with photo + approximate
location, a persistent upload queue with retry/back-off and duplicate prevention, report tracking,
notifications, AI assistant with citations, data export and account deletion.

## Quick start (Windows 11)

### 1. Install prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (enable the WSL 2 backend) – required
- [Git for Windows](https://git-scm.com/download/win)
- For the mobile app: [Flutter SDK](https://docs.flutter.dev/get-started/install/windows/mobile) + Android Studio (Android SDK + an emulator)
- Optional for dashboard development without Docker: Node.js 20 LTS; for backend development without Docker: Python 3.12

### 2. Configure
Open **PowerShell** in the project folder:
```powershell
Copy-Item .env.example .env
notepad .env
```
Change at least `POSTGRES_PASSWORD` (and the same password inside `DATABASE_URL`), `SECRET_KEY`,
`BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`. Generate a secret key with:
```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 3. Start the platform
```powershell
docker compose up --build
```
The backend applies the database migrations and creates the bootstrap admin automatically.
- API: http://localhost:8000 (interactive docs at http://localhost:8000/docs)
- Admin dashboard: http://localhost:3000

Load the **synthetic demo data** (optional):
```powershell
docker compose exec backend python -m app.seed
```

Optional services:
```powershell
docker compose --profile ai up -d ollama          # local LLM runtime
docker compose exec ollama ollama pull llama3.2:3b
docker compose --profile minio up -d minio        # S3-compatible storage (also set S3_* in .env)
```
Without Ollama the assistant still works and returns the best-matching approved passages with citations.

### 4. First login
Sign in to http://localhost:3000 with the bootstrap admin, then open **My security** and enable MFA.

### 5. Run the Android app
```powershell
cd mobile
```
Follow [`mobile/android_manifest_additions.md`](mobile/android_manifest_additions.md) once (generates the Android
project and adds permissions), then:
```powershell
flutter pub get
flutter run                                   # Android emulator -> backend at http://10.0.2.2:8000
flutter run --dart-define=API_BASE=http://192.168.1.20:8000   # real phone on the same Wi-Fi (use your PC's IP)
```
Allow inbound port 8000 in Windows Firewall for a physical phone. Build an APK with `flutter build apk`.

### 6. Run the tests
```powershell
cd backend
python -m venv .venv ; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m pytest -q
```
Dashboard: `cd admin-dashboard; npm install; npm run typecheck; npm run build`.
Mobile: `cd mobile; flutter test`.

## Upload to GitHub
```powershell
git init
git add .
git commit -m "Initial commit: SSDDH"
git branch -M main
```
Create an **empty** repository named `ssddh-south-sudan-digital-development-hub` on github.com (no README/licence),
then:
```powershell
git remote add origin https://github.com/<your-username>/ssddh-south-sudan-digital-development-hub.git
git push -u origin main
```
`.env` is git-ignored – never commit real secrets. GitHub Actions (`.github/workflows/ci.yml`) then runs the
backend tests, dashboard build and Flutter analysis/tests automatically.

## Documentation
- [API reference](docs/API.md)
- [Architecture & offline sync](docs/ARCHITECTURE.md)
- [Security & privacy](docs/SECURITY.md)
- [Deployment & backups](docs/DEPLOYMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [External dependencies & safe dev alternatives](docs/DEPENDENCIES.md)

## Licence
MIT – see [LICENSE](LICENSE). Copyright (c) 2026 Mabruk Kei Ring.
