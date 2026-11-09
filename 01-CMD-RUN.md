# Running CMD 
```bash
# 1. Menjalankan MariaDB / MySQL (Port 3306)
# Pastikan Laragon / Service MariaDB sudah start.

# 2. Menjalankan Backend Go (Port 8081)
cd Project-APP-CCH-ke1/CCH-BE
.\api.exe

# 3. Menjalankan AI Engine Python (Port 8000)
cd Project-APP-CCH-ke1/CCH-AI-ENGINE
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# 4. Menjalankan Frontend Vite (Port 5173)
cd Project-APP-CCH-ke1/CCH-FE
npm run dev
```