// Ishtirokchilar ro'yxati (Boshlang'ich holat)
let participants = [
    { id: 1, name: "Suxrob Erkinov", score: 15, exercises: [], nextAllowedTime: null, shields: 0, lastShieldUpdate: Date.now() },
    { id: 2, name: "Jonibek Sulaymonov", score: 15, exercises: [], nextAllowedTime: null, shields: 0, lastShieldUpdate: Date.now() },
    { id: 3, name: "Otabek Sulaymonov", score: 15, exercises: [], nextAllowedTime: null, shields: 0, lastShieldUpdate: Date.now() },
    { id: 4, name: "Ansor G'ulomov", score: 15, exercises: [], nextAllowedTime: null, shields: 0, lastShieldUpdate: Date.now() }
];

let logs = [];
let activeParticipantId = null;
let securityCallback = null;
let currentWheelOption = null; // G'ildirakda tushgan variantni saqlash

let timerInterval;
let endTime = null;
const CHALLENGE_DURATION = 6 * 24 * 60 * 60 * 1000;
const COOLDOWN_TIME = 5 * 1000;
const SHIELD_GROWTH_TIME = 48 * 60 * 60 * 1000; // QALQON ENDI HAR 48 SOATDA BITTA QO'SHILADI!

const EXERCISE_POOL = [
    "30ta anjimaniya 💪",
    "100 ta o'tirib turish 🏃‍♂️",
    "50 ta pres kachat 🏋️‍♂️"
];

// Omad g'ildiragi variantlari (5 ta shart)
const WHEEL_OPTIONS = [
    { id: 1, text: "Siz omadlisiz! 🎉 +1 Ball", color: "#2ed573" },
    { id: 2, text: "2X JAZO EHH! 🚨", color: "#ff4757" },
    { id: 3, text: "Hech narsa (Oddiy jazo) 🛡️", color: "#ffa500" },
    { id: 4, text: "+1 QALQON QO'SHILDI 🛡️", color: "#00ecff" },
    { id: 5, text: "Mashq bajarmaslik! 🎭", color: "#9b59b6" }
];

// DOM Elementlar
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

// Ruletka DOM Elementlari
const wheelModal = document.getElementById("wheelModal");
const wheelCanvas = document.getElementById("wheelCanvas");
const wheelResult = document.getElementById("wheelResult");
const spinBtn = document.getElementById("spinBtn");

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

// Qalqonlarni har 48 soatda avtomat tekshirish funksiyasi
function updateShieldsPassive() {
    const now = Date.now();
    let changed = false;
    participants.forEach(p => {
        if (!p.lastShieldUpdate) p.lastShieldUpdate = now;
        const passedTime = now - p.lastShieldUpdate;
        if (passedTime >= SHIELD_GROWTH_TIME) {
            const newShields = Math.floor(passedTime / SHIELD_GROWTH_TIME);
            p.shields = (p.shields || 0) + newShields;
            p.lastShieldUpdate = now;
            changed = true;
        }
    });
    if (changed) saveData();
}

function loadData() {
    const local = localStorage.getItem('swearing_challenge_backup');
    if (local) {
        const parsed = JSON.parse(local);
        participants = parsed.participants.map(p => ({
            ...p,
            exercises: p.exercises !== undefined ? p.exercises : [],
            shields: p.shields !== undefined ? p.shields : 0,
            lastShieldUpdate: p.lastShieldUpdate !== undefined ? p.lastShieldUpdate : Date.now()
        }));
        endTime = parsed.endTime;
        logs = parsed.logs || [];
    }

    updateShieldsPassive();

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
    setTimeout(() => { flashOverlay.classList.remove("flash-active"); }, 150);
}

// Ball ayirish tugmasi bosilganda
window.subtract = function (id) {
    const now = Date.now();
    if (endTime && now >= endTime) return;

    const p = participants.find(x => x.id === id);
    if (!p || (p.nextAllowedTime && now < p.nextAllowedTime) || p.score <= 0) return;

    askPassword(() => {
        activeParticipantId = id;
        openWheelModal();
    });
};

// G'ildirakni ochish
function openWheelModal() {
    wheelResult.classList.remove("result-fade-in");
    wheelResult.innerText = "G'ildirakni aylantiring...";
    wheelCanvas.style.transform = "rotate(0deg)";
    wheelCanvas.style.transition = "none"; // Reset transitsiya
    spinBtn.style.display = "inline-block";
    wheelModal.style.display = "flex";
}

// G'ildirakni aylantirish tugmasi bosilganda
spinBtn.onclick = function () {
    spinBtn.style.display = "none";
    wheelResult.innerText = "G'ildirak aylanmoqda... 🎰";

    const randomIndex = Math.floor(Math.random() * WHEEL_OPTIONS.length);
    currentWheelOption = WHEEL_OPTIONS[randomIndex];

    const segmentDegrees = 360 / WHEEL_OPTIONS.length;
    // Kinetik va silliq to'xtash uchun transitsiya qo'shish
    wheelCanvas.style.transition = "transform 4s cubic-bezier(0.15, 0.7, 0.1, 1)";
    const targetDegrees = (360 * 8) + (randomIndex * segmentDegrees) + (segmentDegrees / 2);

    wheelCanvas.style.transform = `rotate(-${targetDegrees}deg)`;

    setTimeout(() => {
        wheelResult.classList.add("result-fade-in");
        wheelResult.innerHTML = `<span style="color: ${currentWheelOption.color}; font-size: 20px; text-shadow: 0 0 10px ${currentWheelOption.color};">● ${currentWheelOption.text}</span>`;

        setTimeout(() => {
            wheelModal.style.display = "none";
            executeWheelResult();
        }, 2000);

    }, 4000);
};

// G'ildirak natijasiga qarab ishlash mantig'i
function executeWheelResult() {
    const p = participants.find(x => x.id === activeParticipantId);
    if (!p) return;

    // --- QALQON TEKSHIRUVI ---
    if (currentWheelOption.id !== 1 && p.shields > 0) {
        p.shields--;
        saveData();

        const cards = grid.children;
        let targetCard = null;
        for (let card of cards) {
            if (card.querySelector(`button[onclick="subtract(${p.id})"]`)) {
                targetCard = card;
                break;
            }
        }

        if (targetCard) {
            targetCard.classList.add("shield-active-anim");
            const statusEl = document.getElementById(`status-msg-${p.id}`);
            if (statusEl) {
                statusEl.innerHTML = `<div style="color: #00d4ff; font-weight: bold; font-size: 14px; text-shadow: 0 0 10px #00d4ff; margin-top: 10px;">🛡️ QALQON SIZNI SAQLAB QOLDI!</div>`;
            }

            try { new Audio('./ovozlar/error.MP3').play(); } catch (e) { }

            setTimeout(() => {
                targetCard.classList.remove("shield-active-anim");
                renderUI();
            }, 2000);
        } else {
            renderUI();
        }
        return;
    }

    // --- 5 TA SHART IJROSI ---
    if (currentWheelOption.id === 1) {
        if (p.score >= 15) {
            alert(`Sizda maksimal ball mavjud! (${p.name})`);
        } else {
            p.score++;
            logs.unshift({
                name: p.name,
                remainingScore: p.score,
                reason: "🎰 Omad g'ildiragida +1 ball yutib oldi!",
                timestamp: Date.now()
            });
            saveData();
            renderUI();
            renderLogs();

            // Omadli ball qo'shilgandagi animatsiya portlashi
            const scoreEl = document.getElementById(`score-${p.id}`);
            if (scoreEl) {
                scoreEl.classList.add('score-change');
                setTimeout(() => scoreEl.classList.remove('score-change'), 500);
            }
        }
    }
    else if (currentWheelOption.id === 4) {
        p.shields = (p.shields || 0) + 1;
        saveData();
        openReasonModal(p);
    }
    else {
        openReasonModal(p);
    }
}

function openReasonModal(p) {
    reasonTargetText.innerText = `${p.name} dan 1 ball ayirish uchun sabab yozing (${currentWheelOption.text}):`;
    reasonInput.value = '';
    reasonModal.style.display = "flex";
    reasonInput.focus();
}

submitReasonBtn.onclick = function () {
    const reasonText = reasonInput.value.trim();
    if (!reasonText) {
        alert("Iltimos, sababni kiriting!");
        return;
    }

    const p = participants.find(x => x.id === activeParticipantId);
    const now = Date.now();

    if (p) {
        p.score--;

        if (currentWheelOption.id === 2) {
            const randomExercise = EXERCISE_POOL[Math.floor(Math.random() * EXERCISE_POOL.length)];
            p.exercises.push(`2X ${randomExercise}`);
        } else if (currentWheelOption.id === 5) {
            // Jismoniy jazo mashqi yozilmaydi
        } else {
            const randomExercise = EXERCISE_POOL[Math.floor(Math.random() * EXERCISE_POOL.length)];
            p.exercises.push(randomExercise);
        }

        p.nextAllowedTime = now + COOLDOWN_TIME;

        logs.unshift({
            name: p.name,
            remainingScore: p.score,
            reason: `${reasonText} (${currentWheelOption.text})`,
            timestamp: now
        });

        reasonModal.style.display = "none";
        triggerFlashEffect();

        try {
            if (p.score === 0) {
                new Audio('./ovozlar/gameover.MP3').play();
            } else {
                new Audio('./ovozlar/error.MP3').play();
                setTimeout(() => { new Audio('./ovozlar/lock.MP3').play(); }, 1000);
            }
        } catch (e) { }

        saveData();
        renderUI();
        renderLogs();
        renderMoney();

        const scoreEl = document.getElementById(`score-${p.id}`);
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
                        <div class="money-val" style="font-size: 15px; color: ${ex.startsWith('2X') ? '#ff4757' : '#fff'}; font-weight: ${ex.startsWith('2X') ? 'bold' : 'normal'};">🏃 ${ex}</div>
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
    return date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

function renderLogs() {
    if (!logsContainer) return;
    if (logs.length === 0) {
        logsContainer.innerHTML = `<div class="no-logs">Hozircha hech kim qoidani buzgani yo'q. 🙌</div>`;
        return;
    }

    logsContainer.innerHTML = '';
    logs.forEach((item, index) => {
        const logItem = document.createElement('div');
        logItem.className = 'log-item';
        const displayTime = formatLogTime(item);

        logItem.innerHTML = `
            <div class="log-left">
                <div class="log-user-info">${item.name} <span class="current-score">Ball: ${item.remainingScore}</span></div>
                <div class="log-reason">🚨 ${item.reason}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 15px;">
                <div class="log-time">Bugun, ${displayTime}</div>
                <button onclick="deleteLog(${index})" style="background: none; border: none; color: #ff4757; font-size: 20px; cursor: pointer; font-weight: bold; padding: 0 5px;">×</button>
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
    if (document.getElementById('stat-total-lost')) document.getElementById('stat-total-lost').innerText = totalLost;

    let kings = participants.filter(p => p.score === maxScore && p.score > 0).map(p => p.name.split(' ')[0]);
    if (document.getElementById('stat-king')) document.getElementById('stat-king').innerText = kings.length > 0 ? kings.join(', ') : "Hech kim";

    participants.forEach(p => {
        const card = document.createElement('div');
        const isLeader = p.score === maxScore && p.score > 0;
        const isLocked = p.nextAllowedTime && now < p.nextAllowedTime;

        card.className = `card ${isLeader ? 'leader' : 'normal-card'}`;

        let statusHtml = '';
        if (p.score <= 0) {
            statusHtml = `<div class="status-msg status-loser">Siz o'yinda mag'lub bo'ldingiz!!! 💀</div>`;
        } else if (isGameOver) {
            statusHtml = `<div class="status-msg status-winner">Tabriklaymiz! Qutilib qoldingiz!!! 🎉</div>`;
        } else {
            statusHtml = `<div class="cooldown-label">${isLocked ? formatTime(p.nextAllowedTime - now) : ''}</div>`;
        }

        const shieldHtml = p.shields > 0 ? `<span style="background: #00d4ff; color: #000; padding: 2px 7px; font-size: 12px; font-weight: bold; border-radius: 6px; margin-left: 6px; box-shadow: 0 0 10px #00d4ff;">🛡️ x${p.shields}</span>` : '';

        card.innerHTML = `
            <span class="crown-icon">👑</span>
            <h3>${p.name} ${shieldHtml}</h3>
            <div class="score-box" id="score-${p.id}">${p.score}</div>
            <button class="minus-btn ${(isLocked || isGameOver || p.score <= 0) ? 'disabled-btn' : ''}" 
                ${(isLocked || isGameOver || p.score <= 0) ? 'disabled' : ''} 
                onclick="subtract(${p.id})">
                <span>×</span>
            </button>
            <div id="status-msg-${p.id}">${statusHtml}</div>
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
            if (timerDisplay) timerDisplay.innerText = "00:00:00:00";
            showRefreshUI();
            renderUI();
        } else {
            const d = Math.floor(timeLeft / 86400000);
            const h = Math.floor((timeLeft % 86400000) / 3600000);
            const m = Math.floor((timeLeft % 3600000) / 60000);
            const s = Math.floor((timeLeft % 60000) / 1000);
            if (timerDisplay) timerDisplay.innerText = `${String(d).padStart(2, '0')}:${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
    }, 1000);
}

// Qalqonlarni fonda avtomat tekshirish (Har 10 soniyada)
setInterval(updateShieldsPassive, 10000);

setInterval(() => {
    const now = Date.now();
    let shartliYangilash = false;
    participants.forEach(p => {
        if (p.nextAllowedTime) {
            if (now < p.nextAllowedTime) { shartliYangilash = true; }
            else { p.nextAllowedTime = null; shartliYangilash = true; saveData(); }
        }
    });
    if (shartliYangilash && (!endTime || now < endTime)) { renderUI(); }
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
if (refreshBtn) refreshBtn.onclick = () => { if (confirm("Noldan boshlamoqchimisiz?")) { localStorage.clear(); location.reload(); } };
if (infoBtn) infoBtn.onclick = () => modal.style.display = "flex";

const closeBtn = document.querySelector(".close-modal");
if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";

loadData();