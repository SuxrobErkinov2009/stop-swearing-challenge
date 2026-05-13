const firebaseConfig = {
    apiKey: "AIzaSyCu5I_oC72GIwHAq7nv5WObBnwdQm0kV_c",
    authDomain: "challenge-4a52a.firebaseapp.com",
    databaseURL: "https://challenge-4a52a-default-rtdb.firebaseio.com",
    projectId: "challenge-4a52a",
    storageBucket: "challenge-4a52a.firebasestorage.app",
    messagingSenderId: "731273715252",
    appId: "1:731273715252:web:2a23a82a48994391263461",
    measurementId: "G-0T1DYQ65SS"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let participants = [];
let endTime = null;
let timerInterval;
const COOLDOWN_TIME = 10 * 60 * 1000;

const grid = document.getElementById('participants-grid');
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('startTimerBtn');
const infoBtn = document.getElementById('infoBtn');
const modal = document.getElementById("infoModal");

db.ref('challenge_data').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        participants = data.participants || [];
        endTime = data.endTime || null;
        renderUI();
        if (endTime) {
            if (startBtn) startBtn.style.display = 'none';
            startTimer();
        }
    } else {
        const local = localStorage.getItem('swearing_challenge_backup');
        if (local) {
            const parsed = JSON.parse(local);
            db.ref('challenge_data').set(parsed);
        }
    }
});

window.subtract = function (id) {
    const now = Date.now();
    if (endTime && now >= endTime) return;

    const pIndex = participants.findIndex(x => x.id === id);
    if (pIndex === -1) return;

    const p = participants[pIndex];
    if ((p.nextAllowedTime && now < p.nextAllowedTime) || p.score <= 0) return;

    p.score--;
    p.nextAllowedTime = now + COOLDOWN_TIME;

    db.ref('challenge_data').update({
        participants: participants
    });

    const scoreEl = document.getElementById(`score-${id}`);
    if (scoreEl) {
        scoreEl.classList.add('score-change');
        setTimeout(() => scoreEl.classList.remove('score-change'), 500);
    }
};

function renderUI() {
    if (!grid) return;
    grid.innerHTML = '';
    const now = Date.now();
    const scores = participants.map(p => p.score);
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

    participants.forEach(p => {
        const card = document.createElement('div');
        const isLeader = p.score === maxScore && p.score > 0;
        const isLocked = p.nextAllowedTime && now < p.nextAllowedTime;

        card.className = `card ${isLeader ? 'leader' : 'normal-card'}`;
        card.innerHTML = `
            <span class="crown-icon">👑</span>
            <h3>${p.name}</h3>
            <div class="score-box" id="score-${p.id}">${p.score}</div>
            <button class="minus-btn" ${isLocked ? 'disabled' : ''} onclick="subtract(${p.id})">
                <span>×</span>
            </button>
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
    if (participants.some(p => p.nextAllowedTime && now < p.nextAllowedTime)) {
        renderUI();
    }
}, 1000);

if (infoBtn) infoBtn.onclick = () => modal.style.display = "flex";
const closeBtn = document.querySelector(".close-modal");
if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };