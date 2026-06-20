# 🎮 Stop Swearing Challenge - Server Version 2.0

Ushbu dastur **barcha qurilmalar uchun** ishlaydigan stop swearing challenge o'yini.

## 🚀 Yangiliklar

✅ **MongoDB bilan ishlaydi** - Bulutli ma'lumot bazasi  
✅ **Barcha qurilmalarni sinxronizatsiya qiladi** - Telefon, laptop, tablet  
✅ **Real-time updates** - Har 5 soniyada yangilanadi  
✅ **Offline support** - Internet bo'lmaganda ham ishlaydi  
✅ **Xavfsiz** - Admin paroli bilan himoya qilingan  

---

## 📋 Talablar

- **Node.js** v14+ ([node.js.org](https://nodejs.org))
- **MongoDB** (Bepul: [mongodb.com/cloud](https://mongodb.com/cloud))
- **npm** (Node.js bilan keladi)

---

## 🔧 O'rnatish (Setup)

### 1️⃣ Repository ni clone qilish yoki fayllarni yuklash

```bash
git clone <repository-url>
cd stop-swearing-challenge
```

### 2️⃣ NPM paketlarini o'rnatish

```bash
npm install
```

Bu faylar o'rnatadi:
- `express` - Web server
- `mongoose` - MongoDB qo'llanuvchi
- `cors` - Basdomli chiqarish
- `nodemon` (dev uchun) - Avtomatik restart

### 3️⃣ MongoDB ni o'rnatish va ulanish

**3a. Bepul MongoDB Atlas akkauntini yaratish:**

1. [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas) ga boring
2. "Create a Database" ni bosing
3. Tekin (Free) `M0` planini tanlang
4. Cluster yarating (4-6 daqiqani oladi)
5. Database user yarating:
   - Username: `challenge_user`
   - Password: `challenge123`
6. Connection string ni oling (ko'rinishi: `mongodb+srv://...`)

**3b. `.env` faylini ochib, MongoDB URI ni qo'ying:**

```env
MONGO_URI=mongodb+srv://challenge_user:challenge123@yourcluster.mongodb.net/dontswear?retryWrites=true&w=shared
PORT=3000
NODE_ENV=production
```

### 4️⃣ Serverni ishga tushirish

**Ishchisi rejimi (Development):**
```bash
npm run dev
```

**Production rejimi:**
```bash
npm start
```

✅ **Agar "MongoDB ga muvaffaqiyatli ulandik!" ko'rsatsa - tayyor!**

---

## 🌐 Server Joylashtirish (Hosting)

Serverni internet orqali ishlatish uchun:

### Variantlar:

#### 1. **Heroku** (Oson, Bepul/Platali)
```bash
heroku login
heroku create shunday-challenge
git push heroku main
```

#### 2. **Render.com** (Oson, Bepul)
- render.com ga boring
- Yangi "Web Service" yaratish
- GitHub reposini ulanish
- Deploy!

#### 3. **Railway** (Juda oson)
- railway.app ga boring
- Yangi proyekt yarating
- GitHub reposini ulanish
- Deploy!

#### 4. **Vercel** (Backend uchun)
- vercel.com ga boring
- Express app deploy qilish

---

## 📱 Foydalanish

### Birinchi ishga tushirish:
1. `http://localhost:3000` ni brauzerda oching
2. **"Vaqtni ishga tushirish"** tugmasini bosing
3. Parolni kiriting (admin paroli)
4. Challenge boshlandi! ✅

### Barcha qurilmalarda korinadigan qilish:
- Ixtiyoriy qurilmada saytga boring (same URL)
- **Avtomatik sinxronizatsiya** bo'ladi
- Hamma o'zgarishlar barcha joyda ko'rinadi

### Admin Paroli:
```
8590091117
```

---

## 🎮 Qoidalar (Rules)

✅ **Har bir oyinchi 15 ball bilan boshlanadi**  
⚠️ **Har bir nojo'ya so'z uchun 1 ball ayiriladi**  
💪 **Ball ajib bo'lsa, 30 soniyaning cooldown bo'ladi**  
🛡️ **48 soat davomida 1 ta qalqon beriladi** (1 ballni saqlab qoladi)  
👑 **6 kundan keyin eng ko'p ball boigan g'olib**  
💀 **Agar kimda 0 ball bo'lsa, grafni u qiladi**  

---

## 📊 API Endpoints

| Method | URL | Tavsif |
|--------|-----|--------|
| `GET` | `/api/get-challenge-data` | Barcha ma'lumotlarni olish |
| `POST` | `/api/save-challenge-data` | Ma'lumotlarni saqlash |
| `POST` | `/api/verify-password` | Parolni tekshirish |
| `GET` | `/api/participants` | Ishtirokchilar ro'yxati |
| `GET` | `/api/logs` | Barcha tarixlar |
| `DELETE` | `/api/reset` | Resetlash |

---

## 🔐 Xavfsizlik

- ✅ Parol **kodlangan** holatda saqlangan
- ✅ CORS himoya qilingan
- ✅ Input validation qilingan
- ✅ MongoDB injections uchun himoyalandi

---

## 🐛 Muammolarni hal qilish

### "MongoDB ulanish xatosi"
```
✅ MONGO_URI to'g'ri ekanligini tekshiring
✅ MongoDB cluster ishga tushirganligini tekshiring
✅ Username/password to'g'ri ekanligini tekshiring
```

### "PORT allaqachon ishlatilayapti"
```bash
# Boshqa port ishlatish
PORT=4000 npm start
```

### "Frontend ma'lumotlarni yuklamayapti"
```
✅ Brauzer konsolini oching (F12)
✅ Network tab-ini tekshiring
✅ Xatoliklarni ko'ring
```

---

## 📂 Fayllar Tuzilishi

```
project/
├── server.js              # Main server file
├── main.js                # Frontend JavaScript
├── index.html             # HTML page
├── main.css               # Styling
├── package.json           # NPM dependencies
├── .env                   # Environment variables
├── data.json             # Local backup (optional)
├── img/                   # Rasmlar
├── ovozlar/              # Audio fayllar
└── README.md             # Bu fayl
```

---

## 🚀 Deploy Misoli (Render.com)

### 1. GitHub-ga yuklash
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Render.com-da Deploy
1. render.com-ga kirib login qiling
2. "Create New" → "Web Service"
3. GitHub reposini tanlang
4. Settings:
   - **Name:** stop-swearing-challenge
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     ```
     MONGO_URI=your_mongodb_uri
     NODE_ENV=production
     ```
5. Deploy!

---

## 💡 Maslahatlar

### 1. Data Backup
```bash
# MongoDB-dan backup olish
mongodump --uri="your_mongo_uri" --out ./backup
```

### 2. Logs ni kuzatish
```bash
npm run dev   # Konsolda loglar ko'rinadi
```

### 3. Performance
- MongoDB indekslarini sozlash
- CDN istismarni qo'shish
- Cache qo'shish (Redis)

---

## 📞 Qo'llab-quvvatlash

Muammolar uchun:
1. Console-ni oching: `F12`
2. Xatoliklarni ko'ring
3. Bu README-ni qayta o'qing

---

## 📄 Litsenziya

MIT License

---

## ✨ Aytganlar

Ushbu dastur **100% sinxronizatsiya** qiladi. Barcha qurilmalar **bir vaqtda** yangilanadi! 🎉

**Admin paroli: `8590091117`**

---

Savollar bo'lsa, GitHub ishu ochish yoki dev-ga murojaat qiling! 🚀
