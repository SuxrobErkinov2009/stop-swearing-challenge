const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

// Boshlang'ich ma'lumotlar
const initialData = {
    participants: [
        { id: 1, name: "Suxrob Erkinov",    score: 15, penaltyMoney: 0, nextAllowedTime: null },
        { id: 2, name: "Jonibek Sulaymonov", score: 15, penaltyMoney: 0, nextAllowedTime: null },
        { id: 3, name: "Otabek Sulaymonov",  score: 15, penaltyMoney: 0, nextAllowedTime: null },
        { id: 4, name: "Ansor G'ulomov",     score: 15, penaltyMoney: 0, nextAllowedTime: null }
    ],
    endTime: null,
    logs: []
};

// data.json yo'q bo'lsa yaratadi
function ensureDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
        console.log('📁 data.json yangi yaratildi.');
    }
}

// ─── API: Ma'lumotlarni olish ────────────────────────────────────────────────
app.get('/api/data', (req, res) => {
    try {
        ensureDataFile();
        const raw  = fs.readFileSync(DATA_FILE, 'utf8');
        const data = JSON.parse(raw);
        res.json({ success: true, data });
    } catch (err) {
        console.error('GET /api/data xato:', err);
        res.status(500).json({ success: false, message: 'Ma\'lumotlarni o\'qishda xato!' });
    }
});

// ─── API: Ma'lumotlarni saqlash ──────────────────────────────────────────────
app.post('/api/data', (req, res) => {
    try {
        const { participants, endTime, logs } = req.body;

        if (!participants || !Array.isArray(participants)) {
            return res.status(400).json({ success: false, message: 'Noto\'g\'ri ma\'lumot formati!' });
        }

        const payload = {
            participants,
            endTime: endTime ?? null,
            logs:    Array.isArray(logs) ? logs : []
        };

        fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
        res.json({ success: true, message: 'Saqlandi!' });
    } catch (err) {
        console.error('POST /api/data xato:', err);
        res.status(500).json({ success: false, message: 'Saqlashda xato!' });
    }
});

// ─── API: Parolni tekshirish ─────────────────────────────────────────────────
app.post('/api/verify', (req, res) => {
    const { password } = req.body;
    if (password === '8590091117') {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Noto\'g\'ri parol!' });
    }
});

// ─── API: Challengeni noldan boshlash ────────────────────────────────────────
app.post('/api/reset', (req, res) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
        res.json({ success: true, message: 'Noldan boshlandi!' });
    } catch (err) {
        console.error('POST /api/reset xato:', err);
        res.status(500).json({ success: false, message: 'Xato yuz berdi!' });
    }
});

// ─── Barcha boshqa so'rovlar index.html ga ──────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    ensureDataFile();
    console.log(`🚀 Server http://localhost:${PORT} da ishlamoqda`);
});
