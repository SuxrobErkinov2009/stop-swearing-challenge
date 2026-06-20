const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const app = express();

const PORT = process.env.PORT || 3000;

// MongoDB ulanish
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://challenge_user:challenge123@cluster0.abcde.mongodb.net/dontswear?retryWrites=true&w=shared";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "./")));

// ==================== MONGOOSE SCHEMA ====================

const ChallengeSchema = new mongoose.Schema({
  key: {
    type: String,
    default: "main_data",
    unique: true,
  },
  participants: [
    {
      id: Number,
      name: String,
      score: Number,
      exercises: [String],
      nextAllowedTime: { type: Number, default: null },
      shields: { type: Number, default: 0 },
      lastShieldUpdate: { type: Number, default: null },
    },
  ],
  endTime: { type: Number, default: null },
  logs: [
    {
      name: String,
      remainingScore: Number,
      reason: String,
      timestamp: Number,
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Challenge = mongoose.model("Challenge", ChallengeSchema);

// Boshlang'ich ma'lumotlar
const initialData = {
  participants: [
    {
      id: 1,
      name: "Suxrob Erkinov",
      score: 15,
      exercises: [],
      nextAllowedTime: null,
      shields: 0,
      lastShieldUpdate: null,
    },
    {
      id: 2,
      name: "Jonibek Sulaymonov",
      score: 15,
      exercises: [],
      nextAllowedTime: null,
      shields: 0,
      lastShieldUpdate: null,
    },
    {
      id: 3,
      name: "Otabek Sulaymonov",
      score: 15,
      exercises: [],
      nextAllowedTime: null,
      shields: 0,
      lastShieldUpdate: null,
    },
    {
      id: 4,
      name: "Ansor G'ulomov",
      score: 15,
      exercises: [],
      nextAllowedTime: null,
      shields: 0,
      lastShieldUpdate: null,
    },
  ],
  endTime: null,
  logs: [],
};

// ==================== MONGODB ULANISH ====================

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log("✅ MongoDB ga muvaffaqiyatli ulandik!");
  })
  .catch((err) => {
    console.error("❌ MongoDB ulanish xatosi:", err.message);
    console.log("⚠️  Local server davom etmoqda...");
  });

// ==================== API ENDPOINTS ====================

// GET: Ma'lumotlarni bazadan olish
app.get("/api/get-challenge-data", async (req, res) => {
  try {
    let data = await Challenge.findOne({ key: "main_data" });

    if (!data) {
      console.log("📝 Yangi ma'lumotlar yaratilmoqda...");
      data = await Challenge.create({
        key: "main_data",
        ...initialData,
      });
    }

    res.json(data);
  } catch (error) {
    console.error("❌ GET xatosi:", error.message);
    res.status(500).json({
      success: false,
      message: "Bazadan o'qishda xato!",
      error: error.message,
    });
  }
});

// POST: Ma'lumotlarni bazaga saqlash
app.post("/api/save-challenge-data", async (req, res) => {
  try {
    if (!req.body || !req.body.participants) {
      return res.status(400).json({
        success: false,
        message: "Xato ma'lumot formati!",
      });
    }

    const updatedData = await Challenge.findOneAndUpdate(
      { key: "main_data" },
      {
        participants: req.body.participants,
        endTime: req.body.endTime,
        logs: req.body.logs || [],
        updatedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      },
    );

    res.json({
      success: true,
      message: "✅ Ma'lumotlar MongoDB-ga saqlandi!",
      data: updatedData,
    });
  } catch (error) {
    console.error("❌ POST xatosi:", error.message);
    res.status(500).json({
      success: false,
      message: "Bazaga yozishda xato!",
      error: error.message,
    });
  }
});

// POST: Parolni tekshirish
app.post("/api/verify-password", (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Parol talab qilinadi!",
      });
    }

    // Parol kodlangan holda saqlangan
    if (btoa(password) === "ODU5MDA5MTExNw==") {
      res.json({ success: true, message: "✅ Parol to'g'ri!" });
    } else {
      res.status(401).json({
        success: false,
        message: "❌ Noto'g'ri parol!",
      });
    }
  } catch (error) {
    console.error("❌ Parol tekshirishda xato:", error.message);
    res.status(500).json({
      success: false,
      message: "Xato yuz berdi!",
    });
  }
});

// GET: Barcha log larni olish
app.get("/api/logs", async (req, res) => {
  try {
    const data = await Challenge.findOne({ key: "main_data" });
    res.json({ logs: data?.logs || [] });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Loglarni o'qishda xato!" });
  }
});

// GET: Barcha ishtirokchilarilarni olish
app.get("/api/participants", async (req, res) => {
  try {
    const data = await Challenge.findOne({ key: "main_data" });
    res.json({ participants: data?.participants || [] });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Ishtirokchilarni o'qishda xato!" });
  }
});

// DELETE: Ma'lumotlarni o'chirish (reset)
app.delete("/api/reset", async (req, res) => {
  try {
    await Challenge.findOneAndUpdate(
      { key: "main_data" },
      { ...initialData, updatedAt: new Date() },
      { upsert: true, new: true },
    );
    res.json({ success: true, message: "✅ Ma'lumotlar reset qilindi!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Reset qilishda xato!" });
  }
});

// ==================== STATIC FILES ====================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Sahifa topilmadi!" });
});

// ==================== ERROR HANDLER ====================

app.use((err, req, res, next) => {
  console.error("🔴 Server xatosi:", err);
  res.status(500).json({
    success: false,
    message: "Server xatosi!",
    error:
      process.env.NODE_ENV === "development" ? err.message : "Noma'lum xato",
  });
});

// ==================== SERVER START ====================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 Stop Swearing Challenge SERVER     ║
║  🌐 http://localhost:${PORT}                ║
╚════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal qabul qilindi. Server to'xtayotgan...");
  process.exit(0);
});
