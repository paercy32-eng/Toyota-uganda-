/* ============================================================
   TOYOTA UGANDA — Main Application Script (Supabase Integrated)
   ============================================================ */

// ======================= SUPABASE CONFIGURATION =======================
const SUPABASE_URL = 'https://uiidsthzvnxvouxjpsfd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpaWRzdGh6dm54dm91eGpwc2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNjgwNjEsImV4cCI6MjEwNDk0NDA2MX0.hXbFdoKo78LnBKv5OqNunO1tOmnMBvC7khh0tzZAVc4';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ======================= CONSTANTS =======================
const ADMIN_CREDENTIALS = [
    { phone: '0705371032', password: 'kauthara0909' }
];

const SIGNUP_BONUS = 3000;
const MIN_WITHDRAWAL = 4000;
const MIN_DEPOSIT = 10000;
const WITHDRAWAL_FEE = 0.12;
const REFERRAL_LEVELS = { 1: 0.20, 2: 0.02, 3: 0.01 };

const PLANS = [
    { id: 1, name: 'VIP 1', product: 'Toyota Yaris', amount: 10000, daily: 3000, icon: '🚗' },
    { id: 2, name: 'VIP 2', product: 'Toyota Corolla', amount: 20000, daily: 6000, icon: '🚙' },
    { id: 3, name: 'VIP 3', product: 'Toyota Prius', amount: 50000, daily: 15000, icon: '🚘' },
    { id: 4, name: 'VIP 4', product: 'Toyota Camry', amount: 70000, daily: 21000, icon: '🚖' },
    { id: 5, name: 'VIP 5', product: 'Toyota RAV4', amount: 100000, daily: 30000, icon: '🚐' },
    { id: 6, name: 'VIP 6', product: 'Toyota Tacoma', amount: 150000, daily: 45000, icon: '🛻' },
    { id: 7, name: 'VIP 7', product: 'Toyota Hilux', amount: 200000, daily: 60000, icon: '🚚' },
    { id: 8, name: 'VIP 8', product: 'Toyota Highlander', amount: 300000, daily: 90000, icon: '🚙' },
    { id: 9, name: 'VIP 9', product: 'Toyota GR Supra', amount: 400000, daily: 120000, icon: '🏎️' },
    { id: 10, name: 'VIP 10', product: 'Toyota Land Cruiser', amount: 500000, daily: 150000, icon: '🚙' }
];

const REFERRAL_STORAGE_KEY = 'toyota_ref';
const USER_SESSION_KEY = 'toyota_user';
const ADMIN_SESSION_KEY = 'toyota_admin';

let currentUser = null;

// ======================= TOAST =======================
function showToast(msg, type = 'info') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast';
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    t.innerHTML = `${icon} ${msg}`;
    c.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ======================= REFERRAL CAPTURE =======================
function captureReferral() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
        localStorage.setItem(REFERRAL_STORAGE_KEY, ref.toUpperCase());
    }
    const savedRef = localStorage.getItem(REFERRAL_STORAGE_KEY);
    const refInput = document.getElementById('regReferral');
    if (savedRef && refInput) {
        refInput.value = savedRef;
    }
}

function getDynamicReferralLink(refCode) {
    return window.location.origin + window.location.pathname + '?ref=' + refCode;
}

// ======================= AUTH UI =======================
function switchAuth(tab) {
    const regTab = document.getElementById('regTab');
    const loginTab = document.getElementById('loginTab');
    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');

    if (tab === 'register') {
        regTab.className = 'btn btn-primary btn-sm auth-tab';
        loginTab.className = 'btn btn-outline btn-sm auth-tab';
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    } else {
        regTab.className = 'btn btn-outline btn-sm auth-tab';
        loginTab.className = 'btn btn-primary btn-sm auth-tab';
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    }
}

// ======================= REGISTER =======================
async function register() {
    const name = document.getElementById('regName').value.trim();
    const country = document.getElementById('regCountry').value;
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;
    const referral = document.getElementById('regReferral').value.trim().toUpperCase();

    if (!name) { showToast('Enter full name', 'error'); return; }
    if (!phone || phone.length < 9) { showToast('Enter valid phone', 'error'); return; }
    if (!password || password.length < 6) { showToast('Password too short', 'error'); return; }
    if (password !== confirm) { showToast('Passwords do not match', 'error'); return; }

    const cleanPhone = phone.replace(/^\+/, '').replace(/^256/, '').replace(/^254/, '').replace(/^0/, '');
    const fullPhone = country + cleanPhone;

    try {
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('phone', fullPhone)
            .maybeSingle();

        if (existing) { showToast('Phone already registered', 'error'); return; }

        const refCode = 'TYT' + Math.random().toString(36).substring(2, 8).toUpperCase();

        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([{
                name,
                phone: fullPhone,
                password,
                ref_code: refCode,
                referred_by: referral || null,
                balance: SIGNUP_BONUS,
                total_invested: 0,
                total_earned: SIGNUP_BONUS,
                referral_earnings: 0,
                blocked: false,
                role: 'user'
            }])
            .select()
            .single();

        if (insertError) throw insertError;

        currentUser = newUser;
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(newUser));
        localStorage.removeItem(REFERRAL_STORAGE_KEY);

        document.getElementById('authScreen').style.display = 'none';
        showToast(`Welcome ${name}! ${SIGNUP_BONUS} UGX bonus credited.`, 'success');
        showDashboard();

    } catch (err) {
        console.error('Registration error:', err);
        showToast('Registration failed. Try again.', 'error');
    }
}

// ======================= LOGIN =======================
async function login() {
    const country = document.getElementById('loginCountry').value;
    const phone = document.getElementById('loginPhone').value.trim();
    const password = document.getElementById('loginPassword').value;

    const isAdmin = ADMIN_CREDENTIALS.some(a => a.phone === phone && a.password === password);
    if (isAdmin) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
        showAdminConsole();
        return;
    }

    const cleanPhone = phone.replace(/^\+/, '').replace(/^256/, '').replace(/^254/, '').replace(/^0/, '');
    const fullPhone = country + cleanPhone;

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone', fullPhone)
            .eq('password', password)
            .maybeSingle();

        if (error) throw error;
        if (!user) { showToast('Invalid credentials', 'error'); return; }
        if (user.blocked) { showToast('Account blocked', 'error'); return; }

        currentUser = user;
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));

        document.getElementById('authScreen').style.display = 'none';
        showToast('Welcome back!', 'success');
        showDashboard();

    } catch (err) {
        console.error('Login error:', err);
        showToast('Login failed. Try again.', 'error');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem(USER_SESSION_KEY);
    document.getElementById('userDashboard').classList.remove('active');
    document.getElementById('bottomNav').classList.remove('active');
    document.getElementById('authScreen').style.display = 'flex';
}

function adminLogout() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    document.getElementById('adminConsole').classList.remove('active');
    document.getElementById('authScreen').style.display = 'flex';
}

// ======================= DASHBOARD =======================
function showDashboard() {
    document.getElementById('userDashboard').classList.add('active');
    document.getElementById('bottomNav').classList.add('active');
    updateDashboard();
    showHome();
}

function updateDashboard() {
    if (!currentUser) return;
    document.getElementById('userBalance').textContent = (currentUser.balance || 0).toLocaleString();
    document.getElementById('userInvested').textContent = (currentUser.total_invested || 0).toLocaleString();
    document.getElementById('userEarned').textContent = (currentUser.total_earned || 0).toLocaleString();
    document.getElementById('userRefEarn').textContent = (currentUser.referral_earnings || 0).toLocaleString();
}

async function refreshUser() {
    if (!currentUser) return;
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    if (!error && data) {
        currentUser = data;
        localStorage.setItem(USER_SESSION_KEY, JSON.stringify(data));
        updateDashboard();
    }
}

function setActiveNav(tab) {
    document.querySelectorAll('.bottom-nav-item').forEach(i => {
        i.classList.toggle('active', i.dataset.tab === tab);
    });
}

// ======================= HOME TAB =======================
function showHome() {
    setActiveNav('home');
    if (!currentUser) return;

    const c = document.getElementById('userContent');
    c.innerHTML = `
        <div class="dash-section">
            <h3>🚗 Available Products</h3>
            <div class="plans-grid">
                ${PLANS.map(p => `
                    <div class="plan-card">
                        <span class="vip-badge">${p.name}</span>
                        <div class="car-icon">${p.icon}</div>
                        <h3>${p.product}</h3>
                        <div class="amount">${p.amount.toLocaleString()} UGX</div>
                        <div class="daily">+${p.daily.toLocaleString()} UGX daily</div>
                        <div class="duration">100 Days</div>
                        <button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="purchase(${p.id})">Purchase</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ======================= ORDERS TAB =======================
async function showOrders() {
    setActiveNav('orders');
    if (!currentUser) return;

    const c = document.getElementById('userContent');
    c.innerHTML = '<div class="dash-section"><h3>📦 My Orders</h3><p>Loading...</p></div>';

    const { data: investments, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (error) {
        c.innerHTML = '<div class="dash-section"><h3>📦 My Orders</h3><p style="color:var(--danger);">Failed to load.</p></div>';
        return;
    }

    c.innerHTML = `
        <div class="dash-section">
            <h3>📦 My Orders</h3>
            ${investments.length === 0
                ? '<p style="color:var(--text3);">No purchases yet.</p>'
                : investments.map(inv => {
                    const days = Math.floor((Date.now() - new Date(inv.start_date)) / (1000 * 60 * 60 * 24));
                    const earned = inv.daily_earning * Math.min(days, 100);
                    return `
                        <div style="padding:12px;border-bottom:1px solid var(--border);">
                            <strong>${inv.product_name}</strong> (${inv.plan_name})<br>
                            <span style="font-size:12px;color:var(--text2);">
                                Day ${days}/100 · Earned: ${earned.toLocaleString()} UGX
                            </span>
                        </div>
                    `;
                }).join('')}
        </div>
    `;
}

// ======================= TEAM TAB =======================
async function showTeam() {
    setActiveNav('team');
    if (!currentUser) return;

    const c = document.getElementById('userContent');
    c.innerHTML = '<div class="dash-section"><h3>👥 My Team</h3><p>Loading...</p></div>';

    const { data: l1 } = await supabase
        .from('users')
        .select('id, name, phone, total_invested, ref_code')
        .eq('referred_by', currentUser.ref_code);

    const l1List = l1 || [];
    const l1Codes = l1List.map(u => u.ref_code);

    let l2List = [];
    if (l1Codes.length > 0) {
        const { data: l2 } = await supabase
            .from('users')
            .select('id, name, phone, total_invested, ref_code')
            .in('referred_by', l1Codes);
        l2List = l2 || [];
    }

    const l2Codes = l2List.map(u => u.ref_code);
    let l3List = [];
    if (l2Codes.length > 0) {
        const { data: l3 } = await supabase
            .from('users')
            .select('id, name, phone, total_invested, ref_code')
            .in('referred_by', l2Codes);
        l3List = l3 || [];
    }

    const l1Reward = l1List.reduce((s, u) => s + Math.floor(u.total_invested * REFERRAL_LEVELS[1]), 0);
    const l2Reward = l2List.reduce((s, u) => s + Math.floor(u.total_invested * REFERRAL_LEVELS[2]), 0);
    const l3Reward = l3List.reduce((s, u) => s + Math.floor(u.total_invested * REFERRAL_LEVELS[3]), 0);

    const refLink = getDynamicReferralLink(currentUser.ref_code);
    const allReferrals = [
        ...l1List.map(u => ({ ...u, level: 'Lv1' })),
        ...l2List.map(u => ({ ...u, level: 'Lv2' })),
        ...l3List.map(u => ({ ...u, level: 'Lv3' }))
    ];

    c.innerHTML = `
        <div class="dash-section">
            <div class="referral-cards">
                <div class="referral-card">
                    <h4>INVITATION LINK</h4>
                    <div class="link-text">${refLink}</div>
                    <button class="copy-btn" onclick="copyText('${refLink}')">COPY</button>
                </div>
                <div class="referral-card">
                    <h4>INVITATION CODE</h4>
                    <div class="code-text">${currentUser.ref_code}</div>
                    <button class="copy-btn" onclick="copyText('${currentUser.ref_code}')">COPY</button>
                </div>
            </div>

            <h3>👥 My Team</h3>
            <div class="team-level">
                <div class="level-badge">Lv1</div>
                <div class="level-info">
                    <div class="level-name">Level 1 (Direct)</div>
                    <div class="level-commission">20% Commission</div>
                </div>
                <div class="level-stats">
                    <div class="user-count">${l1List.length}</div>
                    <div class="reward">UGX ${l1Reward.toLocaleString()}</div>
                </div>
            </div>
            <div class="team-level">
                <div class="level-badge">Lv2</div>
                <div class="level-info">
                    <div class="level-name">Level 2 (Indirect)</div>
                    <div class="level-commission">2% Commission</div>
                </div>
                <div class="level-stats">
                    <div class="user-count">${l2List.length}</div>
                    <div class="reward">UGX ${l2Reward.toLocaleString()}</div>
                </div>
            </div>
            <div class="team-level">
                <div class="level-badge">Lv3</div>
                <div class="level-info">
                    <div class="level-name">Level 3 (Indirect)</div>
                    <div class="level-commission">1% Commission</div>
                </div>
                <div class="level-stats">
                    <div class="user-count">${l3List.length}</div>
                    <div class="reward">UGX ${l3Reward.toLocaleString()}</div>
                </div>
            </div>

            <h3 style="margin-top:20px;">👤 My Invitees</h3>
            ${allReferrals.length === 0
                ? '<p style="color:var(--text3);">No referrals yet.</p>'
                : allReferrals.map(u => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid var(--border);">
                        <div>
                            <strong>${u.name}</strong><br>
                            <span style="font-size:11px;color:var(--text3);">${u.phone} · ${u.level}</span>
                        </div>
                        <span class="status-badge ${u.total_invested > 0 ? 'status-invested' : 'status-notinvested'}">
                            ${u.total_invested > 0 ? 'Invested' : 'Not Invested'}
                        </span>
                    </div>
                `).join('')}
        </div>
    `;
}

// ======================= PROFILE TAB =======================
async function showProfile() {
    setActiveNav('profile');
    if (!currentUser) return;

    const c = document.getElementById('userContent');
    c.innerHTML = '<div class="dash-section"><h3>👤 My Account</h3><p>Loading...</p></div>';

    await refreshUser();

    const { data: deposits } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(10);

    const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(10);

    const { data: investments } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    c.innerHTML = `
        <div class="dash-section">
            <h3>👤 My Account</h3>
            <p>Name: <strong>${currentUser.name}</strong></p>
            <p>Phone: <strong>${currentUser.phone}</strong></p>
            <p>Balance: <strong>${currentUser.balance.toLocaleString()} UGX</strong></p>
            <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
                <button class="btn btn-primary btn-sm" onclick="openRecharge()">💰 Deposit</button>
                <button class="btn btn-outline btn-sm" onclick="openWithdraw()">🏧 Withdraw</button>
            </div>
            <p style="margin-top:8px;font-size:12px;color:var(--text3);">
                Min Deposit: 10,000 · Min Withdraw: 4,000 · Fee: 12%
            </p>
            <a href="https://chat.whatsapp.com/EoaIhrkXUkCHh4BYbXWc8y?s=cl&p=a&mlu=4&ilr=4"
               target="_blank" rel="noopener"
               class="btn btn-success btn-sm btn-block" style="margin-top:12px;">
                💬 Join WhatsApp Group
            </a>
        </div>

        <div class="dash-section">
            <h3>📥 Deposit History</h3>
            ${!deposits || deposits.length === 0
                ? '<p style="color:var(--text3);">No deposits yet.</p>'
                : deposits.map(d => `
                    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
                        <span>${d.amount.toLocaleString()} UGX</span>
                        <span class="status-badge status-${d.status}">${d.status}</span>
                    </div>
                `).join('')}
        </div>

        <div class="dash-section">
            <h3>📤 Withdrawal History</h3>
            ${!withdrawals || withdrawals.length === 0
                ? '<p style="color:var(--text3);">No withdrawals yet.</p>'
                : withdrawals.map(w => `
                    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
                        <span>${w.amount.toLocaleString()} UGX</span>
                        <span class="status-badge status-${w.status}">${w.status}</span>
                    </div>
                `).join('')}
        </div>

        <div class="dash-section">
            <h3>🛒 Purchase History</h3>
            ${!investments || investments.length === 0
                ? '<p style="color:var(--text3);">No purchases yet.</p>'
                : investments.map(inv => `
                    <div style="padding:8px 0;border-bottom:1px solid var(--border);">
                        ${inv.product_name} - ${inv.amount.toLocaleString()} UGX
                    </div>
                `).join('')}
        </div>
    `;
}

// ======================= COPY HELPER =======================
function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('Copied!', 'success'))
            .catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('Copied!', 'success'); }
    catch { showToast('Copy failed', 'error'); }
    document.body.removeChild(ta);
}

// ======================= DEPOSIT FLOW =======================
let rechargeBank = '';

function openRecharge() {
    document.getElementById('rechargeModal').classList.add('active');
    document.getElementById('bankInstructions').innerHTML = '';
    rechargeBank = '';
}

function closeRecharge() {
    document.getElementById('rechargeModal').classList.remove('active');
}

function selectBank(bank) {
    rechargeBank = bank;
    const c = document.getElementById('bankInstructions');
    if (bank === 'A') {
        c.innerHTML = `
            <div style="background:var(--bg);padding:16px;border-radius:8px;margin-bottom:12px;">
                <h4 style="color:var(--primary);">Bank A Details</h4>
                <p>Number: <strong style="font-size:18px;">0705371032</strong>
                    <button onclick="copyText('0705371032')" style="background:#fff;color:#000;padding:4px 10px;border-radius:4px;border:none;cursor:pointer;font-size:11px;margin-left:6px;">COPY</button>
                </p>
                <p>Name: <strong>Ronald Lubwama</strong></p>
                <p style="font-size:12px;color:var(--text2);margin-top:8px;">Send money, then enter Transaction ID below.</p>
            </div>
        `;
    } else {
        c.innerHTML = `
            <div style="background:var(--bg);padding:16px;border-radius:8px;margin-bottom:12px;">
                <h4 style="color:var(--warning);">Bank B Details</h4>
                <p>Number: <strong style="font-size:18px;">0731402668</strong>
                    <button onclick="copyText('0731402668')" style="background:#fff;color:#000;padding:4px 10px;border-radius:4px;border:none;cursor:pointer;font-size:11px;margin-left:6px;">COPY</button>
                </p>
                <p>Name: <strong>Nabirye Suzan</strong></p>
                <p style="font-size:12px;color:var(--text2);margin-top:8px;">Send money, then enter Transaction ID below.</p>
            </div>
        `;
    }
}

async function submitDeposit() {
    if (!currentUser) return;

    const amount = parseInt(document.getElementById('rechargeAmount').value);
    const txId = document.getElementById('txId').value.trim();
    const txPhone = document.getElementById('txPhone').value.trim();

    if (!amount || amount < MIN_DEPOSIT) { showToast(`Min ${MIN_DEPOSIT} UGX`, 'error'); return; }
    if (!rechargeBank) { showToast('Select a bank', 'error'); return; }
    if (!txId) { showToast('Enter Transaction ID', 'error'); return; }
    if (!txPhone || txPhone.length < 9) { showToast('Enter phone used', 'error'); return; }

    try {
        const { error } = await supabase
            .from('deposits')
            .insert([{
                user_id: currentUser.id,
                user_name: currentUser.name,
                amount,
                bank: rechargeBank,
                tx_id: txId,
                tx_phone: txPhone,
                status: 'pending'
            }]);

        if (error) throw error;

        closeRecharge();
        showToast('Deposit submitted. Approval takes 3-10 minutes.', 'success');
        showProfile();

    } catch (err) {
        console.error('Deposit error:', err);
        showToast('Failed to submit deposit', 'error');
    }
}

// ======================= WITHDRAWAL FLOW =======================
function openWithdraw() {
    if (!currentUser) return;

    supabase.from('investments')
        .select('id')
        .eq('user_id', currentUser.id)
        .limit(1)
        .then(({ data, error }) => {
            if (error || !data || data.length === 0) {
                showToast('Purchase a product first', 'error');
                return;
            }
            if (currentUser.balance < MIN_WITHDRAWAL) {
                showToast(`Min ${MIN_WITHDRAWAL} UGX`, 'error');
                return;
            }
            document.getElementById('withdrawModal').classList.add('active');
        });
}

function updateFee() {
    const amt = parseInt(document.getElementById('withdrawAmount').value) || 0;
    const fee = Math.floor(amt * WITHDRAWAL_FEE);
    document.getElementById('withdrawFee').textContent = fee.toLocaleString();
    document.getElementById('withdrawNet').textContent = (amt - fee).toLocaleString();
}

async function submitWithdraw() {
    if (!currentUser) return;

    const amt = parseInt(document.getElementById('withdrawAmount').value);
    const phone = document.getElementById('withdrawPhone').value.trim();
    const name = document.getElementById('withdrawName').value.trim();

    if (!amt || amt < MIN_WITHDRAWAL) { showToast(`Min ${MIN_WITHDRAWAL} UGX`, 'error'); return; }
    if (amt > currentUser.balance) { showToast('Insufficient balance', 'error'); return; }
    if (!phone || phone.length < 9) { showToast('Enter receiver number', 'error'); return; }
    if (!name) { showToast('Enter name as on ID', 'error'); return; }

    const fee = Math.floor(amt * WITHDRAWAL_FEE);
    const net = amt - fee;

    try {
        const { error: balanceError } = await supabase
            .from('users')
            .update({ balance: currentUser.balance - amt })
            .eq('id', currentUser.id);

        if (balanceError) throw balanceError;

        const { error: withdrawError } = await supabase
            .from('withdrawals')
            .insert([{
                user_id: currentUser.id,
                user_name: currentUser.name,
                amount: amt,
                net_amount: net,
                fee,
                phone,
                name,
                status: 'pending'
            }]);

        if (withdrawError) throw withdrawError;

        await refreshUser();
        document.getElementById('withdrawModal').classList.remove('active');
        showToast(`Withdrawal requested. You'll receive ${net.toLocaleString()} UGX.`, 'success');
        showProfile();

    } catch (err) {
        console.error('Withdrawal error:', err);
        showToast('Failed to process withdrawal', 'error');
    }
}

// ======================= PURCHASE + REFERRALS =======================
async function purchase(planId) {
    if (!currentUser) return;

    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return;

    const { data: existing } = await supabase
        .from('investments')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('plan_id', planId)
        .maybeSingle();

    if (existing) { showToast('Already purchased', 'error'); return; }
    if (currentUser.balance < plan.amount) { showToast('Insufficient balance. Deposit first.', 'error'); return; }

    try {
        const newBalance = currentUser.balance - plan.amount;
        const newInvested = (currentUser.total_invested || 0) + plan.amount;

        const { error: userError } = await supabase
            .from('users')
            .update({ balance: newBalance, total_invested: newInvested })
            .eq('id', currentUser.id);

        if (userError) throw userError;

        const { error: invError } = await supabase
            .from('investments')
            .insert([{
                user_id: currentUser.id,
                plan_id: plan.id,
                plan_name: plan.name,
                product_name: plan.product,
                amount: plan.amount,
                daily_earning: plan.daily,
                active: true
            }]);

        if (invError) throw invError;

        const { error: rpcError } = await supabase.rpc('process_referral_commission', {
            p_user_id: currentUser.id,
            p_amount: plan.amount
        });

        if (rpcError) {
            console.error('Referral commission error:', rpcError);
        }

        await refreshUser();
        showToast(`Purchased ${plan.product}!`, 'success');
        showOrders();

    } catch (err) {
        console.error('Purchase error:', err);
        showToast('Purchase failed', 'error');
    }
}

// ======================= ADMIN PANEL =======================
function showAdminConsole() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('adminConsole').classList.add('active');
    updateAdminMetrics();
    adminTab('deposits', { target: document.querySelector('.admin-tab') });
}

async function updateAdminMetrics() {
    try {
        const { count: userCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        document.getElementById('adminUsers').textContent = userCount || 0;

        const { data: approvedDeposits } = await supabase
            .from('deposits')
            .select('amount')
            .eq('status', 'approved');

        const depTotal = (approvedDeposits || []).reduce((s, d) => s + d.amount, 0);
        document.getElementById('adminDeposits').textContent = depTotal.toLocaleString();

        const { data: users } = await supabase
            .from('users')
            .select('total_invested');

        const invTotal = (users || []).reduce((s, u) => s + (u.total_invested || 0), 0);
        document.getElementById('adminInvested').textContent = invTotal.toLocaleString();

        const { data: approvedWithdrawals } = await supabase
            .from('withdrawals')
            .select('amount')
            .eq('status', 'approved');

        const wdTotal = (approvedWithdrawals || []).reduce((s, w) => s + w.amount, 0);
        document.getElementById('adminPaidOut').textContent = wdTotal.toLocaleString();

    } catch (err) {
        console.error('Admin metrics error:', err);
    }
}

async function adminTab(tab, evt) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    if (evt && evt.target) evt.target.classList.add('active');

    const c = document.getElementById('adminContent');
    c.innerHTML = '<p>Loading...</p>';

    try {
        if (tab === 'deposits') {
            const { data: pending } = await supabase
                .from('deposits')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            c.innerHTML = `
                <table class="admin-table">
                    <tr><th>User</th><th>Amount</th><th>Bank</th><th>TxID</th><th>Actions</th></tr>
                    ${(pending || []).map(d => `
                        <tr>
                            <td>${d.user_name}</td>
                            <td>${d.amount.toLocaleString()}</td>
                            <td>Bank ${d.bank}</td>
                            <td>${d.tx_id}</td>
                            <td>
                                <button class="btn btn-success btn-sm" onclick="approveDeposit('${d.id}')">Approve</button>
                                <button class="btn btn-danger btn-sm" onclick="rejectDeposit('${d.id}')">Reject</button>
                            </td>
                        </tr>
                    `).join('') || '<tr><td colspan="5">No pending deposits</td></tr>'}
                </table>
            `;

        } else if (tab === 'withdrawals') {
            const { data: pending } = await supabase
                .from('withdrawals')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            c.innerHTML = `
                <table class="admin-table">
                    <tr><th>User</th><th>Amount</th><th>Net</th><th>Phone</th><th>Actions</th></tr>
                    ${(pending || []).map(w => `
                        <tr>
                            <td>${w.user_name}</td>
                            <td>${w.amount.toLocaleString()}</td>
                            <td>${w.net_amount.toLocaleString()}</td>
                            <td>${w.phone}</td>
                            <td>
                                <button class="btn btn-success btn-sm" onclick="approveWithdraw('${w.id}')">Approve</button>
                                <button class="btn btn-danger btn-sm" onclick="rejectWithdraw('${w.id}')">Reject</button>
                            </td>
                        </tr>
                    `).join('') || '<tr><td colspan="5">No pending withdrawals</td></tr>'}
                </table>
            `;

        } else {
            const { data: users } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            c.innerHTML = `
                <table class="admin-table">
                    <tr><th>Name</th><th>Phone</th><th>Balance</th><th>Invested</th><th>Status</th><th>Actions</th></tr>
                    ${(users || []).map(u => `
                        <tr>
                            <td>${u.name}</td>
                            <td>${u.phone}</td>
                            <td>${u.balance.toLocaleString()}</td>
                            <td>${(u.total_invested || 0).toLocaleString()}</td>
                            <td>
                                <span class="status-badge ${u.blocked ? 'status-rejected' : 'status-approved'}">
                                    ${u.blocked ? 'Blocked' : 'Active'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-warning btn-sm" onclick="toggleBlock('${u.id}')">
                                    ${u.blocked ? 'Unblock' : 'Block'}
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </table>
            `;
        }
    } catch (err) {
        console.error('Admin tab error:', err);
        c.innerHTML = '<p style="color:var(--danger);">Failed to load data.</p>';
    }
}

async function approveDeposit(id) {
    try {
        const { data: deposit } = await supabase
            .from('deposits')
            .select('*')
            .eq('id', id)
            .single();

        if (!deposit) return;

        await supabase
            .from('deposits')
            .update({ status: 'approved' })
            .eq('id', id);

        const { data: user } = await supabase
            .from('users')
            .select('balance')
            .eq('id', deposit.user_id)
            .single();

        if (user) {
            await supabase
                .from('users')
                .update({ balance: user.balance + deposit.amount })
                .eq('id', deposit.user_id);
        }

        showToast('Deposit approved', 'success');
        updateAdminMetrics();
        adminTab('deposits', { target: document.querySelector('.admin-tab.active') });

    } catch (err) {
        console.error('Approve deposit error:', err);
        showToast('Failed to approve', 'error');
    }
}

async function rejectDeposit(id) {
    try {
        await supabase
            .from('deposits')
            .update({ status: 'rejected' })
            .eq('id', id);

        showToast('Deposit rejected', 'info');
        updateAdminMetrics();
        adminTab('deposits', { target: document.querySelector('.admin-tab.active') });

    } catch (err) {
        console.error('Reject deposit error:', err);
    }
}

async function approveWithdraw(id) {
    try {
        await supabase
            .from('withdrawals')
            .update({ status: 'approved' })
            .eq('id', id);

        showToast('Withdrawal approved', 'success');
        updateAdminMetrics();
        adminTab('withdrawals', { target: document.querySelector('.admin-tab.active') });

    } catch (err) {
        console.error('Approve withdraw error:', err);
    }
}

async function rejectWithdraw(id) {
    try {
        const { data: w } = await supabase
            .from('withdrawals')
            .select('*')
            .eq('id', id)
            .single();

        if (!w) return;

        await supabase
            .from('withdrawals')
            .update({ status: 'rejected' })
            .eq('id', id);

        const { data: user } = await supabase
            .from('users')
            .select('balance')
            .eq('id', w.user_id)
            .single();

        if (user) {
            await supabase
                .from('users')
                .update({ balance: user.balance + w.amount })
                .eq('id', w.user_id);
        }

        showToast('Withdrawal rejected, amount returned', 'info');
        updateAdminMetrics();
        adminTab('withdrawals', { target: document.querySelector('.admin-tab.active') });

    } catch (err) {
        console.error('Reject withdraw error:', err);
    }
}

async function toggleBlock(userId) {
    try {
        const { data: u } = await supabase
            .from('users')
            .select('blocked, name')
            .eq('id', userId)
            .single();

        if (!u) return;

        await supabase
            .from('users')
            .update({ blocked: !u.blocked })
            .eq('id', userId);

        showToast(`${!u.blocked ? 'Blocked' : 'Unblocked'} ${u.name}`, 'info');
        adminTab('users', { target: document.querySelector('.admin-tab.active') });

    } catch (err) {
        console.error('Toggle block error:', err);
    }
}

// ======================= DAILY EARNINGS AUTO-CREDIT =======================
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        creditDailyEarnings();
    }
}, 60000);

async function creditDailyEarnings() {
    try {
        const { data: investments } = await supabase
            .from('investments')
            .select('*')
            .eq('active', true);

        if (!investments) return;

        for (const inv of investments) {
            const { data: user } = await supabase
                .from('users')
                .select('balance, total_earned')
                .eq('id', inv.user_id)
                .single();

            if (user) {
                await supabase
                    .from('users')
                    .update({
                        balance: user.balance + inv.daily_earning,
                        total_earned: (user.total_earned || 0) + inv.daily_earning
                    })
                    .eq('id', inv.user_id);
            }
        }

        console.log('✅ Daily earnings credited');
    } catch (err) {
        console.error('Daily earnings error:', err);
    }
}

// ======================= INITIALIZATION =======================
document.addEventListener('DOMContentLoaded', async () => {
    captureReferral();

    document.querySelectorAll('.modal-overlay').forEach(o => {
        o.addEventListener('click', function (e) {
            if (e.target === this) this.classList.remove('active');
        });
    });

    if (sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true') {
        showAdminConsole();
        return;
    }

    const cached = localStorage.getItem(USER_SESSION_KEY);
    if (cached) {
        try {
            currentUser = JSON.parse(cached);
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', currentUser.id)
                .maybeSingle();

            if (!error && data && !data.blocked) {
                currentUser = data;
                localStorage.setItem(USER_SESSION_KEY, JSON.stringify(data));
                document.getElementById('authScreen').style.display = 'none';
                showDashboard();
            } else {
                localStorage.removeItem(USER_SESSION_KEY);
                currentUser = null;
            }
        } catch {
            localStorage.removeItem(USER_SESSION_KEY);
            currentUser = null;
        }
    }
});
