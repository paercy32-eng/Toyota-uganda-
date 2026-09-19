/* ============================================================
   TOYOTA UGANDA — Static Server
   Serves the /public folder as a static site.
   ============================================================ */

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Fallback route — serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Toyota Uganda running on http://localhost:${PORT}`);
});
// --- Get all active products ---
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

// --- Get active messages (home page announcements) ---
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

// --- Purchase a product (frontend calls this after clicking Buy) ---
app.post('/api/purchase', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ success: false, message: 'Missing user id' });
  const { product_id } = req.body || {};
  try {
    // We temporarily set the header for the RPC call
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

// --- Initiate deposit via MarzPay collect-money ---
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

  // Normalize phone to international format for MarzPay
  const digits = String(phone_number).replace(/\D/g, '');
  const intlPhone = digits.startsWith('256') ? digits : '256' + digits.replace(/^0/, '');

  // Generate unique reference
  const reference = 'TYT-DEP-' + Date.now() + '-' + Math.floor(Math.random() * 10000);

  // MarzPay collect request
  const base = process.env.MARZPAY_BASE_URL;
  const path = process.env.MARZPAY_COLLECT_PATH || '/collect-money';
  const auth = Buffer.from(`${process.env.MARZPAY_USER}:${process.env.MARZPAY_KEY}`).toString('base64');

  const payload = {
    phone_number: intlPhone,
    amount: Number(amount),
    country: 'UG',
    reference: reference,
    description: 'Toyota Uganda Deposit',
  };

  try {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    // Save deposit intent in database (pending)
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
