const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/save', (req, res) => {
    const data = JSON.stringify(req.body, null, 2);
    fs.writeFile('data.json', data, (err) => {
        if (err) return res.status(500).send("Xatolik yuz berdi");
        res.send("Ma'lumotlar saqlandi");
    });
});

app.get('/api/load', (req, res) => {
    if (!fs.existsSync('data.json')) {
        return res.status(404).send("Fayl topilmadi");
    }
    fs.readFile('data.json', 'utf8', (err, data) => {
        if (err) return res.status(500).send("O'qishda xatolik");
        res.json(JSON.parse(data));
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});