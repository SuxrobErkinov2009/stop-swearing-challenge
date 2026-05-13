const INITIAL_SCORE = 15;
const COOLDOWN_TIME = 30 * 60 * 1000;
const TOTAL_CHALLENGE_TIME = 6 * 24 * 60 * 60 * 1000;

let participants = [
    { name: "Suxrob Erkinov", score: INITIAL_SCORE, lastPenalty: 0 },
    { name: "Jonibek Sulaymonov", score: INITIAL_SCORE, lastPenalty: 0 },
    { name: "Otabek Sulaymonov", score: INITIAL_SCORE, lastPenalty: 0 },
    { name: "Ansor G'ulomov", score: INITIAL_SCORE, lastPenalty: 0 }
];

if (localStorage.getItem('challenge_data')) {
    participants = JSON.parse(localStorage.getItem('challenge_data'));
}

function renderParticipants() {
    const grid = document.getElementById('participants-grid');
    if (!grid) return;
    grid.innerHTML = '';

    participants.forEach((p, index) => {
        const now = Date.now();
        const diff = now - p.lastPenalty;
        const isOnCooldown = diff < COOLDOWN_TIME;
        const isOut = p.score <= 0;

        const card = document.createElement('div');
        card.className = `card ${isOut ? 'out' : ''}`;

        let cooldownHTML = '';
        if (isOnCooldown && !isOut) {
            const remaining = Math.ceil((COOLDOWN_TIME - diff) / 1000);
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            cooldownHTML = `<p class="cooldown-label">Keyingi imkoniyat: ${mins}:${secs < 10 ? '0' : ''}${secs}</p>`;
        }

        card.innerHTML = `
            <h3>${p.name}</h3>
            <div class="score-box">${p.score}</div>
            <button class="minus-btn ${isOnCooldown || isOut ? 'disabled-btn' : ''}" 
                    onclick="decreaseScore(${index})" 
                    ${isOnCooldown || isOut ? 'disabled' : ''}>×</button>
            ${cooldownHTML}
        `;
        grid.appendChild(card);
    });

    checkGameOver();
}

window.decreaseScore = function (index) {
    const now = Date.now();
    if (participants[index].score > 0 && (now - participants[index].lastPenalty >= COOLDOWN_TIME)) {
        participants[index].score -= 1;
        participants[index].lastPenalty = now;
        saveData();
        renderParticipants();
    }
};

function saveData() {
    localStorage.setItem('challenge_data', JSON.stringify(participants));
}

const saveBtn = document.getElementById('saveBtn');
if (saveBtn) {
    saveBtn.addEventListener('click', () => {
        saveData();
        alert("Natijalar muvaffaqiyatli saqlandi!");
    });
}

function startTimer() {
    let startTime = localStorage.getItem('challenge_start_time');
    if (!startTime) {
        startTime = Date.now();
        localStorage.setItem('challenge_start_time', startTime);
    }

    setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = TOTAL_CHALLENGE_TIME - elapsed;
        const display = document.getElementById('timer-display');

        if (!display) return;

        if (remaining <= 0) {
            display.innerText = "Vaqt tugadi!";
            return;
        }

        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

        display.innerText =
            `${days < 10 ? '0' : ''}${days}:${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }, 1000);
}

function checkGameOver() {
    const anyOut = participants.some(p => p.score <= 0);
    const refreshBtn = document.getElementById('refreshBtn');
    if (anyOut && refreshBtn) {
        refreshBtn.style.display = 'block';
    }
}

const modal = document.getElementById('infoModal');
const infoBtn = document.getElementById('infoBtn');
const detailsBtn = document.getElementById('detailsBtn');
const closeSpan = document.querySelector('.close-modal');

if (infoBtn) infoBtn.onclick = () => modal.style.display = "block";
if (detailsBtn) detailsBtn.onclick = () => modal.style.display = "block";
if (closeSpan) closeSpan.onclick = () => modal.style.display = "none";

window.onclick = (event) => {
    if (event.target == modal) modal.style.display = "none";
};

setInterval(renderParticipants, 1000);
startTimer();
renderParticipants();