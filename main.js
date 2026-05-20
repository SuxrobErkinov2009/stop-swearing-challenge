// ==========================================
// 1. INITIAL STATE & CONFIGURATIONS
// ==========================================
const DEFAULT_STATE = {
    participants: [
        { id: 1, name: "Suxrob Erkinov", score: 15, exercises: [], nextAllowedTime: null, shields: 0, lastShieldUpdate: Date.now() },
        { id: 2, name: "Jonibek Sulaymonov", score: 15, exercises: [], nextAllowedTime: null, shields: 0, lastShieldUpdate: Date.now() },
        { id: 3, name: "Otabek Sulaymonov", score: 15, exercises: [], nextAllowedTime: null, shields: 0, lastShieldUpdate: Date.now() },
        { id: 4, name: "Ansor G'ulomov", score: 15, exercises: [], nextAllowedTime: null, shields: 0, lastShieldUpdate: Date.now() }
    ],
    endTime: null,
    logs: []
};

// LocalStoragedan ma'lumotlarni o'qish
let currentAppState = JSON.parse(localStorage.getItem('challenge_state')) || { ...DEFAULT_STATE };

// Global O'zgaruvchilar
let activeParticipantId = null;
let securityCallback = null;
let currentWheelOption = null;

// Konstantalar
const COOLDOWN_TIME = 5 * 1000; // 5 soniya bloklash (test uchun, xohlasangiz oshirasiz)
const SHIELD_GROWTH_TIME = 48 * 60 * 60 * 1000; // Har 48 soatda avtomatik qalqon qo'shish

const EXERCISE_POOL = [
    "30ta anjimaniya 💪",
    "100 ta o'tirib turish 🏃‍♂️",
    "50 ta pres kachat 🏋️‍♂️",
    "2 daqiqa Plank holatida turish ⏳",
    "20 ta Burpee mashqi 🔥"
];

const WHEEL_OPTIONS = [
    { id: 1, text: "Omadli! 🎉 +1 Ball", color: "#2ed573" },
    { id: 2, text: "2X JAZO EHH! 🚨", color: "#ff4757" },
    { id: 3, text: "Oddiy jazo 🛡️", color: "#ffa500" },
    { id: 4, text: "+1 QALQON QO'SHILDI 🛡️", color: "#00ecff" },
    { id: 5, text: "Mashqsiz qutulish! 🎭", color: "#9b59b6" }
];

// ==========================================
// 2. DOM ELEMENTS CACHING
// ==========================================
const grid = document.getElementById('participants-grid');
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('startTimerBtn');
const refreshBtn = document.getElementById('refreshBtn');
const infoBtn = document.getElementById('infoBtn');
const infoModal = document.getElementById("infoModal");
const closeInfoBtn = document.getElementById("closeInfoBtn");
const flashOverlay = document.getElementById("flash-overlay");

// Modallar
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

// Tepadagi statistika panellari
const statKing = document.getElementById('stat-king');
const statDanger = document.getElementById('stat-danger');
const statTotalLost = document.getElementById('stat-total-lost');

// ==========================================
// 3. CORE LOCALSTORAGE SINC & CONTROL
// ==========================================
function saveState() {
    localStorage.setItem('challenge_state', JSON.stringify(currentAppState));
    renderAll();
}

// Admin Parol Tizimi (Base64 shifrlangan)
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
        alert("Xato parol kiritildi! Admin emassiz.");
        passwordModal.style.display = "none";
    }
};
cancelPasswordBtn.onclick = () => passwordModal.style.display = "none";

// ==========================================
// 4. SHIELD SYSTEM LOGIC (AVTOMATIK QALQON)
// ==========================================
function updateShieldsPassive() {
    const now = Date.now();
    let changed = false;

    currentAppState.participants.forEach(p => {
        if (!p.lastShieldUpdate) p.lastShieldUpdate = now;

        const passedTime = now - p.lastShieldUpdate;
        if (passedTime >= SHIELD_GROWTH_TIME) {
            const newShields = Math.floor(passedTime / SHIELD_GROWTH_TIME);
            p.shields = (p.shields || 0) + newShields;
            // Qolgan vaqtni keyingi sikl uchun saqlab qolamiz
            p.lastShieldUpdate = now - (passedTime % SHIELD_GROWTH_TIME);
            changed = true;
        }
    });

    if (changed) saveState();
}

// ==========================================
// 5. PENALTY & WHEEL LOGIC (OMAD G'ILDIRAGI)
// ==========================================
window.subtract = function (id) {
    const now = Date.now();
    // Challenge vaqti tugagan bo'lsa ball ayirib bo'lmaydi
    if (currentAppState.endTime && now >= currentAppState.endTime) {
        alert("Challenge muddati o'z nihoyasiga yetgan!");
        return;
    }

    const p = currentAppState.participants.find(x => x.id === id);
    if (!p || (p.nextAllowedTime && now < p.nextAllowedTime) || p.score <= 0) return;

    askPassword(() => {
        activeParticipantId = id;
        openWheelModal();
    });
};

function openWheelModal() {
    wheelResult.innerText = "G'ildirakni aylantiring... 🎰";
    wheelCanvas.style.transform = "rotate(0deg)";
    wheelCanvas.style.transition = "none";
    spinBtn.style.display = "inline-block";
    wheelModal.style.display = "flex";
}

spinBtn.onclick = function () {
    spinBtn.style.display = "none";
    wheelResult.innerText = "Omad g'ildiragi aylanmoqda... 🎲";

    const randomIndex = Math.floor(Math.random() * WHEEL_OPTIONS.length);
    currentWheelOption = WHEEL_OPTIONS[randomIndex];

    const segmentDegrees = 360 / WHEEL_OPTIONS.length;
    wheelCanvas.style.transition = "transform 3s cubic-bezier(0.15, 0.7, 0.1, 1)";

    // Kamida 5 marta to'liq aylanib keyin kerakli segmentda to'xtashi uchun kalkulyatsiya
    const targetDegrees = (360 * 5) + (randomIndex * segmentDegrees) + (segmentDegrees / 2);
    wheelCanvas.style.transform = `rotate(-${targetDegrees}deg)`;

    setTimeout(() => {
        wheelResult.innerHTML = `<span style="color: ${currentWheelOption.color}; font-size: 20px;">● ${currentWheelOption.text}</span>`;
        setTimeout(() => {
            wheelModal.style.display = "none";
            executeWheelResult();
        }, 1500);
    }, 3000);
};

function executeWheelResult() {
    const p = currentAppState.participants.find(x => x.id === activeParticipantId);
    if (!p) return;

    // Agar ishtirokchida Qalqon bo'lsa va tushgan variant yomon variant bo'lsa (id: 1 omadli, uni qalqon to'smaydi)
    if (currentWheelOption.id !== 1 && p.shields > 0) {
        p.shields--;

        // Ekrandagi kartochkani silkitalab vizual effekt berish
        const cards = grid.children;
        for (let card of cards) {
            if (card.querySelector(`button[onclick="subtract(${p.id})"]`)) {
                card.style.animation = "shakeEffect 0.15s infinite";
                card.style.borderColor = "#00d4ff";
                card.style.boxShadow = "0 0 25px #00d4ff";
                setTimeout(() => {
                    card.style.animation = "none";
                    card.style.borderColor = "rgba(0, 212, 255, 0.15)";
                    card.style.boxShadow = "none";
                }, 1200);
                break;
            }
        }

        currentAppState.logs.unshift({
            name: p.name,
            remainingScore: p.score,
            reason: `🛡️ Himoya Qalqonini ishlatdi va jazodan qutuldi! Tushgan edi: ${currentWheelOption.text}`,
            timestamp: Date.now()
        });
        saveState();
        return;
    }

    // G'ildirak natijalarini qo'llash
    if (currentWheelOption.id === 1) {
        // Omadli variant: Ball ayrilmaydi, aksincha maksimallashadi (max 15)
        if (p.score < 15) p.score++;
        currentAppState.logs.unshift({
            name: p.name,
            remainingScore: p.score,
            reason: "🎰 Omad g'ildiragida yutdi! Ball ayrilmadi, balki +1 ball qaytarildi.",
            timestamp: Date.now()
        });
        saveState();
    } else if (currentWheelOption.id === 4) {
        // Qalqon varianti: Qalqon qo'shiladi va jazo sababi so'raladi
        p.shields = (p.shields || 0) + 1;
        saveState();
        openReasonModal(p);
    } else {
        // Qolgan barcha holatlarda jazo muqarrar, sababini yozish modali ochiladi
        openReasonModal(p);
    }
}

function openReasonModal(p) {
    reasonTargetText.innerText = `${p.name} uchun jazo sababi (${currentWheelOption.text}):`;
    reasonInput.value = '';
    reasonModal.style.display = "flex";
    reasonInput.focus();
}

submitReasonBtn.onclick = function () {
    const reasonText = reasonInput.value.trim();
    if (!reasonText) return alert("Iltimos, qoidabuzarlik sababini kiriting!");

    const p = currentAppState.participants.find(x => x.id === activeParticipantId);
    if (p) {
        p.score--; // Asosiy o'yindan 1 ball chegiriladi

        // G'ildirak variantiga qarab jismoniy mashq yuklash
        if (currentWheelOption.id === 2) {
            // 2X Jazo tushgan bo'lsa
            const exercise = EXERCISE_POOL[Math.floor(Math.random() * EXERCISE_POOL.length)];
            p.exercises.push(`Double! 2X [ ${exercise} ]`);
        } else if (currentWheelOption.id === 5) {
            // Mashqsiz qutulish tushgan bo'lsa, ro'yxatga jismoniy mashq qo'shilmaydi
            p.exercises.push("Jismoniy mashqdan ozod etildi 🎭");
        } else {
            // Oddiy jazo holati
            const exercise = EXERCISE_POOL[Math.floor(Math.random() * EXERCISE_POOL.length)];
            p.exercises.push(exercise);
        }

        // Cooldown vaqtini belgilash (ketma-ket tez urib yubormaslik uchun)
        p.nextAllowedTime = Date.now() + COOLDOWN_TIME;

        // Tarixga yozish
        currentAppState.logs.unshift({
            name: p.name,
            remainingScore: p.score,
            reason: `${reasonText} -> Natija: ${currentWheelOption.text}`,
            timestamp: Date.now()
        });

        reasonModal.style.display = "none";

        // Ekran qizil bo'lib chiroq o'ynash effekti (Flash)
        if (flashOverlay) {
            flashOverlay.classList.add("flash-active");
            setTimeout(() => flashOverlay.classList.remove("flash-active"), 150);
        }
        saveState();
    }
};
cancelReasonBtn.onclick = () => reasonModal.style.display = "none";

// Jaramani bajarib bo'lgach o'chirish
window.payFine = function (id, exerciseIndex) {
    const p = currentAppState.participants.find(x => x.id === id);
    if (!p) return;
    askPassword(() => {
        p.exercises.splice(exerciseIndex, 1);
        saveState();
    });
};

// ==========================================
// 6. DYNAMIC UI RENDERING FUNCTIONS
// ==========================================
function renderUI() {
    if (!grid) return;
    grid.innerHTML = '';
    const now = Date.now();
    const isGameOver = currentAppState.endTime ? now >= currentAppState.endTime : false;

    // Eng baland ballni aniqlash (Etakchini topish uchun)
    const maxScore = Math.max(...currentAppState.participants.map(p => p.score));

    // 1. STATISTIKA UPDATE
    let totalLost = currentAppState.participants.reduce((sum, p) => sum + (15 - p.score), 0);
    if (statTotalLost) statTotalLost.innerText = totalLost;

    let kings = currentAppState.participants.filter(p => p.score === maxScore && p.score > 0).map(p => p.name.split(' ')[0]);
    if (statKing) statKing.innerText = kings.length > 0 ? kings.join(', ') : "Hech kim";

    let dangerList = currentAppState.participants.filter(p => p.score <= 5 && p.score > 0).map(p => p.name.split(' ')[0]);
    if (statDanger) statDanger.innerText = dangerList.length > 0 ? dangerList.join(', ') : "--";

    // 2. ISHTIROKCHILAR KARTALARINI CHIZISH
    currentAppState.participants.forEach(p => {
        const card = document.createElement('div');
        const isLeader = p.score === maxScore && p.score > 0;
        const isLocked = p.nextAllowedTime && now < p.nextAllowedTime;

        // Klaslarni to'g'ri o'rnatish
        card.className = `card ${isLeader ? 'leader' : 'normal-card'}`;

        let statusHtml = "";
        if (p.score <= 0) {
            statusHtml = `<div style="color:var(--red); font-weight:900; margin-top:10px;">💀 MAG'LUB BO'LDI!</div>`;
        } else if (isGameOver) {
            statusHtml = `<div style="color:var(--green); font-weight:900; margin-top:10px;">🎉 SURG'UNDAN QUTULDI!</div>`;
        } else {
            statusHtml = `<div style="color:#aaa; font-size:12px; min-height:18px; margin-top:10px;">${isLocked ? '🔒 Cooldown faol...' : ''}</div>`;
        }

        const shieldHtml = p.shields > 0 ? `<span style="background:var(--accent); color:#000; padding:2px 6px; font-size:11px; font-weight:800; border-radius:4px; margin-left:5px;">🛡️ x${p.shields}</span>` : '';

        card.innerHTML = `
            <span class="crown-icon">👑</span>
            <h3 style="font-weight: 800; font-size: 18px;">${p.name} ${shieldHtml}</h3>
            <div class="score-box" style="margin: 15px 0;">${p.score}</div>
            <button class="minus-btn ${(isLocked || isGameOver || p.score <= 0) ? 'disabled-btn' : ''}" 
                ${(isLocked || isGameOver || p.score <= 0) ? 'disabled' : ''} onclick="subtract(${p.id})">×</button>
            ${statusHtml}
        `;
        grid.appendChild(card);
    });
}

function renderMoney() {
    if (!moneyContainer) return;
    moneyContainer.innerHTML = '';

    currentAppState.participants.forEach(p => {
        const row = document.createElement('div');
        row.className = 'money-row';
        row.style.flexDirection = 'column';
        row.style.alignItems = 'flex-start';
        row.style.gap = '10px';

        let exHtml = p.exercises.length === 0 ? `<div style="color:var(--green); font-size: 14px;">Hozircha qarzlari yo'q! Toza... 😎</div>` : '';

        p.exercises.forEach((ex, idx) => {
            exHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%; background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:8px;">
                <span style="color:#fff; font-size:14px; font-weight:600;">${ex}</span>
                <button class="pay-btn" onclick="payFine(${p.id}, ${idx})">Bajarildi</button>
            </div>`;
        });

        row.innerHTML = `
            <div style="font-weight:800; color:var(--accent); width:100%; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:6px; font-size:15px;">
                ${p.name}
            </div>
            ${exHtml}
        `;
        moneyContainer.appendChild(row);
    });
}

function renderLogs() {
    if (!logsContainer) return;
    if (!currentAppState.logs || currentAppState.logs.length === 0) {
        logsContainer.innerHTML = `<div style="color:#666; text-align:center; padding:20px;">Hozircha hech qanday qoidabuzarlik qayd etilmadi. O'yin toza! 🙌</div>`;
        return;
    }

    logsContainer.innerHTML = '';
    currentAppState.logs.forEach((item, index) => {
        const d = document.createElement('div');
        d.className = 'log-item';

        // Vaqtni chiroyli formatlash
        const logTime = new Date(item.timestamp).toLocaleTimeString();

        d.innerHTML = `
            <div>
                <span style="color:var(--accent); font-weight:bold;">${item.name}</span> 
                <span style="color:#ff4757; font-size:12px;">(Qolgan ball: ${item.remainingScore})</span><br>
                <small style="color:#ccc; display:inline-block; margin-top:4px;">⚠️ ${item.reason}</small>
                <div style="font-size:10px; color:#555; margin-top:2px;">Kiritilgan vaqt: ${logTime}</div>
            </div>
            <button onclick="deleteLog(${index})" style="background:none; border:none; color:var(--red); font-size:24px; cursor:pointer; font-weight:bold; padding:0 10px;">&times;</button>
        `;
        logsContainer.appendChild(d);
    });
}

window.deleteLog = function (index) {
    askPassword(() => {
        currentAppState.logs.splice(index, 1);
        saveState();
    });
};

// ==========================================
// 7. COUNTDOWN TIMER LOGIC (6 KUNLIK TAYMER)
// ==========================================
let timerInterval;
function manageTimerLogic() {
    if (timerInterval) clearInterval(timerInterval);

    if (!currentAppState.endTime) {
        timerDisplay.innerText = "06:00:00:00";
        startBtn.style.display = 'inline-block';
        refreshBtn.style.display = 'none';
        return;
    }

    startBtn.style.display = 'none';
    refreshBtn.style.display = 'inline-block';

    timerInterval = setInterval(() => {
        const timeLeft = currentAppState.endTime - Date.now();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerDisplay.innerText = "00:00:00:00";
            renderUI(); // O'yin tugagan holatini yangilash uchun
        } else {
            const d = Math.floor(timeLeft / 86400000);
            const h = Math.floor((timeLeft % 86400000) / 3600000);
            const m = Math.floor((timeLeft % 3600000) / 60000);
            const s = Math.floor((timeLeft % 60000) / 1000);

            timerDisplay.innerText = `${String(d).padStart(2, '0')}:${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
    }, 1000);
}

startBtn.onclick = () => {
    askPassword(() => {
        // To'g'ri 6 kunlik challenge vaqtini belgilash
        currentAppState.endTime = Date.now() + (6 * 24 * 60 * 60 * 1000);
        saveState();
    });
};

refreshBtn.onclick = () => {
    askPassword(() => {
        if (confirm("Diqqat! Barcha joriy natijalar, jismoniy jazo mashqlari va loglar butunlay o'chib ketadi. Rozimisiz?")) {
            currentAppState = {
                participants: [
                    { id: 1, name: "Suxrob Erkinov", score: 15, exercises: [], nextAllowedTime: null, shields: 0, lastShieldUpdate: Date.now() },
                    { id: 2, name: "Jonibek Sulaymonov", score: 15, exercises: [], nextAllowedTime: null, shields: 0, lastShieldUpdate: Date.now() },
                    { id: 3, name: "Otabek Sulaymonov", score: 15, exercises: [], nextAllowedTime: null, shields: 0, lastShieldUpdate: Date.now() },
                    { id: 4, name: "Ansor G'ulomov", score: 15, exercises: [], nextAllowedTime: null, shields: 0, lastShieldUpdate: Date.now() }
                ],
                endTime: null,
                logs: []
            };
            saveState();
        }
    });
};

// ==========================================
// 8. APP INITIALIZATION & MASTER RENDER
// ==========================================
function renderAll() {
    renderUI();
    renderLogs();
    renderMoney();
    manageTimerLogic();
}

// Qo'shimcha Modallarni boshqarish
if (infoBtn && infoModal) infoBtn.onclick = () => infoModal.style.display = "flex";
if (closeInfoBtn && infoModal) closeInfoBtn.onclick = () => infoModal.style.display = "none";

// Tashqariga bosganda modallarni yopish qoidasi
window.onclick = function (event) {
    if (event.target == infoModal) infoModal.style.display = "none";
};

// Sahifa yuklanganda birinchi marta ishga tushadigan qism
updateShieldsPassive();
renderAll();