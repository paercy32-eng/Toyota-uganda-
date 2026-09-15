# 🚗 Toyota Uganda Investment Platform

A modern, mobile-first investment platform where users invest in Toyota vehicles and earn daily returns. Powered by **Supabase** for permanent data storage.

---

## ✨ Features

- **User Authentication** — Register & login with phone number + password (Supabase-backed)
- **10 Toyota Products** — From Yaris (10K UGX) to Land Cruiser (500K UGX)
- **100-Day Investment Cycle** — Daily profits auto-credited
- **3-Level Referral System** — 20% / 2% / 1% commission
- **Deposit Flow** — Bank A / Bank B with transaction ID verification
- **Withdrawal Flow** — 12% fee, minimum 4,000 UGX, admin approval
- **Admin Panel** — Approve/reject transactions, block users, view metrics
- **WhatsApp Group** — Direct community link
- **Permanent Storage** — Supabase PostgreSQL database

---

## 📁 Project Structure

```
toyota-uganda/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── package.json
├── server.js
├── .env.example
└── README.md
```

---

## 🚀 Supabase Setup (Step-by-Step)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **"New Project"**
3. Enter project name: `toyota-uganda`
4. Set a **database password** (save this!)
5. Choose a region closest to you
6. Click **"Create new project"** (takes ~2 minutes)

### Step 2: Create Database Tables

1. In your Supabase project, click **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy and paste the following SQL, then click **Run**:

```sql
-- ==================== USERS TABLE ====================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  ref_code VARCHAR(10) UNIQUE NOT NULL,
  referred_by VARCHAR(10),
  balance INTEGER DEFAULT 3000,
  total_invested INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 3000,
  referral_earnings INTEGER DEFAULT 0,
  blocked BOOLEAN DEFAULT false,
  role VARCHAR(10) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT now()
);

-- ==================== DEPOSITS TABLE ====================
CREATE TABLE deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT,
  amount INTEGER NOT NULL,
  bank VARCHAR(2),
  tx_id TEXT,
  tx_phone TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);

-- ==================== WITHDRAWALS TABLE ====================
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT,
  amount INTEGER NOT NULL,
  net_amount INTEGER,
  fee INTEGER,
  phone TEXT,
  name TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);

-- ==================== INVESTMENTS TABLE ====================
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL,
  plan_name TEXT,
  product_name TEXT,
  amount INTEGER,
  daily_earning INTEGER,
  start_date TIMESTAMP DEFAULT now(),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, plan_id)
);

-- ==================== INDEXES ====================
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_ref_code ON users(ref_code);
CREATE INDEX idx_deposits_user_id ON deposits(user_id);
CREATE INDEX idx_deposits_status ON deposits(status);
CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_investments_user_id ON investments(user_id);
```

### Step 3: Get API Credentials

1. In Supabase, go to **Settings** (gear icon) → **API**
2. Copy the **Project URL** (looks like `https://xxxxx.supabase.co`)
3. Copy the **anon public** key (long string starting with `eyJ...`)

### Step 4: Add Credentials to Your Code

Open `public/script.js` and replace:

```javascript
const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';
```

With your actual values:

```javascript
const SUPABASE_URL = 'https://abcdefghijklm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### Step 5: Run Locally

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open http://localhost:3000
```

---

## 🌐 Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Import Project**
3. Select your GitHub repo
4. Set **Root Directory** = `public`
5. Click **Deploy**
6. Your site is live! 🎉

---

## 🔑 Admin Login

| Field    | Value           |
|----------|-----------------|
| Phone    | `0705371032`    |
| Password | `kauthara0909`  |

After logging in with these credentials, you'll be redirected to the **Admin Panel** automatically.

---

## 💰 Bank Details (for deposits)

**Bank A**
- Number: `0705371032`
- Name: Ronald Lubwama

**Bank B**
- Number: `0731402668`
- Name: Nabirye Suzan

---

## 📊 Business Rules

| Item                 | Value        |
|----------------------|--------------|
| Registration Bonus   | 3,000 UGX    |
| Minimum Deposit      | 10,000 UGX   |
| Minimum Withdrawal   | 4,000 UGX    |
| Withdrawal Fee       | 12%          |
| Referral Level 1     | 20%          |
| Referral Level 2     | 2%           |
| Referral Level 3     | 1%           |
| Daily Credit Time    | 00:00 AM     |

---

## 🔒 Security Notes

### For Production:

1. **Never store passwords in plain text** — use Supabase Auth or bcrypt hashing on a Node backend
2. **Never expose the anon key with write access** — use Row Level Security (RLS) policies
3. **Move daily earnings to a Supabase Edge Function** with `pg_cron` instead of client-side timer
4. **Add rate limiting** on auth endpoints
5. **Enable RLS** on all tables:

```sql
-- Example: Users can only read their own data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

---

## 📞 Support

Join the WhatsApp group:
[https://chat.whatsapp.com/EoaIhrkXUkCHh4BYbXWc8y](https://chat.whatsapp.com/EoaIhrkXUkCHh4BYbXWc8y?s=cl&p=a&mlu=4&ilr=4)

---

© 2025 Toyota Uganda. All rights reserved.
