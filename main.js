let participants = [
    { id: 1, name: "Suxrob Erkinov", score: 15, nextAllowedTime: null },
    { id: 2, name: "Jonibek Sulaymonov", score: 15, nextAllowedTime: null },
    { id: 3, name: "Otabek Sulaymonov", score: 15, nextAllowedTime: null },
    { id: 4, name: "Ansor G'ulomov", score: 15, nextAllowedTime: null }
];

let timerInterval;
let endTime = null;
const CHALLENGE_DURATION = 6 * 24 * 60 * 60 * 1000;
const COOLDOWN_TIME = 10 * 60 * 1000; // 10 minut shaxsiy cooldown

const grid = document.getElementById('participants-grid');
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('startTimerBtn');
const saveBtn = document.getElementById('saveBtn');
const refreshBtn = document.getElementById('refreshBtn');
const infoBtn = document.getElementById('infoBtn');
const modal = document.getElementById("infoModal");

function saveData() {
    const data = { participants, endTime };
    localStorage.setItem('swearing_challenge_backup', JSON.stringify(data));
}

function loadData() {
    const local = localStorage.getItem('swearing_challenge_backup');
    if (local) {
        const parsed = JSON.parse(local);
        participants = parsed.participants;
        endTime = parsed.endTime;
    }

    if (endTime) {
        if (Date.now() < endTime) {
            startBtn.style.display = 'none';
            startTimer();
        } else {
            showRefreshUI();
        }
    }
    renderUI();
}

window.subtract = function (id) {
    const now = Date.now();
    if (endTime && now >= endTime) return;

    const p = participants.find(x => x.id === id);
    if (p && p.nextAllowedTime && now < p.nextAllowedTime) return;

    if (p && p.score > 0) {
        p.score--;
        p.nextAllowedTime = now + COOLDOWN_TIME;
        saveData();
        renderUI();

        const scoreBox = document.getElementById(`score-${id}`);
        if (scoreBox) {
            scoreBox.classList.add('score-change');
            setTimeout(() => scoreBox.classList.remove('score-change'), 500);
        }
    }
}

function renderUI() {
    if (!grid) return;
    grid.innerHTML = '';

    const now = Date.now();
    const scores = participants.map(p => p.score);
    const maxScore = Math.max(...scores);

    participants.forEach(p => {
        const card = document.createElement('div');
        const isLeader = p.score === maxScore && p.score > 0;
        const isLocked = p.nextAllowedTime && now < p.nextAllowedTime;

        card.className = `card ${isLeader ? 'leader' : ''}`;

        card.innerHTML = `
            <span class="crown-icon">👑</span>
            <h3>${p.name}</h3>
            <div class="score-box" id="score-${p.id}">${p.score}</div>
            <button class="minus-btn ${isLocked ? 'disabled-btn' : ''}" 
                    ${isLocked ? 'disabled' : ''} 
                    onclick="subtract(${p.id})">×</button>
            <div class="cooldown-label">${isLocked ? formatTime(p.nextAllowedTime - now) : ''}</div>
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
        } else {
            const d = Math.floor(timeLeft / 86400000);
            const h = Math.floor((timeLeft % 86400000) / 3600000);
            const m = Math.floor((timeLeft % 3600000) / 60000);
            const s = Math.floor((timeLeft % 60000) / 1000);
            timerDisplay.innerText = `${String(d).padStart(2, '0')}:${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
    }, 1000);
}

// Shaxsiy taymerlar har sekundda yangilanib turishi uchun
setInterval(() => {
    if (participants.some(p => p.nextAllowedTime && Date.now() < p.nextAllowedTime)) {
        renderUI();
    }
}, 1000);

function showRefreshUI() {
    if (refreshBtn) refreshBtn.style.display = 'block';
    if (startBtn) startBtn.style.display = 'none';
}

startBtn.onclick = () => {
    if (confirm("6 kunlik challenge boshlansinmi?")) {
        endTime = Date.now() + CHALLENGE_DURATION;
        saveData();
        loadData();
    }
};

saveBtn.onclick = () => { saveData(); alert("Saqlandi!"); };
refreshBtn.onclick = () => { if (confirm("Qayta boshlaysizmi?")) { localStorage.clear(); location.reload(); } };
infoBtn.onclick = () => modal.style.display = "block";
document.querySelector(".close-modal").onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };

loadData();