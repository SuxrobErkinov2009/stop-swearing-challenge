let participants = [
    { id: 1, name: "Suxrob Erkinov", score: 15, exercises: [], nextAllowedTime: null, shields: 1, lastShieldUpdate: null },
    { id: 2, name: "Jonibek Sulaymonov", score: 15, exercises: [], nextAllowedTime: null, shields: 1, lastShieldUpdate: null },
    { id: 3, name: "Otabek Sulaymonov", score: 15, exercises: [], nextAllowedTime: null, shields: 1, lastShieldUpdate: null },
    { id: 4, name: "Ansor G'ulomov", score: 15, exercises: [], nextAllowedTime: null, shields: 1, lastShieldUpdate: null }
];

let logs = [];
let activeParticipantId = null;
let securityCallback = null;

let timerInterval;
let endTime = null;
const CHALLENGE_DURATION = 6 * 24 * 60 * 60 * 1000;
const COOLDOWN_TIME = 5 * 1000;

const EXERCISE_POOL = [
    "30ta anjimaniya 💪",
    "100 ta o'tirib turish 🏃‍♂️",
    "50 ta pres kachat 🏋️‍♂️"
];

// Omad g'ildiragi shartlari (4 ta teng sektorga to'g'rilandi: har biri 90 gradusdan)
const WHEEL_OPTIONS = [
    { text: "Siz omadlisiz 😍", minDeg: 0, maxDeg: 90, type: "lucky" },
    { text: "2X jazo ehh 💀", minDeg: 91, maxDeg: 180, type: "double" },
    { text: "Hech narsa 🤐", minDeg: 181, maxDeg: 270, type: "nothing" },
    { text: "Mashq bajarmaslik 🧘‍♂️", minDeg: 271, maxDeg: 360, type: "no_exercise" }
];

let isSpinning = false;
let currentWheelModifier = "nothing";

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

const wheelModal = document.getElementById("wheelModal");
const wheelCanvas = document.getElementById("wheelCanvas");
const wheelResult = document.getElementById("wheelResult");
const spinBtn = document.getElementById("spinBtn");
const wheelTargetText = document.getElementById("wheelTargetText");

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

cancelPasswordBtn.onclick = function () { passwordModal.style.display = "none"; };

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
            exercises: p.exercises !== undefined ? p.exercises : [],
            // Agar localstorage'da qalqon qiymati noto'g'ri bo'lsa yoki nol bo'lsa, kamida 1 ta beradi
            shields: (p.shields !== undefined && p.shields !== null) ? p.shields : 1,
            lastShieldUpdate: p.lastShieldUpdate !== undefined ? p.lastShieldUpdate : null
        }));
        endTime = parsed.endTime;
        logs = parsed.logs || [];
    }

    updateShieldsAuto();

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

function updateShieldsAuto() {
    if (!endTime) return;
    const now = Date.now();
    participants.forEach(p => {
        if (!p.lastShieldUpdate) { p.lastShieldUpdate = endTime - CHALLENGE_DURATION; }
        const diff = now - p.lastShieldUpdate;
        const hours24 = 24 * 60 * 60 * 1000;
        if (diff >= hours24) {
            const count = Math.floor(diff / hours24);
            p.shields += count;
            p.lastShieldUpdate = p.lastShieldUpdate + (count * hours24);
        }
    });
    saveData();
}

function triggerFlashEffect() {
    if (!flashOverlay) return;
    flashOverlay.classList.add("flash-active");
    setTimeout(() => { flashOverlay.classList.remove("flash-active"); }, 150);
}

window.subtract = function (id) {
    const now = Date.now();
    if (endTime && now >= endTime) return;

    const p = participants.find(x => x.id === id);
    if (!p || (p.nextAllowedTime && now < p.nextAllowedTime) || p.score <= 0) return;

    askPassword(() => {
        activeParticipantId = id;

        // Agar himoya qalqoni mavjud bo'lsa, birinchi bo'lib qalqon ishlaydi va g'ildirak ochilmaydi
        if (p.shields > 0) {
            triggerShieldProtection(p);
            return;
        }

        wheelTargetText.innerText = `${p.name} uchun Omad G'ildiragi aylantirilmoqda!`;
        wheelResult.innerText = "G'ildirakni aylantiring...";
        wheelCanvas.style.transform = "rotate(0deg)";
        wheelModal.style.display = "flex";
    });
};

function triggerShieldProtection(p) {
    p.shields--;
    p.nextAllowedTime = Date.now() + COOLDOWN_TIME;

    logs.unshift({
        name: p.name,
        remainingScore: p.score,
        reason: "🛡️ Himoya qalqoni tufayli omon qoldi! Ball ayirilmadi.",
        timestamp: Date.now()
    });

    try {
        const shieldAudio = new Audio('./ovozlar/shield.MP3');
        shieldAudio.play();
    } catch (e) { }

    saveData();
    renderUI();
    renderLogs();

    const cardMsgBox = document.getElementById(`shield-alert-${p.id}`);
    if (cardMsgBox) {
        cardMsgBox.innerText = "Sizni qalqoningiz saqlab qoldi! 🛡️";
        cardMsgBox.style.display = "block";
        setTimeout(() => { cardMsgBox.style.display = "none"; }, 2000);
    }
}

spinBtn.onclick = function () {
    if (isSpinning) return;
    isSpinning = true;
    wheelResult.innerText = "G'ildirak aylanmoqda... 🎲";

    const randomDegree = Math.floor(Math.random() * 360);
    const totalRotation = 1800 + randomDegree;

    wheelCanvas.style.transform = `rotate(${totalRotation}deg)`;

    setTimeout(() => {
        isSpinning = false;
        // Pointer tepada bo'lgani bois burchakni teskari o'qish logikasi
        const normalizedDegree = (360 - (randomDegree % 360)) % 360;

        let targetOption = WHEEL_OPTIONS.find(opt => normalizedDegree >= opt.minDeg && normalizedDegree <= opt.maxDeg);
        if (!targetOption) targetOption = WHEEL_OPTIONS[2]; // Xatolik oldini olish uchun "Hech narsa" bo'limi

        wheelResult.innerText = `Natija: ${targetOption.text}`;
        currentWheelModifier = targetOption.type;

        setTimeout(() => {
            wheelModal.style.display = "none";
            executeWheelResult(targetOption);
        }, 1500);

    }, 4000);
};

function executeWheelResult(option) {
    const p = participants.find(x => x.id === activeParticipantId);
    if (!p) return;

    if (option.type === "lucky") {
        if (p.score >= 15) {
            alert(`${p.name}da ball maksimal holatda!`);
            logs.unshift({ name: p.name, remainingScore: p.score, reason: "🍀 Omad g'ildiragida 'Omadlisiz' tushdi, lekin ball 15 bo'lgani uchun o'zgarmadi.", timestamp: Date.now() });
        } else {
            p.score++;
            logs.unshift({ name: p.name, remainingScore: p.score, reason: "🍀 Omad g'ildiragida +1 ball mukofot yutib oldi!", timestamp: Date.now() });
        }
        p.nextAllowedTime = Date.now() + COOLDOWN_TIME;
        saveData(); renderUI(); renderLogs(); return;
    }

    reasonTargetText.innerText = `${p.name} uchun jarima sababi [Natija: ${option.text}]:`;
    reasonInput.value = '';
    reasonModal.style.display = "flex";
    reasonInput.focus();
}

submitReasonBtn.onclick = function () {
    const reasonText = reasonInput.value.trim();
    if (!reasonText) { alert("Iltimos, sababni kiriting!"); return; }

    const p = participants.find(x => x.id === activeParticipantId);
    const now = Date.now();

    if (p) {
        p.score--;
        const randomExercise = EXERCISE_POOL[Math.floor(Math.random() * EXERCISE_POOL.length)];
        let logActionPrefix = "🚨 Sabab";

        if (currentWheelModifier === "double") {
            p.exercises.push(`2X ${randomExercise}`);
            logActionPrefix = "💀 [2X JAZO] Sabab";
        } else if (currentWheelModifier === "no_exercise") {
            logActionPrefix = "🧘‍♂️ [Mashqsiz Jazo] Sabab";
        } else {
            p.exercises.push(randomExercise);
        }

        p.nextAllowedTime = now + COOLDOWN_TIME;

        logs.unshift({
            name: p.name,
            remainingScore: p.score,
            reason: `${logActionPrefix}: ${reasonText}`,
            timestamp: now
        });

        reasonModal.style.display = "none";
        triggerFlashEffect();

        if (p.score === 0) {
            try { const gameOverAudio = new Audio('./ovozlar/gameover.MP3'); gameOverAudio.play(); } catch (e) { }
        } else {
            try {
                const errorAudio = new Audio('./ovozlar/error.MP3'); errorAudio.play();
                setTimeout(() => { const lockAudio = new Audio('./ovozlar/lock.MP3'); lockAudio.play(); }, 1000);
            } catch (e) { }
        }

        saveData(); renderUI(); renderLogs(); renderMoney();

        const scoreEl = document.getElementById(`score-${p.id}`);
        if (scoreEl) {
            scoreEl.classList.add('score-change');
            setTimeout(() => scoreEl.classList.remove('score-change'), 500);
        }
    }
};

cancelReasonBtn.onclick = function () { reasonModal.style.display = "none"; };

window.payFine = function (id, exerciseIndex) {
    const p = participants.find(x => x.id === id);
    if (!p || !p.exercises || p.exercises.length === 0) return;

    askPassword(() => {
        if (confirm(`Ushbu jismoniy mashq chindan bajarildimi?`)) {
            p.exercises.splice(exerciseIndex, 1);
            saveData(); renderMoney();
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
        if (!p.exercises || p.exercises.length === 0) {
            exercisesHtml = `<div style="color: #2ed573; font-size: 14px;">Qarzdorlik yo'q, daxshat! 😎</div>`;
        } else {
            p.exercises.forEach((ex, idx) => {
                exercisesHtml += `
                    <div class="money-right" style="width: 100%; justify-content: space-between; margin-bottom: 5px;">
                        <div class="money-val" style="font-size: 15px;">🏋️ Jismoniy vazifa: ${ex}</div>
                        <button class="pay-btn" onclick="payFine(${p.id}, ${idx})">Bajarildi</button>
                    </div>
                `;
            });
        }

        row.innerHTML = `
            <div class="money-name" style="font-weight: bold; border-bottom: 1px solid #333; width: 100%; padding-bottom: 5px; color: #fff;">${p.name}</div>
            <div style="width: 100%; display: flex; flex-direction: column; gap: 5px;">${exercisesHtml}</div>
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

    const timeString = item.timestamp ? date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : item.time;

    if (logDate.getTime() === today.getTime() || !item.timestamp) { return `Bugun, ${timeString}`; }
    else if (logDate.getTime() === yesterday.getTime()) { return `Kecha, ${timeString}`; }
    else { return `${date.getDate()}-${["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"][date.getMonth()]}, ${timeString}`; }
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
                <div class="log-reason">${item.reason}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px;">
                <div class="log-time">${formatLogTime(item)}</div>
                <button onclick="deleteLog(${index})" style="background: none; border: none; color: #ff4757; font-size: 20px; cursor: pointer; font-weight: bold; padding: 0 5px;">×</button>
            </div>
        `;
        logsContainer.appendChild(logItem);
    });
}

window.deleteLog = function (index) {
    askPassword(() => {
        if (confirm("Ushbu yozuvni tarixdan o'chirmoqchimisiz?")) { logs.splice(index, 1); saveData(); renderLogs(); }
    });
};

function renderUI() {
    if (!grid) return;
    grid.innerHTML = '';
    const now = Date.now();
    const isGameOver = endTime ? now >= endTime : false;

    const scores = participants.map(p => p.score);
    const maxScore = Math.max(...scores);

    document.getElementById('stat-total-lost').innerText = participants.reduce((sum, p) => sum + (15 - p.score), 0);
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
        if (p.score <= 0) { statusHtml = `<div class="status-msg status-loser">Siz o'yinda mag'lub bo'ldingiz! 💀</div>`; }
        else if (isGameOver) { statusHtml = `<div class="status-msg status-winner">Tabriklaymiz! Qutilib qoldingiz!!! 🎉</div>`; }
        else { statusHtml = `<div class="cooldown-label">${isLocked ? formatTime(p.nextAllowedTime - now) : ''}</div>`; }

        const shieldDisplay = p.shields > 0 ? `<div class="shield-box">🛡️ x${p.shields}</div>` : '';

        card.innerHTML = `
            <span class="crown-icon">👑</span>
            ${shieldDisplay}
            <h3>${p.name}</h3>
            <div class="score-box" id="score-${p.id}">${p.score}</div>
            <div id="shield-alert-${p.id}" class="shield-alert-text" style="display: none;"></div>
            <button class="minus-btn ${(isLocked || isGameOver || p.score <= 0) ? 'disabled-btn' : ''}" 
                ${(isLocked || isGameOver || p.score <= 0) ? 'disabled' : ''} onclick="subtract(${p.id})"><span>×</span></button>
            ${statusHtml}
        `;
        grid.appendChild(card);
    });
}

function formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    return `${Math.floor(totalSec / 60)}:${(totalSec % 60) < 10 ? '0' : ''}${totalSec % 60}`;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const timeLeft = endTime - Date.now();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerDisplay.innerText = "00:00:00:00";
            showRefreshUI(); renderUI();
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
    updateShieldsAuto();

    participants.forEach(p => {
        if (p.nextAllowedTime) {
            if (now < p.nextAllowedTime) { shartliYangilash = true; }
            else { p.nextAllowedTime = null; shartliYangilash = true; saveData(); }
        }
    });
    if (shartliYangilash && (!endTime || now < endTime)) { renderUI(); }
}, 1000);

function showRefreshUI() { if (refreshBtn) refreshBtn.style.display = 'inline-block'; if (startBtn) startBtn.style.display = 'none'; }

if (startBtn) {
    startBtn.onclick = () => {
        if (confirm("6 kunlik challenge boshlansinmi?")) {
            endTime = Date.now() + CHALLENGE_DURATION;
            participants.forEach(p => {
                p.lastShieldUpdate = Date.now();
                p.shields = 1; // Start bosilganda barchaga 1 tadan qalqon beriladi
            });
            saveData(); loadData();
        }
    };
}

if (saveBtn) saveBtn.onclick = () => { saveData(); alert("Natijalar saqlandi!"); };
if (refreshBtn) refreshBtn.onclick = () => { if (confirm("Haqiqatdan ham noldan boshlamoqchimisiz?")) { localStorage.clear(); location.reload(); } };
if (infoBtn) infoBtn.onclick = () => modal.style.display = "flex";

const closeBtn = document.querySelector(".close-modal");
if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };

loadData();