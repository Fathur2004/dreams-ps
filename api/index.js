const express = require('express');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(express.json({ limit: '50mb' }));

const MASTER_PIN = '200004';

// KONFIGURASI
const SHEET_ID = '1opSd9QDkuc1dNMPcL0nPR4ihmSaiRiXKnDbniPoZsdc';
const GOOGLE_API_KEY = 'AIzaSyCzJ5RnNfyKTXKgH59NFOb04qna_mbH4wI';
const CLOUD_NAME = 'ckkmlvum';
const CLOUD_API_KEY = '617591584863119';
const CLOUD_API_SECRET = '-5WiwFWm8aWbHnu0-Vp_Y96S_I4';

// ============ TEST ============
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'API BERJALAN! 🚀',
        sheet_id: SHEET_ID,
        cloudinary: CLOUD_NAME
    });
});

// ============ GET GAMES ============
app.get('/api/games/:console', async (req, res) => {
    try {
        const consoleKey = req.params.console;
        console.log('📥 GET /api/games/' + consoleKey);
        
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1?key=${GOOGLE_API_KEY}`;
        const response = await axios.get(url);
        const rows = response.data.values || [];

        if (rows.length < 2) return res.json([]);

        const games = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length >= 5) {
                games.push({
                    console: row[0]?.trim() || '',
                    title: row[1]?.trim() || '',
                    size: row[2]?.trim() || '0',
                    price: parseInt(row[3]?.trim() || '0', 10),
                    image: row[4]?.trim() || '',
                    id: i
                });
            }
        }

        const filtered = games.filter(g => g.console === consoleKey);
        res.json(filtered);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============ POST GAME ============
app.post('/api/games/:console', async (req, res) => {
    try {
        const consoleKey = req.params.console;
        const { pin, title, size, price, image } = req.body;
        
        console.log('📥 POST /api/games/' + consoleKey);
        
        if (pin !== MASTER_PIN) {
            return res.status(401).json({ error: 'PIN salah!' });
        }
        
        if (!title || !size || !price || !image) {
            return res.status(400).json({ error: 'Semua field harus diisi!' });
        }
        
        // 1. Upload ke Cloudinary
        const formData = new FormData();
        formData.append('file', image);
        formData.append('upload_preset', 'ml_default');
        formData.append('folder', 'dreams_ps');
        
        const cloudRes = await axios.post(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            formData,
            { headers: { ...formData.getHeaders() }, timeout: 30000 }
        );
        
        const imageUrl = cloudRes.data.secure_url;
        console.log('✅ Uploaded to Cloudinary');
        
        // 2. Simpan ke Google Sheets
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1:append?valueInputOption=USER_ENTERED&key=${GOOGLE_API_KEY}`;
        await axios.post(appendUrl, {
            values: [[consoleKey, title, size, price.toString(), imageUrl]]
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('✅ Game added to sheet');
        
        // 3. Ambil data terbaru
        const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1?key=${GOOGLE_API_KEY}`;
        const readRes = await axios.get(readUrl);
        const rows = readRes.data.values || [];
        
        const games = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length >= 5) {
                games.push({
                    console: row[0]?.trim() || '',
                    title: row[1]?.trim() || '',
                    size: row[2]?.trim() || '0',
                    price: parseInt(row[3]?.trim() || '0', 10),
                    image: row[4]?.trim() || '',
                    id: i
                });
            }
        }
        
        const filtered = games.filter(g => g.console === consoleKey);
        res.json({ success: true, games: filtered });
        
    } catch (error) {
        console.error('❌ Error POST:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;