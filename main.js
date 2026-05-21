let participants = [
    { id: 1, name: "Suxrob Erkinov", score: 15, exercises: [], nextAllowedTime: null, shields: 0, lastShieldUpdate: null },
    { id: 2, name: "Jonibek Sulaymonov", score: 15, exercises: [], nextAllowedTime: null, shields: 0, lastShieldUpdate: null },
    { id: 3, name: "Otabek Sulaymonov", score: 15, exercises: [], nextAllowedTime: null, shields: 0, lastShieldUpdate: null },
    { id: 4, name: "Ansor G'ulomov", score: 15, exercises: [], nextAllowedTime: null, shields: 0, lastShieldUpdate: null }
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

// Barabanda jami 13 ta teng sektor (360 / 13 = 27.69 darajadan)
const WHEEL_OPTIONS = [
    { text: "Siz omadlisiz 😍", type: "lucky", color: "#2ed573" },
    { text: "Qalqon yutdingiz 🛡️", type: "shield_reward", color: "#1e90ff" },
    { text: "2X ball dan maxrum bo'ldingiz 💀", type: "double_minus", color: "#ff4757" },
    // 10 ta "Hech narsa" sektori
    { text: "Hech narsa 🤐", type: "nothing", color: "#f1c40f" },
    { text: "Hech narsa 🤐", type: "nothing", color: "#e67e22" },
    { text: "Hech narsa 🤐", type: "nothing", color: "#f1c40f" },
    { text: "Hech narsa 🤐", type: "nothing", color: "#e67e22" },
    { text: "Hech narsa 🤐", type: "nothing", color: "#f1c40f" },
    { text: "Hech narsa 🤐", type: "nothing", color: "#e67e22" },
    { text: "Hech narsa 🤐", type: "nothing", color: "#f1c40f" },
    { text: "Hech narsa 🤐", type: "nothing", color: "#e67e22" },
    { text: "Hech narsa 🤐", type: "nothing", color: "#f1c40f" },
    { text: "Hech narsa 🤐", type: "nothing", color: "#e67e22" }
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
            shields: (p.shields !== undefined && p.shields !== null) ? p.shields : 0,
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
    drawWheel();
}

function updateShieldsAuto() {
    if (!endTime) return;
    const now = Date.now();
    participants.forEach(p => {
        if (!p.lastShieldUpdate) { p.lastShieldUpdate = endTime - CHALLENGE_DURATION; }
        const diff = now - p.lastShieldUpdate;
        const hours48 = 48 * 60 * 60 * 1000;
        if (diff >= hours48) {
            const count = Math.floor(diff / hours48);
            p.shields += count;
            p.lastShieldUpdate = p.lastShieldUpdate + (count * hours48);
        }
    });
    saveData();
}

function drawWheel() {
    if (!wheelCanvas) return;
    const ctx = wheelCanvas.getContext("2d");
    const numSectors = WHEEL_OPTIONS.length;
    const arc = (2 * Math.PI) / numSectors;
    const radius = wheelCanvas.width / 2;

    ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);

    WHEEL_OPTIONS.forEach((opt, i) => {
        const angle = i * arc;
        ctx.fillStyle = opt.color;
        ctx.beginPath();
        ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius, angle, angle + arc);
        ctx.lineTo(radius, radius);
        ctx.fill();

        // Matnni yozish
        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.translate(radius, radius);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = "right";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(opt.text.substring(0, 15), radius - 15, 5);
        ctx.restore();
    });
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

    // 1-QADAM: Birinchi bo'lib admin paroli so'raladi
    askPassword(() => {
        activeParticipantId = id;

        // Agar qalqoni bo'lsa, avtomatik ravishda qalqon himoya qiladi va g'ildirak aylanmaydi
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

    try { const shieldAudio = new Audio('./ovozlar/shield.MP3'); shieldAudio.play(); } catch (e) { }

    saveData(); renderUI(); renderLogs();
}

// RO'PARA-ROSA 6 SEKUNDLI AYLANISH LOGIKASI
spinBtn.onclick = function () {
    if (isSpinning) return;
    isSpinning = true;
    wheelResult.innerText = "G'ildirak aylanmoqda... 🎲";

    const numSectors = WHEEL_OPTIONS.length;
    const sectorSelected = Math.floor(Math.random() * numSectors);

    const sectorArcDeg = 360 / numSectors;
    // Ko'rsatkich tepada (▼) turganligi sababli hisoblash inversiyasi
    const targetDegree = 360 - (sectorSelected * sectorArcDeg) - (sectorArcDeg / 2);
    const totalRotation = 2880 + targetDegree; // Kamida 8 marta to'liq aylanish

    wheelCanvas.style.transition = "transform 6s cubic-bezier(0.1, 0.8, 0.1, 1)";
    wheelCanvas.style.transform = `rotate(${totalRotation}deg)`;

    setTimeout(() => {
        isSpinning = false;
        let targetOption = WHEEL_OPTIONS[sectorSelected];

        wheelResult.innerText = `Natija: ${targetOption.text}`;
        currentWheelModifier = targetOption.type;

        setTimeout(() => {
            wheelModal.style.display = "none";
            executeWheelResult(targetOption);
        }, 1500);

    }, 6000); // Qat'iy 6 soniya aylanish vaqti
};

function executeWheelResult(option) {
    const p = participants.find(x => x.id === activeParticipantId);
    if (!p) return;

    // SHART 1: "Siz omadlisiz" tushsa hech narsa bo'lmaydi, jarima ham yo'q, ball ham ketmaydi!
    if (option.type === "lucky") {
        logs.unshift({
            name: p.name,
            remainingScore: p.score,
            reason: "🍀 Omad g'ildiragida 'Siz omadlisiz 😍' sektori chiqdi! Ball ayirilmadi va jazo qo'shilmadi.",
            timestamp: Date.now()
        });
        p.nextAllowedTime = Date.now() + COOLDOWN_TIME;
        alert(`${p.name} siz bugun juda omadlisiz! Ballingiz joyida qoldi.`);
        saveData(); renderUI(); renderLogs(); return;
    }

    // Boshqa har qanday holat uchun sabab yozish oynasi ochiladi va tarixga muhrlanadi
    reasonTargetText.innerText = `${p.name} uchun qoida buzilish sababini kiriting [Natija: ${option.text}]:`;
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
        let logActionPrefix = "🚨 Sabab";
        const randomExercise = EXERCISE_POOL[Math.floor(Math.random() * EXERCISE_POOL.length)];

        // SHART 2: Qalqon yutdingiz -> +1 Qalqon va 1 ta random jazo (ball ketmaydi)
        if (currentWheelModifier === "shield_reward") {
            p.shields++;
            p.exercises.push(randomExercise);
            logActionPrefix = "🛡️ [QALQON + JAZO] Sabab";
        }
        // SHART 3: 2X ball dan mahrum bo'ldingiz -> -2 ball va 1 ta random jazo
        else if (currentWheelModifier === "double_minus") {
            p.score -= 2;
            if (p.score < 0) p.score = 0;
            p.exercises.push(randomExercise);
            logActionPrefix = "💀 [2X MINUS BALL] Sabab";
        }
        // SHART 4: Hech narsa -> -1 ball va 1 ta random jazo
        else if (currentWheelModifier === "nothing") {
            p.score--;
            if (p.score < 0) p.score = 0;
            p.exercises.push(randomExercise);
            logActionPrefix = "🤐 [JARIMA] Sabab";
        }

        p.nextAllowedTime = now + COOLDOWN_TIME;

        logs.unshift({
            name: p.name,
            remainingScore: p.score,
            reason: `${logActionPrefix}: ${reasonText} (Yuklangan Vazifa: ${currentWheelModifier !== 'lucky' ? randomExercise : 'Yoq'})`,
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
        if (!p.exercises || p.exercises.length === 0) return;

        const row = document.createElement('div');
        row.className = 'money-row';
        row.style.padding = '10px';
        row.style.borderBottom = '1px solid #333';

        let exercisesHtml = '';
        p.exercises.forEach((ex, idx) => {
            exercisesHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; width:100%;">
                    <span style="color:#fff;">🏋️ ${ex}</span>
                    <button class="pay-btn" onclick="payFine(${p.id}, ${idx})" style="padding:2px 8px; cursor:pointer;">Bajarildi</button>
                </div>
            `;
        });

        row.innerHTML = `
            <div style="font-weight:bold; color:#00d4ff; margin-bottom:5px;">${p.name}:</div>
            <div style="width:100%;">${exercisesHtml}</div>
        `;
        moneyContainer.appendChild(row);
    });
}

function formatLogTime(item) {
    if (!item.timestamp) return "Bugun";
    const date = new Date(item.timestamp);
    return date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
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
        logItem.style.display = 'flex';
        logItem.style.justifyContent = 'space-between';
        logItem.style.marginBottom = '8px';
        logItem.innerHTML = `
            <div>
                <strong style="color:#ffd700;">${item.name}</strong> (Ball: ${item.remainingScore}) <br>
                <span style="color:#bbb; font-size:13px;">${item.reason}</span>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:12px; color:#888;">${formatLogTime(item)}</span>
                <button onclick="deleteLog(${index})" style="background:none; border:none; color:#ff4757; cursor:pointer; font-weight:bold;">×</button>
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
    document.getElementById('stat-king').innerText = kings.length > 0 ? kings.join(', ') : "--";
    let dangerOnes = participants.filter(p => p.score <= 5 && p.score > 0).map(p => p.name.split(' ')[0]);
    document.getElementById('stat-danger').innerText = dangerOnes.length > 0 ? dangerOnes.join(', ') : "--";

    participants.forEach(p => {
        const card = document.createElement('div');
        const isLeader = p.score === maxScore && p.score > 0;
        const isLocked = p.nextAllowedTime && now < p.nextAllowedTime;

        card.className = `card ${isLeader ? 'leader' : 'normal-card'}`;
        card.style.position = 'relative';

        const shieldDisplay = p.shields > 0 ? `<div class="shield-box" style="position:absolute; top:10px; right:10px; background:#1e90ff; padding:2px 6px; border-radius:4px; font-size:12px;">🛡️ x${p.shields}</div>` : '';

        card.innerHTML = `
            ${shieldDisplay}
            <h3 style="margin-top:15px;">${p.name}</h3>
            <div class="score-box" id="score-${p.id}" style="font-size:24px; font-weight:bold; margin:10px 0;">${p.score} ball</div>
            <button class="minus-btn" ${(isLocked || isGameOver || p.score <= 0) ? 'disabled' : ''} onclick="subtract(${p.id})" style="padding:5px 15px; cursor:pointer;">Ball Ayirish</button>
            <div style="font-size:12px; color:#ff4757; margin-top:5px;">${isLocked ? 'Kutish vaqti active' : ''}</div>
        `;
        grid.appendChild(card);
    });
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
                p.shields = 0;
                p.score = 15;
                p.exercises = [];
            });
            logs = [];
            saveData(); loadData();
        }
    };
}

if (saveBtn) saveBtn.onclick = () => { saveData(); alert("Natijalar muvaffaqiyatli saqlandi! 💾"); };
if (infoBtn) infoBtn.onclick = () => modal.style.display = "flex";

const closeBtn = document.querySelector(".close-modal");
if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };

loadData();