let participants = [
    { id: 1, name: "Suxrob Erkinov", score: 15, penaltyMoney: 0, nextAllowedTime: null },
    { id: 2, name: "Jonibek Sulaymonov", score: 15, penaltyMoney: 0, nextAllowedTime: null },
    { id: 3, name: "Otabek Sulaymonov", score: 15, penaltyMoney: 0, nextAllowedTime: null },
    { id: 4, name: "Ansor G'ulomov", score: 15, penaltyMoney: 0, nextAllowedTime: null }
];

let logs = [];
let activeParticipantId = null;
let securityCallback = null;

let timerInterval;
let endTime = null;
const CHALLENGE_DURATION = 6 * 24 * 60 * 60 * 1000;
const COOLDOWN_TIME = 3 * 60 * 1000;

const grid = document.getElementById('participants-grid');
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('startTimerBtn');
const saveBtn = document.getElementById('saveBtn');
const refreshBtn = document.getElementById('refreshBtn');
const infoBtn = document.getElementById('infoBtn');
const modal = document.getElementById("infoModal");
const flashOverlay = document.getElementById("flash-overlay");

const reasonModal = document.getElementById("reasonModal");
const reasonInput = document.getElementById("penaltyReasonInput");
const reasonTargetText = document.getElementById("reasonModalTarget");
const cancelReasonBtn = document.getElementById("cancelReasonBtn");
const submitReasonBtn = document.getElementById("submitReasonBtn");
const logsContainer = document.getElementById("logs-container");
const moneyContainer = document.getElementById("money-container");

const passwordModal = document.getElementById("passwordModal");
const adminPasswordInput = document.getElementById("adminPasswordInput");
const cancelPasswordBtn = document.getElementById("cancelPasswordBtn");
const submitPasswordBtn = document.getElementById("submitPasswordBtn");

function verifySecureKey(input) {
    return btoa(input) === "ODU5MDA5MTExNw==";
}

function askPassword(onSuccess) {
    adminPasswordInput.value = '';
    passwordModal.style.setProperty('display', 'flex', 'important');
    adminPasswordInput.focus();
    securityCallback = onSuccess;
}

submitPasswordBtn.onclick = function () {
    if (verifySecureKey(adminPasswordInput.value)) {
        passwordModal.style.setProperty('display', 'none', 'important');
        if (securityCallback) securityCallback();
    } else {
        alert("Noto'g'ri parol! Ruxsat berilmadi.");
        passwordModal.style.setProperty('display', 'none', 'important');
    }
};

cancelPasswordBtn.onclick = function () {
    passwordModal.style.setProperty('display', 'none', 'important');
};

async function saveData() {
    const data = { participants, endTime, logs };
    try {
        await fetch('/api/save-challenge-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (error) {
        console.error("Serverga saqlashda xato:", error);
    }
}

async function loadData() {
    try {
        const response = await fetch('/api/get-challenge-data');
        const parsed = await response.json();

        if (parsed) {
            participants = parsed.participants.map(p => ({
                ...p,
                penaltyMoney: p.penaltyMoney !== undefined ? p.penaltyMoney : 0
            }));
            endTime = parsed.endTime;
            logs = parsed.logs || [];
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
    } catch (error) {
        console.error("Serverdan yuklashda xato:", error);
    }
}

function triggerFlashEffect() {
    if (!flashOverlay) return;
    flashOverlay.classList.add("flash-active");
    setTimeout(() => {
        flashOverlay.classList.remove("flash-active");
    }, 150);
}

window.subtract = function (id) {
    const now = Date.now();
    if (endTime && now >= endTime) return;

    const p = participants.find(x => x.id === id);
    if (!p || (p.nextAllowedTime && now < p.nextAllowedTime) || p.score <= 0) return;

    askPassword(() => {
        activeParticipantId = id;
        reasonTargetText.innerText = `${p.name} dan 1 ball ayirish uchun sabab yozing:`;
        reasonInput.value = '';

        reasonModal.style.setProperty('display', 'flex', 'important');
        document.body.style.setProperty('overflow', 'hidden', 'important');
        reasonInput.focus();
    });
};

submitReasonBtn.onclick = async function () {
    const reasonText = reasonInput.value.trim();
    if (!reasonText) {
        alert("Iltimos, sababni kiriting!");
        return;
    }

    const id = activeParticipantId;
    const p = participants.find(x => x.id === id);
    const now = Date.now();

    if (p) {
        p.score--;
        p.penaltyMoney += 2000;
        p.nextAllowedTime = now + COOLDOWN_TIME;

        const currentHour = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

        logs.unshift({
            name: p.name,
            remainingScore: p.score,
            reason: reasonText,
            time: currentHour
        });

        reasonModal.style.setProperty('display', 'none', 'important');
        document.body.style.setProperty('overflow', 'auto', 'important');
        triggerFlashEffect();

        if (p.score === 0) {
            new Audio('./ovozlar/gameover.MP3').play().catch(() => { });
        } else {
            new Audio('./ovozlar/error.MP3').play().catch(() => { });
            setTimeout(() => {
                new Audio('./ovozlar/lock.MP3').play().catch(() => { });
            }, 1000);
        }

        await saveData();
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

cancelReasonBtn.onclick = function () {
    reasonModal.style.setProperty('display', 'none', 'important');
    document.body.style.setProperty('overflow', 'auto', 'important');
};

window.payFine = function (id) {
    const p = participants.find(x => x.id === id);
    if (!p || p.penaltyMoney <= 0) return;

    askPassword(async () => {
        if (confirm(`${p.name} 2 000 so'm jarima to'ladi, hisobdan kamaytiramizmi?`)) {
            p.penaltyMoney -= 2000;
            if (p.penaltyMoney < 0) p.penaltyMoney = 0;
            await saveData();
            renderMoney();
        }
    });
};

function renderMoney() {
    if (!moneyContainer) return;
    moneyContainer.innerHTML = '';
    participants.forEach(p => {
        const row = document.createElement('div');
        row.className = 'money-row';
        row.innerHTML = `
            <div class="money-name">${p.name}</div>
            <div class="money-right">
                <div class="money-val">${p.penaltyMoney.toLocaleString('uz-UZ')} so'm</div>
                <button class="pay-btn" onclick="payFine(${p.id})" ${p.penaltyMoney <= 0 ? 'style="display:none;"' : ''}>To'lash</button>
            </div>
        `;
        moneyContainer.appendChild(row);
    });
}

function renderLogs() {
    if (!logsContainer) return;
    if (logs.length === 0) {
        logsContainer.innerHTML = `<div class="no-logs">Hozircha hech kim qoidani buzgani yo'q. Baraka topinglar! 🙌</div>`;
        return;
    }

    logsContainer.innerHTML = '';
    logs.forEach((item, index) => {
        const logItem = document.createElement('div');
        logItem.className = 'log-item';
        logItem.innerHTML = `
            <div class="log-left">
                <div class="log-user-info">${item.name} <span class="current-score">Qolgan ball: ${item.remainingScore}</span></div>
                <div class="log-reason">🚨 Sabab: ${item.reason}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px;">
                <div class="log-time">Bugun, ${item.time}</div>
                <button onclick="deleteLog(${index})" style="background: none; border: none; color: #ff4757; font-size: 20px; cursor: pointer; font-weight: bold; padding: 0 5px;" title="Tarixdan o'chirish">×</button>
            </div>
        `;
        logsContainer.appendChild(logItem);
    });
}

window.deleteLog = function (index) {
    askPassword(async () => {
        if (confirm("Ushbu yozuvni tarixdan o'chirmoqchimisiz?")) {
            logs.splice(index, 1);
            await saveData();
            renderLogs();
        }
    });
};

function renderUI() {
    if (!grid) return;
    grid.innerHTML = '';
    const now = Date.now();
    const isGameOver = endTime ? now >= endTime : false;

    const scores = participants.map(p => p.score);
    const maxScore = Math.max(...scores);

    let totalLost = participants.reduce((sum, p) => sum + (15 - p.score), 0);
    document.getElementById('stat-total-lost').innerText = totalLost;

    let kings = participants.filter(p => p.score === maxScore && p.score > 0).map(p => p.name.split(' ')[0]);
    document.getElementById('stat-king').innerText = kings.length > 0 ? kings.join(', ') : "Hech kim";

    let dangerOnes = participants.filter(p => p.score <= 5 && p.score > 0).map(p => p.name.split(' ')[0]);
    document.getElementById('stat-danger').innerText = dangerOnes.length > 0 ? dangerOnes.join(', ') : "Yo'q";

    participants.forEach(p => {
        const card = document.createElement('div');
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

function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const now = Date.now();
        const timeLeft = endTime - now;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerDisplay.innerText = "00:00:00:00";
            showRefreshUI();
            renderUI();
        } else {
            const d = Math.floor(timeLeft / 86400000);
            const h = Math.floor((timeLeft % 86400000) / 3600000);
            const m = Math.floor((timeLeft % 3600000) / 60000);
            const s = Math.floor((timeLeft % 60000) / 1000);
            timerDisplay.innerText = `${String(d).padStart(2, '0')}:${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
    }, 1000);
}

setInterval(async () => {
    const now = Date.now();
    let shartliYangilash = false;

    participants.forEach(p => {
        if (p.nextAllowedTime) {
            if (now < p.nextAllowedTime) {
                shartliYangilash = true;
            } else {
                p.nextAllowedTime = null;
                shartliYangilash = true;
                saveData();
            }
        }
    });

    if (shartliYangilash && (!endTime || now < endTime)) {
        renderUI();
    }

    const anybodyLocked = participants.some(p => p.nextAllowedTime && now < p.nextAllowedTime);
    if (!anybodyLocked) {
        try {
            const response = await fetch('/api/get-challenge-data');
            const parsed = await response.json();

            if (parsed && (
                JSON.stringify(participants) !== JSON.stringify(parsed.participants) ||
                endTime !== parsed.endTime ||
                logs.length !== (parsed.logs ? parsed.logs.length : 0)
            )) {
                participants = parsed.participants || [];
                endTime = parsed.endTime;
                logs = parsed.logs || [];

                if (endTime && now < endTime) {
                    if (startBtn) startBtn.style.display = 'none';
                    startTimer();
                } else if (endTime && now >= endTime) {
                    showRefreshUI();
                }

                renderUI();
                renderLogs();
                renderMoney();
            }
        } catch (e) {
            console.error("Sinxronizatsiyada xato:", e);
        }
    }
}, 3000);

function showRefreshUI() {
    if (refreshBtn) refreshBtn.style.display = 'inline-block';
    if (startBtn) startBtn.style.display = 'none';
}

if (startBtn) {
    startBtn.onclick = async () => {
        if (confirm("6 kunlik challenge boshlansinmi?")) {
            endTime = Date.now() + CHALLENGE_DURATION;
            await saveData();
            await loadData();
        }
    };
}

if (saveBtn) saveBtn.onclick = async () => { await saveData(); alert("Natijalar muvaffaqiyatli serverga saqlandi!"); };

if (refreshBtn) {
    refreshBtn.onclick = async () => {
        if (confirm("Haqiqatdan ham hammasini noldan boshlamoqchimisiz?")) {
            const resetData = {
                participants: [
                    { id: 1, name: "Suxrob Erkinov", score: 15, penaltyMoney: 0, nextAllowedTime: null },
                    { id: 2, name: "Jonibek Sulaymonov", score: 15, penaltyMoney: 0, nextAllowedTime: null },
                    { id: 3, name: "Otabek Sulaymonov", score: 15, penaltyMoney: 0, nextAllowedTime: null },
                    { id: 4, name: "Ansor G'ulomov", score: 15, penaltyMoney: 0, nextAllowedTime: null },
                ],
                endTime: null,
                logs: []
            };
            await fetch('/api/save-challenge-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resetData)
            });
            location.reload();
        }
    };
}

if (infoBtn) {
    infoBtn.onclick = () => {
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('position', 'fixed', 'important');
        modal.style.setProperty('top', '0', 'important');
        modal.style.setProperty('left', '0', 'important');
        modal.style.setProperty('width', '100vw', 'important');
        modal.style.setProperty('height', '100vh', 'important');
        modal.style.setProperty('align-items', 'center', 'important');
        modal.style.setProperty('justify-content', 'center', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
        modal.style.setProperty('background', 'rgba(0, 0, 0, 0.85)', 'important');

        document.body.style.setProperty('overflow', 'hidden', 'important');
        document.body.style.setProperty('height', '100vh', 'important');

        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.setProperty('margin', 'auto', 'important');
            content.style.setProperty('width', '90%', 'important');
            content.style.setProperty('max-width', '520px', 'important');
            content.style.setProperty('max-height', 'calc(100vh - 40px)', 'important');
            content.style.setProperty('overflow-y', 'auto', 'important');
            content.style.setProperty('position', 'relative', 'important');
            content.style.setProperty('display', 'block', 'important');
            content.style.setProperty('border-radius', '12px', 'important');
        }
    };
}

const closeBtn = document.querySelector(".close-modal");
if (closeBtn) {
    closeBtn.onclick = () => {
        modal.style.setProperty('display', 'none', 'important');
        document.body.style.setProperty('overflow', 'auto', 'important');
        document.body.style.removeProperty('height');
    };
}

window.onclick = (e) => {
    if (e.target == modal) {
        modal.style.setProperty('display', 'none', 'important');
        document.body.style.setProperty('overflow', 'auto', 'important');
        document.body.style.removeProperty('height');
    }
};

loadData();