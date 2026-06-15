# SmartRx — Digital Prescription System

A full-stack web application for doctors to manage patients, write prescriptions, and track medicines.

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Backend  | Node.js + Express.js REST API |
| Database | PostgreSQL (local) |
| Auth     | JWT (jsonwebtoken) + bcrypt |
| PDF      | jsPDF + jspdf-autotable |

---

## Prerequisites

Install the following tools on Windows before starting:

1. **Node.js 18+** — https://nodejs.org  
   Verify: `node -v` and `npm -v`

2. **PostgreSQL 15+** — https://www.postgresql.org/download/windows/  
   During installation set a password for the `postgres` user — you will need it.  
   Also install **pgAdmin 4** (bundled with the installer).

---

## Step 1 — Create the Database

### Option A: pgAdmin 4 (GUI)
1. Open **pgAdmin 4** and connect to your local server.
2. Right-click **Databases → Create → Database**.
3. Name it `smartrx`, click **Save**.
4. Select the `smartrx` database, click the **Query Tool** (toolbar).
5. Open `schema.sql` from this project folder (File → Open).
6. Click **Execute / Run** (▶).

### Option B: psql (Command Line)
Open **PowerShell** or **Command Prompt**:

```powershell
# Create the database
psql -U postgres -c "CREATE DATABASE smartrx;"

# Run the schema
psql -U postgres -d smartrx -f schema.sql
```

You will be prompted for the `postgres` password each time.

---

## Step 2 — Configure the Backend

```powershell
cd server
copy .env.example .env
notepad .env
```

Edit `.env` with your values:

```
PORT=3001
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/smartrx
JWT_SECRET=pick_a_long_random_string_here
JWT_EXPIRES_IN=7d
```

Replace `YOUR_PASSWORD` with the PostgreSQL password you set during installation.

---

## Step 3 — Install Dependencies

### Backend
```powershell
cd server
npm install
```

### Frontend (from the root project folder)
```powershell
cd ..
npm install
```

---

## Step 4 — Run the Application

You need **two terminal windows** running simultaneously.

### Terminal 1 — Start the API server
```powershell
cd server
node index.js
```

You should see:
```
✅  SmartRx API server running on http://localhost:3001
    Health check: http://localhost:3001/api/health
```

### Terminal 2 — Start the Frontend
```powershell
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:8080/
```

Open **http://localhost:8080** in your browser.

---

## Step 5 — Create Your Account

1. Go to http://localhost:8080
2. Click **Sign Up**
3. Fill in your name, clinic name, specialization, email, and password
4. Click **Create Account**
5. Switch to **Sign In** and log in with the same credentials

---

## Project Structure

```
smartrx/
├── schema.sql                  ← Run this in PostgreSQL FIRST
├── package.json                ← Frontend dependencies
├── vite.config.ts              ← Vite config with /api proxy
├── .env                        ← Frontend env (VITE_API_URL)
│
├── server/                     ← Express.js backend
│   ├── index.js                ← Entry point: node server/index.js
│   ├── db.js                   ← PostgreSQL pool (pg library)
│   ├── package.json            ← Backend dependencies
│   ├── .env.example            ← Copy to .env and fill in
│   ├── middleware/
│   │   └── auth.js             ← JWT verification
│   └── routes/
│       ├── auth.js             ← POST /api/auth/register, /login, GET /me
│       ├── patients.js         ← CRUD /api/patients
│       ├── prescriptions.js    ← GET, POST /api/prescriptions
│       ├── medicines.js        ← GET, POST /api/medicines, POST /suggestions
│       ├── diseases.js         ← GET, POST /api/diseases
│       ├── templates.js        ← GET, POST, DELETE /api/templates
│       └── dashboard.js        ← GET /api/dashboard/stats, /top-medicines
│
└── src/                        ← React frontend
    ├── hooks/
    │   └── useAuth.tsx         ← JWT stored in localStorage
    ├── lib/
    │   ├── api.ts              ← Base fetch() helper with auth headers
    │   ├── store.ts            ← All API calls (replaces Supabase)
    │   ├── types.ts            ← TypeScript interfaces
    │   └── pdf.ts              ← PDF generation (unchanged)
    ├── components/
    │   ├── AppSidebar.tsx      ← Navigation sidebar
    │   └── DashboardLayout.tsx ← Auth-guarded layout
    └── pages/                  ← All page components (unchanged)
```

---

## API Reference

All routes except `/api/auth/register` and `/api/auth/login` require:
```
Authorization: Bearer <token>
```

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create doctor account |
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/auth/me | Current doctor profile |
| GET | /api/patients | List patients (supports `?q=search`) |
| GET | /api/patients/:id | Get single patient |
| POST | /api/patients | Add patient |
| PUT | /api/patients/:id | Update patient |
| DELETE | /api/patients/:id | Delete patient |
| GET | /api/prescriptions | All prescriptions (`?patientId=` to filter) |
| GET | /api/prescriptions/:id | Single prescription with items |
| POST | /api/prescriptions | Create prescription (calls stored procedure) |
| GET | /api/medicines | All medicines (`?q=search`) |
| POST | /api/medicines | Add medicine |
| POST | /api/medicines/suggestions | Co-prescription suggestions (stored proc) |
| GET | /api/diseases | All diseases |
| POST | /api/diseases | Add disease |
| GET | /api/templates | All templates with medicines |
| POST | /api/templates | Create template |
| DELETE | /api/templates/:id | Delete template |
| GET | /api/dashboard/stats | Patient/prescription/medicine counts |
| GET | /api/dashboard/top-medicines | Top medicines by usage (stored proc) |

---

## Database Design (CS 236 ADBMS)

### Tables (8)
- `doctors` — user accounts with bcrypt-hashed passwords
- `patients` — doctor-scoped patient records
- `medicines` — shared drug catalog
- `diseases` — disease/condition catalog
- `disease_templates` — named treatment templates per disease
- `template_medicines` — junction: templates ↔ medicines
- `prescriptions` — prescription header
- `prescription_items` — junction: prescriptions ↔ medicines

### Indexes (10)
- B-tree indexes on all foreign keys and frequently-queried columns
- GIN trigram indexes on `patients.name` and `medicines.name` (fuzzy search)
- Descending index on `medicines.usage_count`

### Triggers (6)
1. `trg_doctors_updated` — auto-updates `updated_at` on doctors
2. `trg_patients_updated` — auto-updates `updated_at` on patients
3. `trg_medicines_updated` — auto-updates `updated_at` on medicines
4. `trg_increment_usage` — increments `medicines.usage_count` on every prescription item insert
5. `trg_patient_display_id` — auto-generates `P-1001`, `P-1002`… display IDs
6. (Implicit) CASCADE deletes propagated via FK constraints

### Stored Procedures (3)
- `create_prescription_with_items(...)` — atomic ACID transaction: inserts prescription + all items in one call
- `get_smart_suggestions(medicine_ids[], limit)` — co-prescription frequency analysis
- `get_top_medicines(limit)` — returns top medicines by usage count

### Views (3)
- `v_top_medicines` — medicines ordered by usage
- `v_patient_visit_frequency` — visit counts per patient
- `v_recent_prescriptions` — prescriptions from the last 30 days with joins

---

## Troubleshooting

**"ECONNREFUSED" / Cannot connect to database**  
→ Make sure PostgreSQL service is running. Open **Services** (Win+R → `services.msc`) and start `postgresql-x64-15`.

**"password authentication failed"**  
→ Double-check the password in `server/.env` matches what you set during PostgreSQL installation.

**"relation does not exist"**  
→ You haven't run `schema.sql` yet, or ran it against the wrong database.

**Frontend shows blank / 401 errors**  
→ Make sure the Express server is running (`node server/index.js`) before opening the frontend.

**Port 3001 already in use**  
→ Change `PORT=3002` in `server/.env` and `VITE_API_URL=http://localhost:3002` in `.env`.
