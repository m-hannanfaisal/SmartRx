# ⚕️ SmartRx — Polyglot Digital Prescription & Clinic Management System

[![Node.js](https://img.shields.io/badge/Node.js-v18.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v18.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-NoSQL-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Neo4j](https://img.shields.io/badge/Neo4j-GraphDB-008CC1?logo=neo4j&logoColor=white)](https://neo4j.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

SmartRx is an enterprise-grade, high-performance **Digital Prescription and Patient Management System** designed specifically for doctors. It streamlines clinical workflows by providing a single dashboard to manage patients, write prescriptions, view real-time smart medicine suggestions, chat with patients, and export beautifully branded PDF prescriptions. 

Under the hood, SmartRx demonstrates a **Polyglot Database Architecture**, leveraging the unique strengths of **four different database paradigms** working together in harmony to deliver speed, reliability, and analytical power.

---

## 🏗️ Polyglot Database Architecture

A single database engine is rarely optimal for every workload. SmartRx employs a tailored data storage strategy:

```mermaid
graph TD
    %% Define Databases and Styles
    PG[(PostgreSQL<br>Primary RDBMS)]
    RD[(Redis Cache<br>In-Memory)]
    MG[(MongoDB<br>NoSQL Document)]
    NJ[(Neo4j<br>Graph DB)]
    
    style PG fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    style RD fill:#ffebee,stroke:#d32f2f,stroke-width:2px;
    style MG fill:#e8f5e9,stroke:#388e3c,stroke-width:2px;
    style NJ fill:#e0f2f1,stroke:#00796b,stroke-width:2px;

    %% Flow Connections
    Client[React Client] -->|Express Router| API[NodeJS Express API]
    
    API -->|1. ACID Transactions| PG
    API -->|2. Fast Reads & Cache| RD
    API -->|3. Native Path Queries| NJ
    API -->|4. Unstructured Audits| MG

    %% Databases Data Types
    PG -.->|Doctors, Patients,<br>Prescriptions, Catalog| RelData[Relational Core]
    RD -.->|Frequently Read Catalog<br>Bypasses PG| CacheData[Fast Response]
    NJ -.->|CO_PRESCRIBED_WITH<br>Medicine Networks| GraphData[Native Cypher Paths]
    MG -.->|Activity Stream,<br>90-day TTL Expiry| DocData[Flexible JSON Schema]
```

### 1. PostgreSQL: The Transactional Core (ACID)
All core entities—**Doctors, Patients, Prescriptions, Medicines, and Treatment Templates**—are stored in PostgreSQL. It guarantees absolute consistency, strict foreign key integrity, and handles complex multi-row inserts using stored procedures.

### 2. Redis: High-Speed Cache (`ioredis`)
The entire medicine catalog is cached in Redis. The first fetch pulls from PostgreSQL and hydrates the cache (**Cache MISS**); subsequent requests are instantly fulfilled from memory (**Cache HIT**). This decreases latency from milliseconds to microseconds and safeguards the database against search congestion.

### 3. Neo4j: Native Network Relationships (`neo4j-driver`)
Natively stores co-prescription data. When multiple medicines are prescribed together in PostgreSQL, they are synchronized to Neo4j as `(:Medicine)` nodes connected by `[:CO_PRESCRIBED_WITH {frequency}]` edges. Relationships are traversed using native Cypher graph paths to trace multi-hop networks.

### 4. MongoDB: High-Write Audit Engine (`mongoose`)
Activity logs and audit trails (e.g., patient deletions, logouts, report viewings) are stored as flexible, schema-less BSON documents in MongoDB. Logs automatically expire after 90 days via a MongoDB Time-To-Live (TTL) index, preventing transactional database bloat.

---

## 🌟 Core Features & Live Functionalities

### 🩺 1. Smart Prescription Builder
*   **Atomic Multi-Item Insertion**: Uses a PostgreSQL stored procedure to insert the prescription header and all prescription items in a single, atomic database call inside an ACID transaction.
*   **Smart Suggestions**: Recommends co-prescribed drugs dynamically based on other selected medicines using association analysis.
*   **Branded PDF Export**: Generates professional, download-ready PDF prescriptions featuring doctor details, clinic letterheads, patient metadata, medicine instruction tables, and digital signatures.

### 📊 2. Interactive DB Diagnostics (Live Race Demos)
*   **Redis Caching Race**: A live visual race showing response times between PostgreSQL (miss path) and Redis (hit path) with a dynamic Recharts bar chart.
*   **Postgres State Machine Animator**: Animates a database connection's lifecycle (`IDLE` ➔ `ACTIVE` ➔ `IN TRANS` ➔ `IN ERROR` ➔ `IDLE`) with savepoints and error rollback recovery.
*   **Postgres ACID Simulation**: Triggers a live constraint violation to prove that PostgreSQL undoes the entire operation when a sub-item fails, leaving zero orphaned entries.
*   **MongoDB Pipeline Visualizer**: Demonstrates a live aggregation pipeline (`$match` ➔ `$group` ➔ `$sort` ➔ `$project`) to render audit event distribution graphs.

### 🕸️ 3. Dual-Engine Co-Prescription Graphs
Visualize how drugs are related across historical prescription data using two separate graph technologies:
1.  **PostgreSQL Recursive CTE Graph**: Traverses the relational database hierarchy up to 3 hops deep using recursive `WITH RECURSIVE` SQL queries.
2.  **Neo4j Graph Visualizer**: Traverses relationship networks natively using Cypher path matching (`MATCH (a)-[*1..2]-(b)`) with an interactive, force-directed SVG graph.

### 💬 4. Doctor-Patient Polling Chat
*   A dedicated, auto-refreshing message center where doctors can chat with patients.
*   Features unread message badges, relative timestamps, and automatic background thread updates.

---

## 🗄️ Database Schema & Structural Design

### Entity Relationship Model (PostgreSQL)

The relational engine runs a strict 8-table schema optimized with triggers, views, and index systems:

| Table Name | Description | Key Schema Elements |
| :--- | :--- | :--- |
| `doctors` | System users / accounts | Hashed passwords (`bcrypt`), clinic details, indexing on email. |
| `patients` | Doctor-scoped patient records | Foreign Key to `doctors`, age checks, GIN Trigram index. |
| `medicines` | Global medicine catalog | Tracked usage statistics, GIN Trigram index. |
| `diseases` | Diagnoses catalog | Unique constraints. |
| `disease_templates` | Predefined treatment templates | Foreign Keys to `doctors` & `diseases`. |
| `template_medicines` | Junction for template medicines | Compounded Unique Constraint, `CHECK` constraints on dosages. |
| `prescriptions` | Prescription headers | Foreign Keys to `patients` & `doctors`, date indexing. |
| `prescription_items` | Junction for prescription medicines | Foreign Keys to `prescriptions` & `medicines`. |

### Database Optimizations & Logic

#### 1. Fuzzy Search GIN Indexes
To enable instantaneous auto-complete on patients and medicines without resource-heavy database queries:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_patients_name_trgm ON patients USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_medicines_name_trgm ON medicines USING GIN (name gin_trgm_ops);
```

#### 2. Advanced DB Triggers
*   **Increment Usage Count**: Automatically updates medicine popularity stats when a prescription item is added:
    ```sql
    CREATE OR REPLACE FUNCTION increment_medicine_usage() RETURNS TRIGGER AS $$
    BEGIN
      UPDATE medicines SET usage_count = usage_count + 1 WHERE id = NEW.medicine_id;
      RETURN NEW;
    END; $$ LANGUAGE plpgsql;
    
    CREATE TRIGGER trg_increment_usage AFTER INSERT ON prescription_items
    FOR EACH ROW EXECUTE FUNCTION increment_medicine_usage();
    ```
*   **Automatic Display ID Generation**: Formats new patient IDs automatically as `P-1001`, `P-1002`, etc., avoiding sequential integer exposure.

#### 3. Stored Procedures
*   `create_prescription_with_items(...)`: Ensures a database transaction commits all items or rolls back completely (Atomicity).
*   `get_smart_suggestions(medicine_ids[], limit)`: Calculates co-prescription frequency across all historical prescriptions to yield real-time recommendations.

#### 4. Views
*   `v_top_medicines`: Fetches catalog drugs ordered by prescription popularity.
*   `v_recent_prescriptions`: Simplifies querying prescriptions issued in the last 30 days along with patient and doctor details.

---

## 🛠️ API Reference

All routes except `/api/auth/register` and `/api/auth/login` require an `Authorization: Bearer <JWT_Token>` header.

### Authentication & Profile
*   `POST /api/auth/register` - Registers a new doctor account.
*   `POST /api/auth/login` - Authenticates credentials and returns a JWT.
*   `GET /api/auth/me` - Resolves details of the currently logged-in doctor.

### Patients & Prescriptions
*   `GET /api/patients?q=search` - Queries patients (supports fuzzy search filtering).
*   `POST /api/patients` - Creates a new patient record.
*   `PUT /api/patients/:id` - Updates patient demographic details.
*   `POST /api/prescriptions` - Calls the atomic stored procedure to create a prescription.
*   `GET /api/prescriptions/:id` - Retrieves a detailed prescription with items.

### Analytical & Advanced DB Demos
*   `GET /api/medicines/:id/graph?depth=3` - Executes PostgreSQL recursive CTE graph traversal.
*   `GET /api/transactions/states` - Runs the PostgreSQL connection state machine demo.
*   `POST /api/transactions/acid-demo` - Simulates PostgreSQL atomicity, consistency, and rollbacks.
*   `GET /api/neo4j/status` - Checks BOLT driver connectivity status.
*   `POST /api/neo4j/sync` - Imports co-prescription weights from Postgres to Neo4j.
*   `GET /api/neo4j/graph/:id` - Executes Neo4j Cypher path query.
*   `GET /api/logs` - Retrieves audit logs from MongoDB.
*   `GET /api/logs/stats` - Runs a MongoDB aggregation pipeline on audit events.

---

## 🚀 Getting Started

Follow these instructions to configure and run the project locally on Windows.

### Prerequisites
1.  **Node.js (v18+)**
2.  **PostgreSQL (v15+)** (with pgAdmin 4 installed)
3.  **Redis Server** (Local or cloud instance)
4.  **MongoDB Community Edition** (Optional - bypassable)
5.  **Neo4j Desktop** (Optional - bypassable)

---

### Step 1: Clone & Initialize the Database

1.  Create a database in PostgreSQL named `smartrx`:
    ```powershell
    # Connect using psql and create database
    psql -U postgres -c "CREATE DATABASE smartrx;"
    ```
2.  Import the schema:
    ```powershell
    psql -U postgres -d smartrx -f schema.sql
    ```

---

### Step 2: Configure Environment Variables

Create a `.env` file in the `server/` directory:

```env
PORT=3001
DATABASE_URL=postgresql://postgres:YOUR_PG_PASSWORD@localhost:5432/smartrx
JWT_SECRET=super_secret_session_token_key_here
JWT_EXPIRES_IN=7d

# Caching (Redis)
REDIS_URL=redis://127.0.0.1:6379

# Audit Logging (MongoDB - Optional)
MONGO_URI=mongodb://localhost:27017/smartrx_logs

# Graph Networking (Neo4j - Optional)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password
```

Create a `.env` file in the project root (Frontend):

```env
VITE_API_URL=http://localhost:3001
```

---

### Step 3: Install Dependencies

```powershell
# Install server dependencies
cd server
npm install

# Install client dependencies (from root folder)
cd ..
npm install
```

---

### Step 4: Run the Application

You will need two terminal windows open:

#### Terminal 1: Backend Server
```powershell
cd server
npm run dev
```
Confirm the console output:
`✅ SmartRx API running on http://localhost:3001`

#### Terminal 2: Frontend Client
```powershell
npm run dev
```
Confirm the console output:
`➜ Local: http://localhost:8080/`

Open **http://localhost:8080** in your browser, click **Sign Up** to create your doctor account, and log in!

---

## 🔍 Troubleshooting & Recovery

*   **Database connection fails (`ECONNREFUSED` / `5432`)**:
    Ensure the PostgreSQL database service is active. On Windows, press `Win + R`, type `services.msc`, locate `postgresql-x64-15` (or your version), and click **Start**.
*   **Redis not running**:
    If Redis is unreachable, the server will log a warning and fallback directly to PostgreSQL queries. This keeps the application fully functional while bypassed.
*   **Relation does not exist**:
    Ensure you ran the `schema.sql` database initialization script inside the `smartrx` database, not the default `postgres` database.
*   **Port 3001 is already in use**:
    Change the `PORT` variable in `server/.env` to `3002`, and update `VITE_API_URL=http://localhost:3002` in your root `.env` file.
