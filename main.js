let participants = [
    { id: 1, name: "Suxrob Erkinov", score: 13, lastPenalty: 0 },
    { id: 2, name: "Jonibek Sulaymonov", score: 13, lastPenalty: 0 },
    { id: 3, name: "Otabek Sulaymonov", score: 15, lastPenalty: 0 },
    { id: 4, name: "Ansor G'ulomov", score: 11, lastPenalty: 0 }
];

let timerInterval;
let cooldownInterval;
let endTime = null;
let nextSubtractTime = null;
const CHALLENGE_DURATION = 6 * 24 * 60 * 60 * 1000;
const COOLDOWN_TIME = 30 * 60 * 1000;

const grid = document.getElementById('participants-grid');
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('startTimerBtn');
const detailsBtn = document.getElementById('detailsBtn');
const infoBtn = document.getElementById('infoBtn');
const modal = document.getElementById("infoModal");

async function saveData() {
    const data = { participants, endTime, nextSubtractTime };
    localStorage.setItem('swearing_challenge_backup', JSON.stringify(data));
    try {
        await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (e) { }
}

async function loadData() {
    const local = localStorage.getItem('swearing_challenge_backup');
    if (local) {
        const parsed = JSON.parse(local);
        participants = parsed.participants;
        endTime = parsed.endTime;
        nextSubtractTime = parsed.nextSubtractTime;
    }
    try {
        const response = await fetch('/api/load');
        if (response.ok) {
            const serverData = await response.json();
            if (serverData.endTime) {
                participants = serverData.participants;
                endTime = serverData.endTime;
                nextSubtractTime = serverData.nextSubtractTime;
            }
        }
    } catch (e) { }

    if (endTime) {
        startBtn.disabled = true;
        startTimer();
    }

    if (nextSubtractTime && Date.now() < nextSubtractTime) {
        startCooldownTimer();
    }
    renderUI();
}

function renderUI() {
    if (!grid) return;
    grid.innerHTML = '';
    const isLocked = nextSubtractTime && Date.now() < nextSubtractTime;

    participants.forEach((p, index) => {
        const card = document.createElement('div');
        card.className = `card ${p.score <= 0 ? 'out' : ''}`;
        card.innerHTML = `
            <h3>${p.name}</h3>
            <div class="score-box" id="score-${p.id}">${p.score}</div>
            <button class="minus-btn ${isLocked ? 'disabled-btn' : ''}" 
                    ${isLocked ? 'disabled' : ''} 
                    onclick="subtract(${p.id}, ${index})">×</button>
            <div class="cooldown-label"></div>
        `;
        grid.appendChild(card);
    });
}

window.subtract = function (id, index) {
    const now = Date.now();
    if (nextSubtractTime && now < nextSubtractTime) return;

    const p = participants.find(x => x.id === id);
    if (p && p.score > 0) {
        p.score--;
        nextSubtractTime = now + COOLDOWN_TIME;

        saveData();
        renderUI();
        startCooldownTimer();

        const scoreBox = document.getElementById(`score-${id}`);
        if (scoreBox) {
            scoreBox.classList.add('score-change');
            setTimeout(() => scoreBox.classList.remove('score-change'), 500);
        }
    }
}

function startCooldownTimer() {
    if (cooldownInterval) clearInterval(cooldownInterval);
    cooldownInterval = setInterval(() => {
        const timeLeft = nextSubtractTime - Date.now();
        if (timeLeft <= 0) {
            clearInterval(cooldownInterval);
            nextSubtractTime = null;
            saveData();
            renderUI();
        } else {
            const m = Math.floor((timeLeft % 3600000) / 60000);
            const s = Math.floor((timeLeft % 60000) / 1000);
            const timeStr = `Kutish: ${m}:${String(s).padStart(2, '0')}`;
            document.querySelectorAll('.cooldown-label').forEach(el => el.innerText = timeStr);
        }
    }, 1000);
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const timeLeft = endTime - Date.now();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerDisplay.innerText = "00:00:00:00";
        } else {
            const s = Math.floor(timeLeft / 1000);
            const d = Math.floor(s / 86400);
            const h = Math.floor((s % 86400) / 3600);
            const m = Math.floor((s % 3600) / 60);
            const sec = s % 60;
            timerDisplay.innerText = `${String(d).padStart(2, '0')}:${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
        }
    }, 1000);
}

startBtn.onclick = async () => {
    if (confirm("6 kunlik challenge boshlansinmi?")) {
        endTime = Date.now() + CHALLENGE_DURATION;
        startBtn.disabled = true;
        await saveData();
        startTimer();
    }
};

if (detailsBtn) {
    detailsBtn.onclick = () => {
        let r = "ISHTIROKCHILAR:\n";
        participants.forEach(p => r += `${p.name}: ${p.score} ball\n`);
        alert(r);
    };
}

if (infoBtn) infoBtn.onclick = () => modal.style.display = "block";
const closeBtn = document.querySelector(".close-modal");
if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };

loadData();