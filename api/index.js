const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const MASTER_PIN = '200004';

// KONFIGURASI
const SUPABASE_URL = 'https://qqgvbfoecwlptvtxscvc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_clTzjF625SI1QtWIITeBHg_K8MmRqYm';
const CLOUD_NAME = 'ckkmlvum';
const CLOUD_API_KEY = '617591584863119';
const CLOUD_API_SECRET = '-5WiwFWm8aWbHnu0-Vp_Y96S_I4';

console.log('🚀 Starting DREAMS PS (Super Simple)');

// ============ TEST ============
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'API BERJALAN!',
        supabase: SUPABASE_URL,
        cloudinary: CLOUD_NAME,
        time: new Date().toISOString()
    });
});

// ============ GET ============
app.get('/api/games/:console', async (req, res) => {
    try {
        const consoleKey = req.params.console;
        console.log('📥 GET /api/games/' + consoleKey);
        
        const response = await axios.get(
            `${SUPABASE_URL}/rest/v1/games?console=eq.${consoleKey}&order=title.asc`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            }
        );
        
        console.log('✅ Games found:', response.data.length);
        res.json(response.data);
    } catch (error) {
        console.error('❌ GET Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============ POST ============
app.post('/api/games/:console', async (req, res) => {
    try {
        const consoleKey = req.params.console;
        const { pin, title, size, price, image } = req.body;
        
        console.log('📥 POST /api/games/' + consoleKey);
        console.log('📝 Data:', { pin, title, size, price, image: image ? 'ADA' : 'TIDAK' });
        
        // CEK PIN
        if (pin !== MASTER_PIN) {
            console.log('❌ PIN salah');
            return res.status(401).json({ error: 'PIN salah!' });
        }
        
        // CEK INPUT
        if (!title || !size || !price || !image) {
            console.log('❌ Field tidak lengkap');
            return res.status(400).json({ error: 'Semua field harus diisi!' });
        }
        
        // ===== UPLOAD KE CLOUDINARY =====
        console.log('📤 Uploading to Cloudinary...');
        
        const formData = new FormData();
        formData.append('file', image);
        formData.append('upload_preset', 'ml_default');
        formData.append('folder', 'dreams_ps');
        
        const cloudRes = await axios.post(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            formData,
            {
                headers: {
                    ...formData.getHeaders()
                },
                timeout: 30000
            }
        );
        
        const imageUrl = cloudRes.data.secure_url;
        console.log('✅ Cloudinary success:', imageUrl);
        
        // ===== SIMPAN KE SUPABASE =====
        console.log('📝 Saving to Supabase...');
        
        const supabaseRes = await axios.post(
            `${SUPABASE_URL}/rest/v1/games`,
            {
                console: consoleKey,
                title: title,
                size: size,
                price: parseInt(price, 10),
                image: imageUrl
            },
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                }
            }
        );
        
        console.log('✅ Supabase success');
        
        // ===== AMBIL DATA TERBARU =====
        const gamesRes = await axios.get(
            `${SUPABASE_URL}/rest/v1/games?console=eq.${consoleKey}&order=title.asc`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            }
        );
        
        res.json({ success: true, games: gamesRes.data });
        
    } catch (error) {
        console.error('❌ POST Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        res.status(500).json({ 
            error: error.message,
            details: error.response?.data || 'No details'
        });
    }
});

// ============ DELETE ============
app.delete('/api/games/:console/:index', async (req, res) => {
    try {
        const consoleKey = req.params.console;
        const index = parseInt(req.params.index, 10);
        const { pin } = req.body;
        
        console.log('📥 DELETE /api/games/' + consoleKey + '/' + index);
        
        if (pin !== MASTER_PIN) {
            return res.status(401).json({ error: 'PIN salah!' });
        }
        
        // Ambil semua game
        const gamesRes = await axios.get(
            `${SUPABASE_URL}/rest/v1/games?console=eq.${consoleKey}&order=title.asc`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            }
        );
        
        const games = gamesRes.data;
        if (index < 0 || index >= games.length) {
            return res.status(404).json({ error: 'Game tidak ditemukan' });
        }
        
        const gameId = games[index].id;
        
        await axios.delete(
            `${SUPABASE_URL}/rest/v1/games?id=eq.${gameId}`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            }
        );
        
        console.log('✅ Game deleted');
        
        const updatedRes = await axios.get(
            `${SUPABASE_URL}/rest/v1/games?console=eq.${consoleKey}&order=title.asc`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            }
        );
        
        res.json({ success: true, games: updatedRes.data });
        
    } catch (error) {
        console.error('❌ DELETE Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;