/* ============================================================
   TOYOTA UGANDA — Backend Server
   ============================================================ */

require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

// ---------- HEALTH ----------
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ---------- REGISTER ----------
app.post('/api/register', async (req, res) => {
  const { full_name, phone, password, referral_code } = req.body || {};
  try {
    const { data, error } = await supabase.rpc('register_user', {
      p_full_name: full_name,
      p_phone: phone,
      p_password: password,
      p_referral_code: referral_code || null,
    });
    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.json(data);
  } catch (err) {
    console.error('register error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------- LOGIN ----------
app.post('/api/login', async (req, res) => {
  const { phone, password } = req.body || {};
  try {
    const { data, error } = await supabase.rpc('login_user', {
      p_phone: phone,
      p_password: password,
    });
    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.json(data);
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------- ME ----------
app.get('/api/me', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ success: false, message: 'Missing user id' });
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, phone_number, balance, referral_code, total_deposited, total_withdrawn, total_invested, total_earned, is_admin, is_blocked')
      .eq('id', userId)
      .single();
    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.json({ success: true, user: data });
  } catch (err) {
    console.error('me error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------- PRODUCTS ----------
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.json({ success: true, products: data });
  } catch (err) {
    console.error('products error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------- MESSAGES ----------
app.get('/api/messages', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, title, body, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.json({ success: true, messages: data });
  } catch (err) {
    console.error('messages error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});
// ---------- PURCHASE ----------
app.post('/api/purchase', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ success: false, message: 'Missing user id' });
  const { product_id } = req.body || {};
  try {
    const { data, error } = await supabase.rpc('purchase_product', {
      p_product_id: product_id,
    });
    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.json(data);
  } catch (err) {
    console.error('purchase error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------- DEPOSIT ----------
app.post('/api/deposit', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ success: false, message: 'Missing user id' });

  const { amount, phone_number, network } = req.body || {};
  if (!amount || Number(amount) < 15000) {
    return res.status(400).json({ success: false, message: 'Minimum deposit is 15,000 UGX' });
  }
  if (!phone_number) {
    return res.status(400).json({ success: false, message: 'Phone number required' });
  }

  const digits = String(phone_number).replace(/\D/g, '');
  const intlPhone = digits.startsWith('256') ? digits : '256' + digits.replace(/^0/, '');
  const reference = 'TYT-DEP-' + Date.now() + '-' + Math.floor(Math.random() * 10000);

  const base = process.env.MARZPAY_BASE_URL;
  const mpath = process.env.MARZPAY_COLLECT_PATH || '/collect-money';
  const auth = Buffer.from(`${process.env.MARZPAY_USER}:${process.env.MARZPAY_KEY}`).toString('base64');

  const payload = {
    phone_number: intlPhone,
    amount: Number(amount),
    country: 'UG',
    reference: reference,
    description: 'Toyota Uganda Deposit',
  };

  try {
    const response = await fetch(`${base}${mpath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    await supabase.from('deposits').insert({
      user_id: userId,
      amount: Number(amount),
      fee: 0,
      net_amount: Number(amount),
      phone_number: intlPhone,
      network: network || null,
      marzpay_reference: reference,
      status: 'pending',
      raw_response: result,
    });

    if (!response.ok) {
      return res.status(400).json({ success: false, message: result.message || 'MarzPay failed', detail: result });
    }
    return res.json({
      success: true,
      message: 'Please check your phone and approve the payment',
      reference: reference,
    });
  } catch (err) {
    console.error('deposit error', err);
    return res.status(500).json({ success: false, message: 'Server error contacting MarzPay' });
  }
});
// ---------- ADMIN APPROVE WITHDRAWAL ----------
app.post('/api/admin/approve-withdrawal', async (req, res) => {
  const adminId = req.headers['x-user-id'];
  if (!adminId) return res.status(401).json({ success: false, message: 'Missing user id' });

  const { withdrawal_id } = req.body || {};
  if (!withdrawal_id) return res.status(400).json({ success: false, message: 'Withdrawal ID required' });

  const { data: admin } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', adminId)
    .single();
  if (!admin || !admin.is_admin) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  const { data: w } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('id', withdrawal_id)
    .single();
  if (!w) return res.status(404).json({ success: false, message: 'Withdrawal not found' });
  if (w.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Withdrawal is not pending' });
  }

  const { data: markResult } = await supabase.rpc('mark_withdrawal_approved', {
    p_withdrawal_id: withdrawal_id,
  });
  if (!markResult || !markResult.success) {
    return res.status(400).json({ success: false, message: (markResult && markResult.message) || 'Failed to approve' });
  }

  const base = process.env.MARZPAY_BASE_URL;
  const mpath = process.env.MARZPAY_SEND_PATH || '/send-money';
  const auth = Buffer.from(`${process.env.MARZPAY_USER}:${process.env.MARZPAY_KEY}`).toString('base64');

  const digits = String(w.phone_number).replace(/\D/g, '');
  const intlPhone = digits.startsWith('256') ? digits : '256' + digits.replace(/^0/, '');
  const reference = 'TYT-WD-' + withdrawal_id.slice(0, 8) + '-' + Date.now();

  const payload = {
    phone_number: intlPhone,
    amount: Number(w.net_amount),
    country: 'UG',
    reference: reference,
    description: 'Toyota Uganda Withdrawal',
  };

  try {
    const response = await fetch(`${base}${mpath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    await supabase
      .from('withdrawals')
      .update({ marzpay_reference: reference, raw_response: result })
      .eq('id', withdrawal_id);

    if (!response.ok) {
      await supabase.rpc('fail_withdrawal', {
        p_withdrawal_id: withdrawal_id,
        p_reason: result.message || 'MarzPay failed',
        p_raw_response: result,
      });
      return res.status(400).json({ success: false, message: result.message || 'MarzPay failed' });
    }

    return res.json({
      success: true,
      message: 'Withdrawal sent via MarzPay',
      reference: reference,
    });
  } catch (err) {
    console.error('withdraw error', err);
    return res.status(500).json({ success: false, message: 'Server error contacting MarzPay' });
  }
});

// ---------- ADMIN REJECT WITHDRAWAL ----------
app.post('/api/admin/reject-withdrawal', async (req, res) => {
  const adminId = req.headers['x-user-id'];
  if (!adminId) return res.status(401).json({ success: false, message: 'Missing user id' });

  const { withdrawal_id, reason } = req.body || {};
  const { data: admin } = await supabase.from('users').select('is_admin').eq('id', adminId).single();
  if (!admin || !admin.is_admin) return res.status(403).json({ success: false, message: 'Not authorized' });

  const { data } = await supabase.rpc('reject_withdrawal', {
    p_withdrawal_id: withdrawal_id,
    p_reason: reason || 'Rejected by admin',
  });
  return res.json(data);
});

// ---------- MARZPAY WEBHOOK ----------
app.post('/api/webhooks/marzpay', async (req, res) => {
  res.status(200).json({ received: true });

  const event = req.body || {};
  const eventType = event.type || event.event || event.status;
  const reference = event.reference || (event.data && event.data.reference);
  const marzpayUuid = event.uuid || (event.data && event.data.uuid);
  console.log('MarzPay webhook:', eventType, reference);

  try {
    if (!reference) return;

    if (eventType === 'collection.completed' || eventType === 'collection_completed') {
      await supabase.rpc('credit_deposit', {
        p_marzpay_reference: reference,
        p_marzpay_uuid: marzpayUuid,
        p_raw_response: event,
      });
    } else if (eventType === 'collection.failed' || eventType === 'collection_failed') {
      await supabase.rpc('fail_deposit', {
        p_marzpay_reference: reference,
        p_reason: event.message || 'Failed',
        p_raw_response: event,
      });
    } else if (eventType === 'disbursement.completed' || eventType === 'disbursement_completed') {
      const { data: w } = await supabase
        .from('withdrawals')
        .select('id')
        .eq('marzpay_reference', reference)
        .single();
      if (w) {
        await supabase.rpc('complete_withdrawal', {
          p_withdrawal_id: w.id,
          p_marzpay_uuid: marzpayUuid,
          p_marzpay_reference: reference,
          p_raw_response: event,
        });
      }
    } else if (eventType === 'disbursement.failed' || eventType === 'disbursement_failed') {
      const { data: w } = await supabase
        .from('withdrawals')
        .select('id')
        .eq('marzpay_reference', reference)
        .single();
      if (w) {
        await supabase.rpc('fail_withdrawal', {
          p_withdrawal_id: w.id,
          p_reason: event.message || 'Disbursement failed',
          p_raw_response: event,
        });
      }
    }
  } catch (err) {
    console.error('webhook processing error', err);
  }
});

// ---------- STATIC FILES ----------
app.use(express.static(path.join(__dirname, 'public')));

// ---------- FALLBACK ----------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- START ----------
app.listen(PORT, () => {
  console.log(`✅ Toyota Uganda running on http://localhost:${PORT}`);
});
