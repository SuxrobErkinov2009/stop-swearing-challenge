let participants = [
    { id: 1, name: "Suxrob Erkinov", score: 15, exercises: [], nextAllowedTime: null },
    { id: 2, name: "Jonibek Sulaymonov", score: 15, exercises: [], nextAllowedTime: null },
    { id: 3, name: "Otabek Sulaymonov", score: 15, exercises: [], nextAllowedTime: null },
    { id: 4, name: "Ansor G'ulomov", score: 15, exercises: [], nextAllowedTime: null }
];

let logs = [];
let activeParticipantId = null;
let securityCallback = null;

let timerInterval;
let endTime = null;
const CHALLENGE_DURATION = 6 * 24 * 60 * 60 * 1000;
const COOLDOWN_TIME = 3 * 60 * 1000;

const EXERCISE_POOL = [
    "30ta anjimaniya 💪",
    "100 ta o'tirib turish 🏃‍♂️",
    "50 ta pres kachat 🏋️‍♂️"
];

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
    passwordModal.style.display = "flex";
    adminPasswordInput.focus();
    securityCallback = onSuccess;
}

submitPasswordBtn.onclick = function () {
    if (verifySecureKey(adminPasswordInput.value)) {
        passwordModal.style.display = "none";
        if (securityCallback) securityCallback();
    } else {
        alert("Noto'g'ri parol! Ruxsat berilmadi.");
        passwordModal.style.display = "none";
    }
};

cancelPasswordBtn.onclick = function () {
    passwordModal.style.display = "none";
};

function saveData() {
    const data = { participants, endTime, logs };
    localStorage.setItem('swearing_challenge_backup', JSON.stringify(data));
}

function loadData() {
    const local = localStorage.getItem('swearing_challenge_backup');
    if (local) {
        const parsed = JSON.parse(local);
        participants = parsed.participants.map(p => ({
            ...p,
            exercises: p.exercises !== undefined ? p.exercises : []
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
        reasonModal.style.display = "flex";
        reasonInput.focus();
    });
};

submitReasonBtn.onclick = function () {
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

        const randomExercise = EXERCISE_POOL[Math.floor(Math.random() * EXERCISE_POOL.length)];
        p.exercises.push(randomExercise);

        p.nextAllowedTime = now + COOLDOWN_TIME;

        logs.unshift({
            name: p.name,
            remainingScore: p.score,
            reason: reasonText,
            timestamp: now
        });

        reasonModal.style.display = "none";
        triggerFlashEffect();

        if (p.score === 0) {
            const gameOverAudio = new Audio('./ovozlar/gameover.MP3');
            gameOverAudio.play();
        } else {
            const errorAudio = new Audio('./ovozlar/error.MP3');
            errorAudio.play();

            setTimeout(() => {
                const lockAudio = new Audio('./ovozlar/lock.MP3');
                lockAudio.play();
            }, 1000);
        }

        saveData();
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
    reasonModal.style.display = "none";
};

window.payFine = function (id, exerciseIndex) {
    const p = participants.find(x => x.id === id);
    if (!p || !p.exercises || p.exercises.length === 0) return;

    askPassword(() => {
        if (confirm(`Ushbu mashq bajarildimi? Ro'yxatdan o'chiramizmi?`)) {
            p.exercises.splice(exerciseIndex, 1);
            saveData();
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
        row.style.flexDirection = 'column';
        row.style.alignItems = 'flex-start';
        row.style.gap = '10px';
        row.style.padding = '15px';

        let exercisesHtml = '';
        if (p.exercises.length === 0) {
            exercisesHtml = `<div style="color: #2ed573; font-size: 14px;">Qarzdorlik yo'q, daxshat! 😎</div>`;
        } else {
            p.exercises.forEach((ex, idx) => {
                exercisesHtml += `
                    <div class="money-right" style="width: 100%; justify-content: space-between; margin-bottom: 5px;">
                        <div class="money-val" style="font-size: 15px;">🏃 Majburiyat: ${ex}</div>
                        <button class="pay-btn" onclick="payFine(${p.id}, ${idx})">Bajarildi</button>
                    </div>
                `;
            });
        }

        row.innerHTML = `
            <div class="money-name" style="font-weight: bold; border-bottom: 1px solid #333; width: 100%; padding-bottom: 5px; color: #fff;">${p.name}</div>
            <div style="width: 100%; display: flex; flex-direction: column; gap: 5px;">
                ${exercisesHtml}
            </div>
        `;
        moneyContainer.appendChild(row);
    });
}

function formatLogTime(item) {
    if (!item.timestamp && !item.time) return "Noma'lum vaqt";

    const date = item.timestamp ? new Date(item.timestamp) : new Date();
    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const logDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const timeString = item.timestamp
        ? date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
        : item.time;

    if (logDate.getTime() === today.getTime() || !item.timestamp) {
        return `Bugun, ${timeString}`;
    } else if (logDate.getTime() === yesterday.getTime()) {
        return `Kecha, ${timeString}`;
    } else {
        const day = date.getDate();
        const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
        const monthName = months[date.getMonth()];
        return `${day}-${monthName}, ${timeString}`;
    }
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

        const displayTime = formatLogTime(item);

        logItem.innerHTML = `
            <div class="log-left">
                <div class="log-user-info">${item.name} <span class="current-score">Qolgan ball: ${item.remainingScore}</span></div>
                <div class="log-reason">🚨 Sabab: ${item.reason}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px;">
                <div class="log-time">${displayTime}</div>
                <button onclick="deleteLog(${index})" style="background: none; border: none; color: #ff4757; font-size: 20px; cursor: pointer; font-weight: bold; padding: 0 5px;" title="Tarixdan o'chirish">×</button>
            </div>
        `;
        logsContainer.appendChild(logItem);
    });
}

window.deleteLog = function (index) {
    askPassword(() => {
        if (confirm("Ushbu yozuvni tarixdan o'chirmoqchimisiz?")) {
            logs.splice(index, 1);
            saveData();
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

setInterval(() => {
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
}, 1000);

function showRefreshUI() {
    if (refreshBtn) refreshBtn.style.display = 'inline-block';
    if (startBtn) startBtn.style.display = 'none';
}

if (startBtn) {
    startBtn.onclick = () => {
        if (confirm("6 kunlik challenge boshlansinmi?")) {
            endTime = Date.now() + CHALLENGE_DURATION;
            saveData();
            loadData();
        }
    };
}

if (saveBtn) saveBtn.onclick = () => { saveData(); alert("Natijalar saqlandi!"); };
if (refreshBtn) refreshBtn.onclick = () => { if (confirm("Haqiqatdan ham hammasini noldan boshlamoqchimisiz?")) { localStorage.clear(); location.reload(); } };
if (infoBtn) infoBtn.onclick = () => modal.style.display = "flex";

const closeBtn = document.querySelector(".close-modal");
if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };

loadData();