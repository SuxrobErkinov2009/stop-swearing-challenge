// ─── Ishtirokchilar (serverdan keladi) ───────────────────────────────────────
let participants = [];
let logs        = [];
let endTime     = null;

let activeParticipantId = null;
let securityCallback    = null;
let timerInterval       = null;

const CHALLENGE_DURATION = 6 * 24 * 60 * 60 * 1000; // 6 kun
const COOLDOWN_TIME      = 3 * 60 * 1000;            // 3 daqiqa

// ─── DOM elementlari ──────────────────────────────────────────────────────────
const grid          = document.getElementById('participants-grid');
const timerDisplay  = document.getElementById('timer-display');
const startBtn      = document.getElementById('startTimerBtn');
const saveBtn       = document.getElementById('saveBtn');
const refreshBtn    = document.getElementById('refreshBtn');
const infoBtn       = document.getElementById('infoBtn');
const modal         = document.getElementById('infoModal');
const flashOverlay  = document.getElementById('flash-overlay');

const reasonModal      = document.getElementById('reasonModal');
const reasonInput      = document.getElementById('penaltyReasonInput');
const reasonTargetText = document.getElementById('reasonModalTarget');
const cancelReasonBtn  = document.getElementById('cancelReasonBtn');
const submitReasonBtn  = document.getElementById('submitReasonBtn');
const logsContainer    = document.getElementById('logs-container');
const moneyContainer   = document.getElementById('money-container');

const passwordModal      = document.getElementById('passwordModal');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const cancelPasswordBtn  = document.getElementById('cancelPasswordBtn');
const submitPasswordBtn  = document.getElementById('submitPasswordBtn');

// ─── Server bilan ishlash ─────────────────────────────────────────────────────
async function apiGet() {
    try {
        const res  = await fetch('/api/data');
        const json = await res.json();
        return json.success ? json.data : null;
    } catch (e) {
        console.error('Ma\'lumot olishda xato:', e);
        return null;
    }
}

async function apiSave() {
    try {
        const res = await fetch('/api/data', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ participants, endTime, logs })
        });
        const json = await res.json();
        if (!json.success) console.error('Saqlashda xato:', json.message);
    } catch (e) {
        console.error('Saqlashda xato:', e);
    }
}

async function apiVerifyPassword(password) {
    try {
        const res  = await fetch('/api/verify', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ password })
        });
        const json = await res.json();
        return json.success;
    } catch (e) {
        return false;
    }
}

async function apiReset() {
    try {
        const res  = await fetch('/api/reset', { method: 'POST' });
        const json = await res.json();
        return json.success;
    } catch (e) {
        return false;
    }
}

// ─── Ma'lumotlarni yuklash ────────────────────────────────────────────────────
async function loadData() {
    const data = await apiGet();
    if (data) {
        participants = data.participants.map(p => ({
            ...p,
            penaltyMoney:    p.penaltyMoney    ?? 0,
            nextAllowedTime: p.nextAllowedTime ?? null
        }));
        endTime = data.endTime ?? null;
        logs    = data.logs    ?? [];
    }

    if (endTime) {
        if (Date.now() < endTime) {
            if (startBtn) startBtn.style.display = 'none';
            startTimer();
        } else {
            showRefreshUI();
        }
    }

    renderUI();
    renderLogs();
    renderMoney();
}

// ─── Parol so'rash (server orqali) ───────────────────────────────────────────
function askPassword(onSuccess) {
    adminPasswordInput.value = '';
    passwordModal.style.display = 'flex';
    adminPasswordInput.focus();
    securityCallback = onSuccess;
}

submitPasswordBtn.onclick = async function () {
    const pwd   = adminPasswordInput.value;
    const ok    = await apiVerifyPassword(pwd);
    passwordModal.style.display = 'none';
    if (ok) {
        if (securityCallback) securityCallback();
    } else {
        alert("Noto'g'ri parol! Ruxsat berilmadi.");
    }
};

cancelPasswordBtn.onclick = () => { passwordModal.style.display = 'none'; };

// ─── Ball ayirish ─────────────────────────────────────────────────────────────
window.subtract = function (id) {
    const now = Date.now();
    if (endTime && now >= endTime) return;

    const p = participants.find(x => x.id === id);
    if (!p || (p.nextAllowedTime && now < p.nextAllowedTime) || p.score <= 0) return;

    askPassword(() => {
        activeParticipantId = id;
        reasonTargetText.innerText = `${p.name} dan 1 ball ayirish uchun sabab yozing:`;
        reasonInput.value = '';
        reasonModal.style.display = 'flex';
        reasonInput.focus();
    });
};

submitReasonBtn.onclick = async function () {
    const reasonText = reasonInput.value.trim();
    if (!reasonText) { alert('Iltimos, sababni kiriting!'); return; }

    const id  = activeParticipantId;
    const p   = participants.find(x => x.id === id);
    const now = Date.now();

    if (p) {
        p.score--;
        p.penaltyMoney = (p.penaltyMoney ?? 0) + 2000;
        p.nextAllowedTime = now + COOLDOWN_TIME;

        const currentHour = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
        logs.unshift({ name: p.name, remainingScore: p.score, reason: reasonText, time: currentHour });

        reasonModal.style.display = 'none';
        triggerFlashEffect();

        if (p.score === 0) {
            new Audio('./ovozlar/gameover.MP3').play();
        } else {
            new Audio('./ovozlar/error.MP3').play();
            setTimeout(() => new Audio('./ovozlar/lock.MP3').play(), 1000);
        }

        await apiSave();
        renderUI();
        renderLogs();
        renderMoney();

        const scoreEl = document.getElementById(`score-${id}`);
        if (scoreEl) {
            scoreEl.classList.add('score-change');
            setTimeout(() => scoreEl.classList.remove('score-change'), 500);
        }
    }
};

cancelReasonBtn.onclick = () => { reasonModal.style.display = 'none'; };

// ─── Jarima to'lash ───────────────────────────────────────────────────────────
window.payFine = function (id) {
    const p = participants.find(x => x.id === id);
    if (!p || p.penaltyMoney <= 0) return;

    askPassword(async () => {
        if (confirm(`${p.name} 2 000 so'm jarima to'ladi, hisobdan kamaytiramizmi?`)) {
            p.penaltyMoney = Math.max(0, p.penaltyMoney - 2000);
            await apiSave();
            renderMoney();
        }
    });
};

// ─── Log o'chirish ────────────────────────────────────────────────────────────
window.deleteLog = function (index) {
    askPassword(async () => {
        if (confirm("Ushbu yozuvni tarixdan o'chirmoqchimisiz?")) {
            logs.splice(index, 1);
            await apiSave();
            renderLogs();
        }
    });
};

// ─── Flash effekt ─────────────────────────────────────────────────────────────
function triggerFlashEffect() {
    if (!flashOverlay) return;
    flashOverlay.classList.add('flash-active');
    setTimeout(() => flashOverlay.classList.remove('flash-active'), 150);
}

// ─── Render: Pul jarimalari ───────────────────────────────────────────────────
function renderMoney() {
    if (!moneyContainer) return;
    moneyContainer.innerHTML = '';
    participants.forEach(p => {
        const row = document.createElement('div');
        row.className = 'money-row';
        row.innerHTML = `
            <div class="money-name">${p.name}</div>
            <div class="money-right">
                <div class="money-val">${(p.penaltyMoney ?? 0).toLocaleString('uz-UZ')} so'm</div>
                <button class="pay-btn" onclick="payFine(${p.id})" ${(p.penaltyMoney ?? 0) <= 0 ? 'style="display:none;"' : ''}>To'lash</button>
            </div>
        `;
        moneyContainer.appendChild(row);
    });
}

// ─── Render: Loglar ───────────────────────────────────────────────────────────
function renderLogs() {
    if (!logsContainer) return;
    if (logs.length === 0) {
        logsContainer.innerHTML = `<div class="no-logs">Hozircha hech kim qoidani buzgani yo'q. Baraka topinglar! 🙌</div>`;
        return;
    }
    logsContainer.innerHTML = '';
    logs.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'log-item';
        el.innerHTML = `
            <div class="log-left">
                <div class="log-user-info">${item.name} <span class="current-score">Qolgan ball: ${item.remainingScore}</span></div>
                <div class="log-reason">🚨 Sabab: ${item.reason}</div>
            </div>
            <div style="display:flex;align-items:center;gap:15px;">
                <div class="log-time">Bugun, ${item.time}</div>
                <button onclick="deleteLog(${index})" style="background:none;border:none;color:#ff4757;font-size:20px;cursor:pointer;font-weight:bold;padding:0 5px;" title="Tarixdan o'chirish">×</button>
            </div>
        `;
        logsContainer.appendChild(el);
    });
}

// ─── Render: Ishtirokchilar kartasi ──────────────────────────────────────────
function renderUI() {
    if (!grid) return;
    grid.innerHTML = '';
    const now        = Date.now();
    const isGameOver = endTime ? now >= endTime : false;
    const maxScore   = Math.max(...participants.map(p => p.score));

    const totalLost = participants.reduce((s, p) => s + (15 - p.score), 0);
    document.getElementById('stat-total-lost').innerText = totalLost;

    const kings = participants.filter(p => p.score === maxScore && p.score > 0).map(p => p.name.split(' ')[0]);
    document.getElementById('stat-king').innerText = kings.length ? kings.join(', ') : 'Hech kim';

    const dangerOnes = participants.filter(p => p.score <= 5 && p.score > 0).map(p => p.name.split(' ')[0]);
    document.getElementById('stat-danger').innerText = dangerOnes.length ? dangerOnes.join(', ') : "Yo'q";

    participants.forEach(p => {
        const card     = document.createElement('div');
        const isLeader = p.score === maxScore && p.score > 0;
        const isLocked = p.nextAllowedTime && now < p.nextAllowedTime;

        card.className = `card ${isLeader ? 'leader' : 'normal-card'}`;

        let statusHtml = '';
        if (p.score <= 0) {
            statusHtml = `<div class="status-msg status-loser">Siz o'yinda mag'lub bo'ldingiz, sog'ilishga tayyor turing!!! 💀</div>`;
        } else if (isGameOver) {
            statusHtml = `<div class="status-msg status-winner">Tabriklaymiz! Siz azoblash xizmatidan qutilib qoldingiz!!! 🎉</div>`;
        } else {
            statusHtml = `<div class="cooldown-label">${isLocked ? formatTime(p.nextAllowedTime - now) : ''}</div>`;
        }

        card.innerHTML = `
            <span class="crown-icon">👑</span>
            <h3>${p.name}</h3>
            <div class="score-box" id="score-${p.id}">${p.score}</div>
            <button class="minus-btn ${(isLocked || isGameOver || p.score <= 0) ? 'disabled-btn' : ''}"
                ${(isLocked || isGameOver || p.score <= 0) ? 'disabled' : ''}
                onclick="subtract(${p.id})">
                <span>×</span>
            </button>
            ${statusHtml}
        `;
        grid.appendChild(card);
    });
}

// ─── Taymer ───────────────────────────────────────────────────────────────────
function formatTime(ms) {
    const s   = Math.floor(ms / 1000);
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const now     = Date.now();
        const timeLeft = endTime - now;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerDisplay.innerText = '00:00:00:00';
            showRefreshUI();
            renderUI();
        } else {
            const d = Math.floor(timeLeft / 86400000);
            const h = Math.floor((timeLeft % 86400000) / 3600000);
            const m = Math.floor((timeLeft % 3600000) / 60000);
            const s = Math.floor((timeLeft % 60000) / 1000);
            timerDisplay.innerText = `${String(d).padStart(2,'0')}:${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }
    }, 1000);
}

// Cooldown taymeri (har soniya UI yangilanadi)
setInterval(async () => {
    const now = Date.now();
    let changed = false;

    participants.forEach(p => {
        if (p.nextAllowedTime) {
            if (now >= p.nextAllowedTime) {
                p.nextAllowedTime = null;
                changed = true;
            } else {
                changed = true; // UI ni qayta chizish kerak (cooldown sanashi)
            }
        }
    });

    if (changed && (!endTime || now < endTime)) {
        renderUI();
        // Faqat null bo'lsa serverga saqlaymiz (ortiqcha so'rov bo'lmasin)
        const anyJustUnlocked = participants.some(p => p.nextAllowedTime === null);
        if (anyJustUnlocked) await apiSave();
    }
}, 1000);

// ─── Avtomatik sinxronlash (har 5 soniya boshqa qurilmalardan yangilash) ─────
setInterval(async () => {
    const data = await apiGet();
    if (!data) return;

    // Faqat farq bo'lsa yangilaymiz (ortiqcha render bo'lmasin)
    const serverStr = JSON.stringify(data);
    const localStr  = JSON.stringify({ participants, endTime, logs });
    if (serverStr !== localStr) {
        participants = data.participants.map(p => ({ ...p, penaltyMoney: p.penaltyMoney ?? 0 }));
        endTime      = data.endTime ?? null;
        logs         = data.logs    ?? [];
        renderUI();
        renderLogs();
        renderMoney();
    }
}, 5000);

// ─── Tugmalar ─────────────────────────────────────────────────────────────────
function showRefreshUI() {
    if (refreshBtn) refreshBtn.style.display = 'inline-block';
    if (startBtn)   startBtn.style.display   = 'none';
}

if (startBtn) {
    startBtn.onclick = async () => {
        if (confirm('6 kunlik challenge boshlansinmi?')) {
            endTime = Date.now() + CHALLENGE_DURATION;
            await apiSave();
            if (startBtn) startBtn.style.display = 'none';
            startTimer();
            renderUI();
        }
    };
}

if (saveBtn) {
    saveBtn.onclick = async () => {
        await apiSave();
        alert('Natijalar saqlandi!');
    };
}

if (refreshBtn) {
    refreshBtn.onclick = async () => {
        if (confirm("Haqiqatdan ham hammasini noldan boshlamoqchimisiz?")) {
            askPassword(async () => {
                const ok = await apiReset();
                if (ok) location.reload();
                else alert('Xato yuz berdi!');
            });
        }
    };
}

if (infoBtn) infoBtn.onclick = () => modal.style.display = 'flex';

const closeBtn = document.querySelector('.close-modal');
if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

// ─── Ishga tushirish ──────────────────────────────────────────────────────────
loadData();
