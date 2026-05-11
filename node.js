const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'data.json');

app.get('/api/load', (req, res) => {
    if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE);
        res.json(JSON.parse(data));
    } else {
        res.json({ participants: null, endTime: null });
    }
});

app.post('/api/save', (req, res) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
        res.send({ status: 'Ok', message: 'Saqlandi!' });
    } catch (error) {
        res.status(500).send({ status: 'Error', message: 'Saqlashda xato!' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});