const express = require('express');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(express.json({ limit: '50mb' }));

const MASTER_PIN = '200004';

// ============ KONFIGURASI SUPABASE ============
const SUPABASE_URL = 'https://qqgvbfoecwlptvtxscvc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_clTzjF625SI1QtWIITeBHg_K8MmRqYm';

// ============ KONFIGURASI CLOUDINARY ============
const CLOUD_NAME = 'ckkmlvum';
const CLOUD_API_KEY = '617591584863119';
const CLOUD_API_SECRET = '-5WiwFWm8aWbHnu0-Vp_Y96S_I4';

console.log('🚀 Starting DREAMS PS with Supabase + Cloudinary');

// ============ FUNGSI QUERY SUPABASE ============
async function getGames(consoleKey) {
    try {
        const response = await axios.get(
            `${SUPABASE_URL}/rest/v1/games?console=eq.${consoleKey}&order=title.asc`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error get games:', error.message);
        return [];
    }
}

async function addGameToSupabase(consoleKey, title, size, price, imageUrl) {
    try {
        const response = await axios.post(
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
        return response.data;
    } catch (error) {
        console.error('Error add game:', error.message);
        throw error;
    }
}

async function deleteGameFromSupabase(id) {
    try {
        await axios.delete(
            `${SUPABASE_URL}/rest/v1/games?id=eq.${id}`,
            {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            }
        );
        return true;
    } catch (error) {
        console.error('Error delete game:', error.message);
        throw error;
    }
}

// ============ FUNGSI UPLOAD KE CLOUDINARY ============
async function uploadToCloudinary(imageBase64, fileName = 'game') {
    try {
        const formData = new FormData();
        formData.append('file', imageBase64);
        formData.append('upload_preset', 'ml_default');
        formData.append('folder', 'dreams_ps');
        
        const response = await axios.post(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            formData,
            {
                headers: { ...formData.getHeaders() },
                timeout: 30000
            }
        );
        
        return response.data.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error.message);
        throw error;
    }
}

// ============ API ROUTES ============

// TEST
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'DREAMS PS dengan Supabase + Cloudinary!',
        supabase: SUPABASE_URL,
        cloudinary: CLOUD_NAME
    });
});

// GET
app.get('/api/games/:console', async (req, res) => {
    try {
        const consoleKey = req.params.console;
        const games = await getGames(consoleKey);
        res.json(games);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST
app.post('/api/games/:console', async (req, res) => {
    try {
        const consoleKey = req.params.console;
        const { pin, title, size, price, image } = req.body;
        
        if (pin !== MASTER_PIN) {
            return res.status(401).json({ error: 'PIN salah!' });
        }
        
        if (!title || !size || !price || !image) {
            return res.status(400).json({ error: 'Semua field harus diisi!' });
        }
        
        // Upload ke Cloudinary
        const imageUrl = await uploadToCloudinary(image, title.replace(/[^a-zA-Z0-9]/g, '_'));
        console.log('✅ Uploaded to Cloudinary:', imageUrl);
        
        // Simpan ke Supabase
        await addGameToSupabase(consoleKey, title, size, price, imageUrl);
        console.log('✅ Game added to Supabase');
        
        const games = await getGames(consoleKey);
        res.json({ success: true, games: games });
    } catch (error) {
        console.error('Error POST:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// DELETE
app.delete('/api/games/:console/:index', async (req, res) => {
    try {
        const consoleKey = req.params.console;
        const index = parseInt(req.params.index, 10);
        const { pin } = req.body;
        
        if (pin !== MASTER_PIN) {
            return res.status(401).json({ error: 'PIN salah!' });
        }
        
        const games = await getGames(consoleKey);
        if (index < 0 || index >= games.length) {
            return res.status(404).json({ error: 'Game tidak ditemukan' });
        }
        
        const gameId = games[index].id;
        await deleteGameFromSupabase(gameId);
        console.log('✅ Game deleted from Supabase');
        
        const updatedGames = await getGames(consoleKey);
        res.json({ success: true, games: updatedGames });
    } catch (error) {
        console.error('Error DELETE:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;
