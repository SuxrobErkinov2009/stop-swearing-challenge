const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const app = express();

const PORT = process.env.PORT || 3000;

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://suxroberkinov438_db_user:SuxrobErkinov2009@animixcluster.gk2nwfg.mongodb.net/dontswear?appName=AnimixCluster";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "./")));

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

mongoose
  .connect(MONGO_URI, {
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

app.get("/api/get-challenge-data", async (req, res) => {
  try {
    let data = await Challenge.findOne({ key: "main_data" });

    if (!data) {
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

app.post("/api/verify-password", (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Parol talab qilinadi!",
      });
    }

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

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Sahifa topilmadi!" });
});

app.use((err, req, res, next) => {
  console.error("🔴 Server xatosi:", err);
  res.status(500).json({
    success: false,
    message: "Server xatosi!",
    error:
      process.env.NODE_ENV === "development" ? err.message : "Noma'lum xato",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  process.exit(0);
});
