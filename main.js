let participants = [
    { id: 1, name: "Suxrob Erkinov", score: 15 },
    { id: 2, name: "Jonibek Sulaymonov", score: 15 },
    { id: 3, name: "Otabek Sulaymonov", score: 15 },
    { id: 4, name: "Ansor G'ulomov", score: 15 }
];

let timerInterval;
let endTime = null; // Tugash vaqti (millisekundda)
const CHALLENGE_DURATION = 6 * 24 * 60 * 60 * 1000; // 6 kun millisekundda

const grid = document.getElementById('participants-grid');
const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('startTimerBtn');

function init() {
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
        if (p.score === 0) init();
    }
}

async function loadData() {
    try {
        const response = await fetch('/api/load');
        if (response.ok) {
            const data = await response.json();
            participants = data.participants;
            endTime = data.endTime; // Serverdan tugash vaqtini olamiz

            if (endTime) {
                startBtn.disabled = true;
                startTimer();
            }
            init();
        } else {
            init();
        }
    } catch (e) {
        init();
    }
}

startBtn.addEventListener('click', async () => {
    if (confirm("Chindan ham ishga tushirasizmi?")) {
        endTime = Date.now() + CHALLENGE_DURATION; // Hozirgi vaqt + 6 kun
        startBtn.disabled = true;
        await saveData(); // Vaqtni darrov saqlaymiz
        startTimer();
    }
});

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        const now = Date.now();
        const timeLeft = endTime - now;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerDisplay.innerText = "00:00:00:00";
            finishGame();
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

function finishGame() {
    const anyZero = participants.some(p => p.score === 0);
    const overlay = document.getElementById('result-overlay');
    const msg = document.getElementById('result-message');
    overlay.style.display = 'flex';
    msg.innerText = anyZero ? "Sizga sabr tilaymiz" : "Tabriklaymiz siz azoblash hizmatidan qutildingiz";
}

async function saveData() {
    await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants, endTime })
    });
}

document.getElementById('saveBtn').onclick = async () => {
    await saveData();
    alert("Ma'lumotlar saqlandi!");
};

// Modal va boshqa funksiyalar...
document.getElementById('infoBtn').onclick = () => {
    document.getElementById('modal').style.display = "block";
    document.getElementById('modal-text').innerText = "Mazkur chellenj ishtirokchilar o‘rtasida o‘zaro hurmatni shakllantirish va nutq madaniyatini yuksaltirish maqsadida tashkil etilgan. Davomiyligi: 6 sutka (144 soat).   Har bir ishtirokchiga o‘yin boshida 15 ball taqdim etiladi.   Har bir aniqlangan haqoratli so‘z yoki nojo‘ya ibora uchun ishtirokchi 1 balldan mahrum qilinadi.   Ballar miqdori 0 ga tushgan ishtirokchi chellenjni muddatidan oldin tark etgan (mag'lub) hisoblanadi va u hafta ohirida barcha bolalarga gref qiladi.   Taymer real vaqt rejimida ishlaydi. Sayt yopiq bo‘lgan yoki qurilma o‘chirilgan holatlarda ham vaqt to‘xtamaydi.   Muddat yakunlanganda ballari saqlanib qolgan ishtirokchilar g'olib deb e'lon qilinadi.   Barcha natijalar server bazasida saqlanadi. Har bir o‘zgarishdan so‘ng Natijalarni saqlash tugmasini bosish majburiydir.   Eslatma: Chellenj ishtirokchilarning irodasini sinash uchun mo‘ljallangan. Halollik – eng oliy mezon!";
};

document.querySelector('.close').onclick = () => {
    document.getElementById('modal').style.display = "none";
};

loadData();