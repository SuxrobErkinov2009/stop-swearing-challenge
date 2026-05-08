const express = require('express');
const path = require('path');
const app = express();

// 1. Bu qator barcha rasm, CSS va JS fayllarni serverga tanitadi
app.use(express.static(__dirname));

// 2. Bu qator asosiy sahifa ochilganda Index.html ni yuboradi
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Index.html'));
});

// 3. Portni Render talabiga moslash (10000 yoki boshqa ixtiyoriy)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server ${PORT}-portda ishlamoqda`);
});