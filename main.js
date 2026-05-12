let participants = [
    { id: 1, name: "Suxrob Erkinov", score: 13 },
    { id: 2, name: "Jonibek Sulaymonov", score: 13 },
    { id: 3, name: "Otabek Sulaymonov", score: 15 },
    { id: 4, name: "Ansor G'ulomov", score: 11 }
];

let timerInterval;
let endTime = null;
const CHALLENGE_DURATION = 6 * 24 * 60 * 60 * 1000;

const grid = document.getElementById('participants-grid');
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('startTimerBtn');

async function saveData() {
    const data = { participants, endTime };

    localStorage.setItem('swearing_challenge_backup', JSON.stringify(data));

    try {
        await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (e) { console.log("Serverga ulanib bo'lmadi, lekin brauzerda saqlandi."); }
}

async function loadData() {
    const local = localStorage.getItem('swearing_challenge_backup');
    if (local) {
        const parsed = JSON.parse(local);
        participants = parsed.participants;
        endTime = parsed.endTime;
    }

    try {
        const response = await fetch('/api/load');
        if (response.ok) {
            const serverData = await response.json();
            if (serverData.endTime && (!endTime || serverData.endTime > endTime)) {
                participants = serverData.participants;
                endTime = serverData.endTime;
            }
        }
    } catch (e) { console.log("Serverdan yuklab bo'lmadi, brauzer ma'lumotidan foydalanamiz."); }

    if (endTime) {
        startBtn.disabled = true;
        startTimer();
    }
    renderUI();
}

function renderUI() {
    grid.innerHTML = '';
    participants.forEach(p => {
        const card = document.createElement('div');
        card.className = `card ${p.score <= 0 ? 'out' : ''}`;
        card.innerHTML = `
            <h3>${p.name}</h3>
            <div class="score-box" id="score-${p.id}">${p.score}</div>
            <button class="minus-btn" onclick="subtract(${p.id})">-</button>
        `;
        grid.appendChild(card);
    });
}

function subtract(id) {
    const p = participants.find(x => x.id === id);
    if (p.score > 0) {
        p.score--;
        document.getElementById(`score-${id}`).innerText = p.score;
        saveData();
        if (p.score === 0) renderUI();
    }
}

startBtn.onclick = async () => {
    if (confirm("Vaqtni ishga tushirasizmi? Uni to'xtatib bo'lmaydi!")) {
        endTime = Date.now() + CHALLENGE_DURATION;
        startBtn.disabled = true;
        await saveData();
        startTimer();
    }
};

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const now = Date.now();
        const timeLeft = endTime - now;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerDisplay.innerText = "00:00:00:00";
        } else {
            updateTimerDisplay(timeLeft);
        }
    }, 1000);
}

function updateTimerDisplay(ms) {
    const seconds = Math.floor(ms / 1000);
    const d = Math.floor(seconds / (24 * 3600));
    const h = Math.floor((seconds % (24 * 3600)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    timerDisplay.innerText = `${String(d).padStart(2, '0')}:${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

document.getElementById('saveBtn').onclick = async () => {
    await saveData();
    alert("Ma'lumotlar saqlandi!");
};

loadData();