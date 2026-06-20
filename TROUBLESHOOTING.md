# 🔧 Muammolarni Hal Qilish (Troubleshooting)

## ❌ Muammo 1: "Cannot find module 'express'"

### Sababi:
NPM paketlari o'rnatilmagan

### Yechimi:
```bash
npm install
npm install express mongoose cors dotenv
```

---

## ❌ Muammo 2: "MongoDB ga ulanib bo'lmadi"

### Sababi:
MONGO_URI noto'g'ri yoki MongoDB ishlamayapti

### Tekshiring:
1. `.env` faylidagi MONGO_URI-ni ko'ring
2. MongoDB Atlas-da cluster ishga tushganligini tekshiring
3. Username/password to'g'ri ekanligini tekshiring

### Yechimi:
```bash
# 1. MongoDB URI ni yangilash
nano .env
# MONGO_URI = mongodb+srv://challenge_user:challenge123@YOUR_CLUSTER.mongodb.net/dontswear

# 2. Server qayta ishga tushurish
npm start
```

---

## ❌ Muammo 3: "PORT 3000 allaqachon ishlatilayapti"

### Sababi:
Boshqa dastur 3000 portni ishlatayapti

### Yechimi:
```bash
# Boshqa port bilan ishga tushirish
PORT=4000 npm start

# Yoki boshqa portda (5000, 8000, 9000...)
PORT=5000 npm start
```

---

## ❌ Muammo 4: "Ma'lumotlar sinxronizatsiya bo'lmayapti"

### Sababi:
Barcha qurilmalar shu URL dan foydalanmayapti

### Tekshiring:
1. **Localhost-dan hosting-ga o'tish:**
   ```
   localhost:3000 ❌ (faqat shu qurilmada ishlaydi)
   https://my-app.railway.app ✅ (barcha joydan)
   ```

2. **Browserning cache-ini o'chirish:**
   - `Ctrl+Shift+Del` (Windows) yoki `Cmd+Shift+Del` (Mac)
   - "All time" ni tanlang
   - Delete qiling

3. **Network tab-ni tekshiring (F12):**
   ```
   F12 → Network → /api/get-challenge-data
   Status: 200 OK ✅
   ```

### Yechimi:
```bash
# Server-ni qayta ishga tushurish
npm start

# Barcha qurilmalarda brauzer-ni yangilash
F5 yoki Ctrl+R
```

---

## ❌ Muammo 5: "Parol xatosi: 'Noto'g'ri parol'"

### Sababi:
Parol noto'g'ri kiritilgan

### Parol:
```
8590091117
```

### Tekshiri:
- CAPS LOCK yoq ekanligini tekshiring
- Space-ni olib tashlang
- Qo'sh marta kiritmang

---

## ❌ Muammo 6: "Hosting (Railway/Render) deploy xatosi"

### Sababi:
Environment variables o'rnatilmagan

### Yechimi:
1. Hosting platformasida "Environment" bo'limiga boring
2. Qo'shish:
   ```
   MONGO_URI = mongodb+srv://challenge_user:challenge123@YOUR_CLUSTER.mongodb.net/dontswear
   PORT = 3000
   NODE_ENV = production
   ```
3. Deploy qayta boshlang

---

## ❌ Muammo 7: "Frontend ma'lumotlarni yuklamayapti"

### Tekshiring:
```
1. Brauzer konsolini oching: F12
2. Console tab-ini ko'ring (xatolikni ko'rin)
3. Network tab-ni ko'ring (/api/get-challenge-data)
4. Server 200 statusini qaytargan-mi?
```

### Yechimi:
```bash
# Server logsini ko'rish
npm run dev

# Konsolda xatoni o'qish va yechim topish
```

---

## ❌ Muammo 8: "Challenge qo'lga tushgan bo'lsa ham yangilani davom etadi"

### Sababi:
`endTime` to'g'ri saqlanmagan

### Yechimi:
```bash
# Bazani reset qilish
curl -X DELETE http://localhost:3000/api/reset

# Yoki brauzerda:
# Konsol-da (F12):
fetch('/api/reset', {method: 'DELETE'}).then(r => r.json()).then(console.log)
```

---

## ❌ Muammo 9: "Xatir (Memory) ko'p ishlatilayapti"

### Sababi:
Juda ko'p ma'lumot MongoDB-ga saqlanib qolgan

### Yechimi:
```bash
# Eski log-larni o'chirish
# Browserda konsolga:
fetch('/api/get-challenge-data')
  .then(r => r.json())
  .then(data => {
    data.logs = data.logs.slice(0, 100); // Faqat eng yangi 100ta
    fetch('/api/save-challenge-data', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    })
  })
```

---

## ❌ Muammo 10: "Node.js o'rnatilmagan"

### Yechimi:
1. [nodejs.org](https://nodejs.org) ga boring
2. "LTS" versiyasini yuklang
3. O'rnatib, kompyuterni qayta ishga tushuring
4. Terminal-da `node -v` yozib, kiritish

---

## ✅ Xatlarni Tekshirish

### Terminal-da:
```bash
# Node.js:
node -v        # v14+ bo'lishi kerak

# NPM:
npm -v         # v6+ bo'lishi kerak

# Git (ixtiyoriy):
git -v         # Boshlang'ich qiymat
```

### .env fayl-da:
```bash
cat .env       # MONGO_URI ko'rsatilgan bo'lishi kerak
```

---

## 🔍 Debugging

### Brauzer konsolini ochish:
```
Chrome/Firefox: F12
Safari: Cmd+Option+I
Edge: F12
```

### Log-larni ko'rish:
```
Console tab → Yozuv-larni o'qish
Network tab → API so'rov-larni ko'rish
```

### Server log-larni ko'rish:
```bash
npm run dev    # Konsolda barcha xatolar ko'rinadi
```

---

## 📞 Agar hal bo'lmasa:

1. Bu README ni qayta o'qing
2. Error xabarni **to'liq** ko'ching
3. GitHub ishu oching yoki dev-ga murojaat qiling

---

## 💡 Maslahat:

**Har doim ishni boshidan qilishdan oldin, mongoDB va server xatolarini tekshiring!**

✨ **Omad bo'lsin!** 🚀
