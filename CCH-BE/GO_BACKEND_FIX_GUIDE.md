# 🔧 GO BACKEND FIX GUIDE - Step by Step
**Created**: October 14, 2026  
**By**: Mama Anita (Professor) 💋✨  
**Goal**: Fix database connection & enable login functionality

---

## 📊 PROBLEM DIAGNOSIS

### **ROOT CAUSE IDENTIFIED**: ✅

1. **.env file loading WORKS** but database user `cch_be` **DOES NOT EXIST** in MySQL
2. Current `.env` uses:
   ```env
   CCH_DB_USER=cch_be
   CCH_DB_PASSWORD=cch_dev_2026
   ```
3. But Laragon MySQL default user is `root` with empty password!

### **SOLUTION**: 
We have 2 options:

**OPTION A**: Use Laragon default (RECOMMENDED for quick win!) ⭐⭐⭐⭐⭐
- Update `.env` to use `root` user
- No MySQL user creation needed
- Works immediately!

**OPTION B**: Create dedicated `cch_be` user (PRODUCTION-LIKE)
- Create MySQL user `cch_be`
- Keep `.env` as-is
- More secure, better for production prep

---

## 🚀 SOLUTION A: QUICK FIX (RECOMMENDED!)

### **STEP 1: Update .env file**

Change database credentials from:
```env
CCH_DB_USER=cch_be
CCH_DB_PASSWORD=cch_dev_2026
```

To Laragon defaults:
```env
CCH_DB_USER=root
CCH_DB_PASSWORD=
```

### **STEP 2: Test the connection**

```bash
cd c:\laragon\www\cch\Project-APP-CCH-ke1\CCH-BE

# Run the Go backend
go run ./cmd/api

# Expected output:
# 2026/10/14 ... load .env: <nil>
# 2026/10/14 ... CCH backend listening on :8081
```

### **STEP 3: Test health endpoints**

Open browser or use curl:
```bash
# Liveness check
curl http://localhost:8081/healthz

# Expected: HTTP 200 OK

# Readiness check
curl http://localhost:8081/readyz

# Expected: HTTP 200 OK (if MySQL connected)
```

---

## 🔐 SOLUTION B: PRODUCTION-LIKE (SECURE)

### **STEP 1: Create MySQL user**

Open Laragon → MySQL → mysql.exe (or use HeidiSQL):

```sql
-- Create user
CREATE USER 'cch_be'@'localhost' IDENTIFIED BY 'cch_dev_2026';

-- Grant privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON cch.* TO 'cch_be'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Test login
quit;
```

Test manually:
```bash
mysql -u cch_be -p
# Enter password: cch_dev_2026

# If success, you'll see:
# mysql>

# Then type:
USE cch;
SHOW TABLES;
quit;
```

### **STEP 2: Keep .env as-is**

`.env` already has correct config:
```env
CCH_DB_USER=cch_be
CCH_DB_PASSWORD=cch_dev_2026
```

### **STEP 3: Test the connection**

Same as Solution A Step 2-3!

---

## 🎯 AFTER DATABASE FIX: ENABLE LOGIN

### **ISSUE**: 
Login/Register API is **DISABLED** by default!

### **FIX**: 
Enable DevAuth feature flag in `.env`:

```env
# Add these lines to .env:
CCH_ENABLE_DEV_AUTH_API=true
CCH_DEV_AUTH_OFFICE=40005CC
CCH_DEV_AUTH_ROLE=CS Officer
CCH_DEV_AUTH_ALLOWED_OFFICES=40005CC,40000
```

### **What is DevAuth?**
- Development-only authentication API
- Bypasses legacy PHP login
- Creates JWT tokens for testing
- **NOT FOR PRODUCTION!**

---

## 🧪 TESTING THE FIX

### **1. Health Checks**
```bash
curl http://localhost:8081/healthz
# Expected: 200 OK

curl http://localhost:8081/readyz
# Expected: 200 OK
```

### **2. DevAuth Login** (after enabling)
```bash
curl -X POST http://localhost:8081/v1/dev/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "pilot.dev",
    "office": "40005CC"
  }'

# Expected response:
{
  "token": "eyJhbGc...",
  "user": {
    "username": "pilot.dev",
    "office": "40005CC",
    "role": "CS Officer"
  }
}
```

### **3. Protected API** (using token from step 2)
```bash
curl http://localhost:8081/v1/complaints \
  -H "Authorization: Bearer eyJhbGc..."

# Expected: List of complaints (if API enabled)
```

---

## 📋 CHECKLIST

### **Phase 1: Database Connection** ✅
- [ ] Choose Solution A or B
- [ ] Update `.env` OR create MySQL user
- [ ] Run `go run ./cmd/api`
- [ ] Test `/healthz` endpoint
- [ ] Test `/readyz` endpoint
- [ ] Verify "CCH backend listening on :8081" log

### **Phase 2: Enable Features** ✅
- [ ] Enable DevAuth in `.env`
- [ ] Restart Go backend
- [ ] Test `/v1/dev/login` endpoint
- [ ] Verify JWT token received
- [ ] Test protected API with token

### **Phase 3: React Frontend Integration** ✅
- [ ] Update React `.env` with `VITE_API_URL=http://localhost:8081`
- [ ] Test login from React UI
- [ ] Test dashboard API calls
- [ ] Verify complaint list loads

---

## 🚨 TROUBLESHOOTING

### **Problem**: "MySQL is not configured"
**Solution**: Check `.env` file exists in `CCH-BE/` directory

### **Problem**: "configure MySQL connection: dial tcp ... connection refused"
**Solution**: 
- Ensure Laragon MySQL is running
- Check MySQL port (default 3306)
- Verify credentials in `.env`

### **Problem**: "Access denied for user 'cch_be'@'localhost'"
**Solution**: 
- User doesn't exist → Use Solution A (root user)
- OR create user with Solution B

### **Problem**: "Call Center complaint read routes are disabled"
**Solution**: 
- Feature flags are OFF by default
- Enable in `.env`: `CCH_ENABLE_CALL_CENTER_COMPLAINT_READ_API=true`
- Restart backend

### **Problem**: "unknown revision cch.local/backend"
**Solution**:
```bash
cd c:\laragon\www\cch\Project-APP-CCH-ke1\CCH-BE
go mod tidy
go run ./cmd/api
```

---

## 💡 MAMA'S RECOMMENDATIONS

### **FOR TODAY (Quick Win):**
Use **SOLUTION A** - It's fastest! ⚡
- Just change `.env` to use `root` user
- No MySQL user creation needed
- Works in 30 seconds!

### **FOR THIS WEEK (Production Prep):**
Migrate to **SOLUTION B** - More secure! 🔐
- Create dedicated `cch_be` user
- Limit permissions (no DROP, no CREATE)
- Closer to production setup

### **FOR NEXT WEEK (Full Features):**
Enable all API endpoints! 🚀
- Review feature flags in `.env`
- Enable APIs Frontend needs
- Test end-to-end workflows

---

## 📞 NEXT STEPS AFTER FIX

### **1. React Frontend Connection**
Update `CCH-FE/.env`:
```env
VITE_API_BASE_URL=http://localhost:8081
VITE_API_VERSION=v1
```

### **2. Test Login Flow**
1. Start Go Backend: `go run ./cmd/api`
2. Start React Frontend: `npm run dev`
3. Open http://localhost:5173
4. Test login with `pilot.dev` / `40005CC`

### **3. Dashboard Integration**
- Verify complaint API calls work
- Check stats counters load
- Test filtering & search
- Verify navigation works

---

## ✅ SUCCESS CRITERIA

You'll know it's working when:
- ✅ Go backend starts without MySQL errors
- ✅ `/healthz` returns 200 OK
- ✅ `/readyz` returns 200 OK (not 503)
- ✅ DevAuth login returns JWT token
- ✅ React frontend can call backend APIs
- ✅ Dashboard loads with real data
- ✅ Login/Register pages functional

---

**STATUS**: Ready to implement! 🔥  
**ESTIMATED TIME**: 30 minutes - 1 hour  
**DIFFICULTY**: Low ⭐⭐  
**IMPACT**: High! Unblocks entire Go/React stack! 🚀  

---

**MAMA'S NOTE**: Sayangku, pilih Solution A dulu untuk quick win! Nanti kalau sudah jalan, kita upgrade ke Solution B untuk production readiness! 😘💕

**LET'S DO THIS!** 💪✨
