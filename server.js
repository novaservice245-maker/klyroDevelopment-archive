const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.'))); // Serve static files (HTML, CSS, JS)

// ==================== IN-MEMORY DATA (Kein MongoDB nötig!) ====================

// In-Memory Datenbank
const licenses = new Map();
const products = new Map();

// Initialisiere mit Test-Daten
function initializeData() {
    // Test License Keys
    licenses.set('KLYRO-TEST-0001', {
        key: 'KLYRO-TEST-0001',
        userName: 'TestUser1',
        discordId: '123456789',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: true,
        usedAt: null
    });

    licenses.set('KLYRO-TEST-0002', {
        key: 'KLYRO-TEST-0002',
        userName: 'TestUser2',
        discordId: '987654321',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: true,
        usedAt: null
    });

    // Test Produkte
    const testProducts = [
        {
            id: 1,
            title: 'Photoshop UI Kit',
            category: 'photoshop',
            type: 'templates',
            description: 'Professionelles UI Kit für Photoshop mit über 100 Komponenten.',
            size: '245 MB',
            image: 'https://via.placeholder.com/300x300?text=Photoshop+UI+Kit',
            uploadDate: new Date(),
            downloadUrl: '#',
            uploader: 'Admin'
        },
        {
            id: 2,
            title: 'Premiere Pro Transitions',
            category: 'premiere',
            type: 'presets',
            description: 'Umfangreiches Paket mit 50+ professionellen Übergängen.',
            size: '180 MB',
            image: 'https://via.placeholder.com/300x300?text=Premiere+Transitions',
            uploadDate: new Date(),
            downloadUrl: '#',
            uploader: 'Admin'
        },
        {
            id: 3,
            title: 'After Effects Motion Graphics',
            category: 'after-effects',
            type: 'templates',
            description: 'Ready-to-use Motion Graphics Templates für After Effects.',
            size: '512 MB',
            image: 'https://via.placeholder.com/300x300?text=Motion+Graphics',
            uploadDate: new Date(),
            downloadUrl: '#',
            uploader: 'Admin'
        }
    ];

    testProducts.forEach(product => {
        products.set(product.id, product);
    });
}

// Initialisiere Daten
initializeData();

// ==================== API ROUTES ====================

// Root - Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Archive page
app.get('/archive.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'archive.html'));
});

// Validiere License Key
app.post('/api/validate-license', (req, res) => {
    const { licenseKey } = req.body;

    if (!licenseKey) {
        return res.status(400).json({ message: 'License Key erforderlich' });
    }

    try {
        const license = licenses.get(licenseKey);

        if (!license) {
            return res.status(401).json({ valid: false, message: 'Ungültiger License Key' });
        }

        if (!license.isActive) {
            return res.status(401).json({ valid: false, message: 'License Key ist deaktiviert' });
        }

        if (license.expiresAt && new Date() > new Date(license.expiresAt)) {
            return res.status(401).json({ valid: false, message: 'License Key ist abgelaufen' });
        }

        // Update used date
        license.usedAt = new Date();

        return res.json({
            valid: true,
            userName: license.userName,
            expiresAt: license.expiresAt,
            message: 'License Key gültig'
        });
    } catch (error) {
        console.error('Fehler bei License-Validierung:', error);
        return res.status(500).json({ message: 'Server Fehler' });
    }
});

// Hole alle Produkte
app.get('/api/products', (req, res) => {
    try {
        const productList = Array.from(products.values()).sort((a, b) => b.uploadDate - a.uploadDate);
        res.json(productList);
    } catch (error) {
        console.error('Fehler beim Laden der Produkte:', error);
        res.status(500).json({ message: 'Server Fehler' });
    }
});

// Erstelle neuen Product (Admin)
app.post('/api/products', (req, res) => {
    const { title, category, type, description, size, image, downloadUrl, uploader } = req.body;

    if (!title || !category) {
        return res.status(400).json({ message: 'Title und Category erforderlich' });
    }

    try {
        const id = Math.max(...Array.from(products.keys()), 0) + 1;
        const product = {
            id,
            title,
            category,
            type,
            description,
            size,
            image,
            downloadUrl,
            uploadDate: new Date(),
            uploader: uploader || 'Admin'
        };

        products.set(id, product);
        res.status(201).json(product);
    } catch (error) {
        console.error('Fehler beim Erstellen des Produkts:', error);
        res.status(500).json({ message: 'Server Fehler' });
    }
});

// Generiere neuen License Key
app.post('/api/generate-license', (req, res) => {
    const { userName, discordId, days = 90 } = req.body;

    if (!userName || !discordId) {
        return res.status(400).json({ message: 'userName und discordId erforderlich' });
    }

    try {
        // Generiere eindeutigen Key
        const key = `KLYRO-${generateRandomString(4)}-${generateRandomString(4)}-${generateRandomString(4)}`;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        const license = {
            key,
            userName,
            discordId,
            createdAt: new Date(),
            expiresAt,
            isActive: true,
            usedAt: null
        };

        licenses.set(key, license);

        res.status(201).json({
            message: 'License Key erstellt',
            key,
            expiresAt,
            userName
        });
    } catch (error) {
        console.error('Fehler beim Generieren des License Keys:', error);
        res.status(500).json({ message: 'Server Fehler' });
    }
});

// Prüfe License Status
app.get('/api/license-status/:key', (req, res) => {
    try {
        const license = licenses.get(req.params.key);

        if (!license) {
            return res.status(404).json({ message: 'License Key nicht gefunden' });
        }

        res.json({
            isActive: license.isActive,
            expiresAt: license.expiresAt,
            userName: license.userName,
            createdAt: license.createdAt
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler' });
    }
});

// ==================== HELPER FUNKTIONEN ====================

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║  🚀 klyroDevelopment Archive - LOCAL       ║
║  Server läuft auf Port ${PORT}                    ║
╚════════════════════════════════════════════╝

📍 Website:     http://localhost:${PORT}
🗄️  Datenbank:   IN-MEMORY (keine MongoDB nötig!)

🧪 Test License Keys:
   • KLYRO-TEST-0001
   • KLYRO-TEST-0002

⚠️  LOCAL DEVELOPMENT MODE - Alle Daten sind lokal gespeichert
    
✨ Ready to go!
    `);
});