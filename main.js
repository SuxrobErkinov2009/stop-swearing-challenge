import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCu5I_oC72GImHAq7nv5NOb8nvdQm0kV_c",
    authDomain: "challenge-4a52a.firebaseapp.com",
    databaseURL: "https://challenge-4a52a-default-rtdb.firebaseio.com",
    projectId: "challenge-4a52a",
    storageBucket: "challenge-4a52a.appspot.com",
    messagingSenderId: "731273715252",
    appId: "1:731273715252:web:2a23a82a48994391263461",
    measurementId: "G-8T1DYQ65SS"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Sening skrinshotdagi o'sha qadrli ma'lumotlaring
const BACKUP_PARTICIPANTS = [
    { id: 1, name: "Suxrob Erkinov", score: 15, exercises: [], nextAllowedTime: null },
    { id: 2, name: "Jonibek Sulaymonov", score: 14, exercises: [], nextAllowedTime: null },
    { id: 3, name: "Otabek Sulaymonov", score: 15, exercises: [], nextAllowedTime: null },
    { id: 4, name: "Ansor G'ulomov", score: 11, exercises: [], nextAllowedTime: null }
];

const BACKUP_LOGS = [
    { name: "Ansor G'ulomov", remainingScore: 11, reason: "shunchaki", timestamp: Date.now() - 3600000 },
    { name: "Ansor G'ulomov", remainingScore: 12, reason: "Bilmasdan sokinib yubordi", timestamp: Date.now() - 7200000 },
    { name: "Ansor G'ulomov", remainingScore: 13, reason: "Asabiylik", timestamp: Date.now() - 14400000 },
    { name: "Ansor G'ulomov", remainingScore: 14, reason: "Qoidabuzarlik", timestamp: Date.now() - 28800000 },
    { name: "Jonibek Sulaymonov", remainingScore: 14, reason: "Ehtiyotsizlik", timestamp: Date.now() - 43200000 }
];

// 4 kun 9 soat vaqtni millisekundlarda hisoblaymiz (04:09:54:07 uchun)
const TIME_TO_ADD = (4 * 24 * 60 * 60 * 1000) + (9 * 60 * 60 * 1000) + (54 * 60 * 1000);
const BACKUP_END_TIME = Date.now() + TIME_TO_ADD;

let participants = [];
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

// DOM elementlar (xatolikka yo'l qo'ymaslik uchun hammasini tekshirib olamiz)
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
    if (!passwordModal || !adminPasswordInput) {
        // Agar parol modal oynasi HTMLda bo'lmasa, chetlab o'tib funksiyani bajaraveradi
        onSuccess();
        return;
    }
    adminPasswordInput.value = '';
    passwordModal.style.display = "flex";
    adminPasswordInput.focus();
    securityCallback = onSuccess;
}

if (submitPasswordBtn) {
    submitPasswordBtn.onclick = function () {
        if (verifySecureKey(adminPasswordInput.value)) {
            passwordModal.style.display = "none";
            if (securityCallback) securityCallback();
        } else {
            alert("Noto'g'ri parol! Ruxsat berilmadi.");
            passwordModal.style.display = "none";
        }
    };
}

if (cancelPasswordBtn) {
    cancelPasswordBtn.onclick = function () {
        passwordModal.style.display = "none";
    };
}

function saveData() {
    set(ref(db, 'challenge_data'), {
        participants,
        endTime,
        logs
    }).catch(err => console.error("Firebasega yozishda xato: ", err));
}

function loadData() {
    const dataRef = ref(db, 'challenge_data');
    onValue(dataRef, (snapshot) => {
        const parsed = snapshot.val();

        // Agar onlayn baza bo'sh bo'lsa, avtomat sening ma'lumotlaringni onlayn bazaga yuklaydi
        if (!parsed || !parsed.participants || parsed.participants.length === 0) {
            participants = [...BACKUP_PARTICIPANTS];
            logs = [...BACKUP_LOGS];
            endTime = BACKUP_END_TIME;
            saveData();
            return;
        }

        participants = parsed.participants.map(p => ({
            ...p,
            exercises: p.exercises !== undefined ? p.exercises : []
        }));
        endTime = parsed.endTime || null;
        logs = parsed.logs || [];

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
    }, (error) => {
        console.error("Firebase o'qishda xatolik:", error);
    });
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
        if (reasonTargetText) reasonTargetText.innerText = `${p.name} dan 1 ball ayirish uchun sabab yozing:`;
        if (reasonInput) {
            reasonInput.value = '';
            reasonInput.focus();
        }
        if (reasonModal) reasonModal.style.display = "flex";
    });
};

if (submitReasonBtn) {
    submitReasonBtn.onclick = function () {
        const reasonText = reasonInput ? reasonInput.value.trim() : "Qoidabuzarlik";
        if (!reasonText && reasonInput) {
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

            if (reasonModal) reasonModal.style.display = "none";
            triggerFlashEffect();

            try {
                if (p.score === 0) {
                    new Audio('./ovozlar/gameover.MP3').play();
                } else {
                    new Audio('./ovozlar/error.MP3').play();
                    setTimeout(() => { new Audio('./ovozlar/lock.MP3').play(); }, 1000);
                }
            } catch (e) { console.log("Audio xatolik e'tibor bermang"); }

            saveData();

            const scoreEl = document.getElementById(`score-${id}`);
            if (scoreEl) {
                scoreEl.classList.add('score-change');
                setTimeout(() => scoreEl.classList.remove('score-change'), 500);
            }
        }
    };
}

if (cancelReasonBtn) {
    cancelReasonBtn.onclick = function () {
        reasonModal.style.display = "none";
    };
}

window.payFine = function (id, exerciseIndex) {
    const p = participants.find(x => x.id === id);
    if (!p || !p.exercises || p.exercises.length === 0) return;

    askPassword(() => {
        if (confirm(`Ushbu mashq bajarildimi? Ro'yxatdan o'chiramizmi?`)) {
            p.exercises.splice(exerciseIndex, 1);
            saveData();
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
    if (!item.timestamp) return "Hozirgina";
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

        const displayTime = formatLogTime(item);

        logItem.innerHTML = `
            <div class="log-left">
                <div class="log-user-info">${item.name} <span class="current-score">Qolgan ball: ${item.remainingScore}</span></div>
                <div class="log-reason">🚨 Sabab: ${item.reason}</div>
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
    const totalLostEl = document.getElementById('stat-total-lost');
    if (totalLostEl) totalLostEl.innerText = totalLost;

    let kings = participants.filter(p => p.score === maxScore && p.score > 0).map(p => p.name.split(' ')[0]);
    const kingEl = document.getElementById('stat-king');
    if (kingEl) kingEl.innerText = kings.length > 0 ? kings.join(', ') : "--";

    let dangerOnes = participants.filter(p => p.score <= 5 && p.score > 0).map(p => p.name.split(' ')[0]);
    const dangerEl = document.getElementById('stat-danger');
    if (dangerEl) dangerEl.innerText = dangerOnes.length > 0 ? dangerOnes.join(', ') : "Yo'q";

    participants.forEach(p => {
        const card = document.createElement('div');
        const isLeader = p.score === maxScore && p.score > 0;
        const isLocked = p.nextAllowedTime && now < p.nextAllowedTime;

        card.className = `card ${isLeader ? 'leader' : 'normal-card'}`;

        let statusHtml = '';
        if (p.score <= 0) {
            statusHtml = `<div class="status-msg status-loser">Siz o'yinda mag'lub bo'ldingiz! 💀</div>`;
        } else if (isGameOver) {
            statusHtml = `<div class="status-msg status-winner">Tabriklaymiz! Qutuldingiz!!! 🎉</div>`;
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
        endTime = Date.now() + CHALLENGE_DURATION;
        saveData();
    };
}

if (saveBtn) saveBtn.onclick = () => { saveData(); alert("Natijalar onlayn saqlandi!"); };
if (refreshBtn) refreshBtn.onclick = () => { if (confirm("Noldan boshlamoqchimisiz?")) { set(ref(db, 'challenge_data'), null).then(() => location.reload()); } };
if (infoBtn) infoBtn.onclick = () => { if (modal) modal.style.display = "flex"; };

const closeBtn = document.querySelector(".close-modal");
if (closeBtn) closeBtn.onclick = () => { if (modal) modal.style.display = "none"; };

loadData();