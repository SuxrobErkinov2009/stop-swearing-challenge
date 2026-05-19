const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// ⚠️ DIQQAT: Mana shu yerga o'zingizning MongoDB ulanish havolangizni qo'yasiz!
// Agar hozircha ulanish havolasi bo'lmasa, pastdagi tayyor test bazasini tekshirish uchun ishlating:
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://challenge_user:challenge123@cluster0.abcde.mongodb.net/dontswear?retryWrites=true&w=shared";

app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

// MongoDB-da ma'lumotlar tuzilishi (Schema)
const ChallengeSchema = new mongoose.Schema({
    key: { type: String, default: "main_data", unique: true },
    participants: Array,
    endTime: Number,
    logs: Array
});

const Challenge = mongoose.model('Challenge', ChallengeSchema);

// Boshlang'ich ma'lumotlar shabloni
const initialData = {
    participants: [
        { id: 1, name: "Suxrob Erkinov", score: 15, penaltyMoney: 0, nextAllowedTime: null },
        { id: 2, name: "Jonibek Sulaymonov", score: 15, penaltyMoney: 0, nextAllowedTime: null },
        { id: 3, name: "Otabek Sulaymonov", score: 15, penaltyMoney: 0, nextAllowedTime: null },
        { id: 4, name: "Ansor G'ulomov", score: 15, penaltyMoney: 0, nextAllowedTime: null }
    ],
    endTime: null,
    logs: []
};

// MongoDB-ga ulanish
mongoose.connect(MONGO_URI)
    .then(() => console.log("☁️ MongoDB bulutli bazasiga muvaffaqiyatli ulandik!"))
    .catch(err => console.error("❌ Baza ulanishida xato:", err));

// API 1: Ma'lumotlarni bazadan olish
app.get('/api/get-challenge-data', async (req, res) => {
    try {
        let data = await Challenge.findOne({ key: "main_data" });
        if (!data) {
            // Agar bazada hali hech narsa bo'lmasa, boshlang'ichni yaratadi
            data = await Challenge.create({ key: "main_data", ...initialData });
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ success: false, message: "Bazadan o'qishda xato!" });
    }
});

// API 2: Ma'lumotlarni bazaga saqlash
app.post('/api/save-challenge-data', async (req, res) => {
    if (req.body && req.body.participants) {
        try {
            await Challenge.findOneAndUpdate(
                { key: "main_data" },
                {
                    participants: req.body.participants,
                    endTime: req.body.endTime,
                    logs: req.body.logs || []
                },
                { upsert: true, new: true }
            );
            res.json({ success: true, message: "Ma'lumotlar bulutli bazaga saqlandi!" });
        } catch (error) {
            res.status(500).json({ success: false, message: "Bazaga yozishda xato!" });
        }
    } else {
        res.status(400).json({ success: false, message: "Xato ma'lumot formati!" });
    }
});

// API 3: Parolni tekshirish
app.post('/api/verify-password', (req, res) => {
    const { password } = req.body;
    if (password === "8590091117") {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: "Noto'g'ri parol!" });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server http://localhost:${PORT} manzili bo'yicha ishlamoqda!`);
});