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
const detailsBtn = document.getElementById('detailsBtn');
const infoBtn = document.getElementById('infoBtn');
const modal = document.getElementById("infoModal");
const closeBtn = document.querySelector(".close-modal");

async function saveData() {
    const data = { participants, endTime };
    localStorage.setItem('swearing_challenge_backup', JSON.stringify(data));
    try {
        await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (e) { console.error("Save error"); }
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
    } catch (e) { console.error("Load error"); }
    if (endTime) {
        startBtn.disabled = true;
        startTimer();
    }
    renderUI();
}

function renderUI() {
    if (!grid) return;
    grid.innerHTML = '';
    participants.forEach(p => {
        const card = document.createElement('div');
        card.className = `card ${p.score <= 0 ? 'out' : ''}`;
        card.innerHTML = `
            <h3>${p.name}</h3>
            <div class="score-box" id="score-${p.id}">${p.score}</div>
            <button class="minus-btn" onclick="subtract(${p.id})">×</button>
        `;
        grid.appendChild(card);
    });
}

window.subtract = function (id) {
    const p = participants.find(x => x.id === id);
    if (p && p.score > 0) {
        p.score--;
        const scoreElement = document.getElementById(`score-${id}`);
        scoreElement.innerText = p.score;
        scoreElement.style.transform = "scale(1.2)";
        setTimeout(() => scoreElement.style.transform = "scale(1)", 200);
        saveData();
        if (p.score === 0) renderUI();
    }
}

if (startBtn) {
    startBtn.onclick = async () => {
        if (confirm("Challenge boshlansinmi?")) {
            endTime = Date.now() + CHALLENGE_DURATION;
            startBtn.disabled = true;
            await saveData();
            startTimer();
        }
    };
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const timeLeft = endTime - Date.now();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerDisplay.innerText = "00:00:00:00";
        } else {
            updateTimerDisplay(timeLeft);
        }
    }, 1000);
}

function updateTimerDisplay(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    timerDisplay.innerText = `${String(d).padStart(2, '0')}:${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

if (detailsBtn) {
    detailsBtn.onclick = () => {
        let report = "📊 CHALLENGE STATUS:\n\n";
        participants.forEach(p => report += `• ${p.name}: ${p.score}\n`);
        alert(report);
    };
}

if (infoBtn) infoBtn.onclick = () => modal.style.display = "block";
if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; };

loadData();