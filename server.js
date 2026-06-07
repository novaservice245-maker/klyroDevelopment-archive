const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/klyro-archive', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// ==================== SCHEMAS ====================

// License Key Schema
const licenseSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    userId: String,
    userName: String,
    discordId: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date,
    isActive: { type: Boolean, default: true },
    usedAt: Date
});

// Product Schema
const productSchema = new mongoose.Schema({
    title: String,
    category: String,
    type: String,
    description: String,
    size: String,
    image: String,
    uploadDate: { type: Date, default: Date.now },
    downloadUrl: String,
    uploader: String,
    createdAt: { type: Date, default: Date.now }
});

const License = mongoose.model('License', licenseSchema);
const Product = mongoose.model('Product', productSchema);

// ==================== API ROUTES ====================

// Validiere License Key
app.post('/api/validate-license', async (req, res) => {
    const { licenseKey } = req.body;

    if (!licenseKey) {
        return res.status(400).json({ message: 'License Key erforderlich' });
    }

    try {
        const license = await License.findOne({ key: licenseKey });

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
        await license.save();

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
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ uploadDate: -1 });
        res.json(products);
    } catch (error) {
        console.error('Fehler beim Laden der Produkte:', error);
        res.status(500).json({ message: 'Server Fehler' });
    }
});

// Erstelle neuen Product (Admin)
app.post('/api/products', async (req, res) => {
    const { title, category, type, description, size, image, downloadUrl, uploader } = req.body;

    if (!title || !category) {
        return res.status(400).json({ message: 'Title und Category erforderlich' });
    }

    try {
        const product = new Product({
            title,
            category,
            type,
            description,
            size,
            image,
            downloadUrl,
            uploader
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        console.error('Fehler beim Erstellen des Produkts:', error);
        res.status(500).json({ message: 'Server Fehler' });
    }
});

// Generiere neuen License Key
app.post('/api/generate-license', async (req, res) => {
    const { userName, discordId, days = 90 } = req.body;

    if (!userName || !discordId) {
        return res.status(400).json({ message: 'userName und discordId erforderlich' });
    }

    try {
        // Generiere eindeutigen Key
        const key = `KLYRO-${generateRandomString(4)}-${generateRandomString(4)}-${generateRandomString(4)}`;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        const license = new License({
            key,
            userName,
            discordId,
            expiresAt,
            isActive: true
        });

        await license.save();

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
app.get('/api/license-status/:key', async (req, res) => {
    try {
        const license = await License.findOne({ key: req.params.key });

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

// ==================== ADMIN ROUTES ====================

// Liste alle License Keys (Admin)
app.get('/api/admin/licenses', async (req, res) => {
    const adminToken = req.headers.authorization?.split(' ')[1];

    if (adminToken !== process.env.ADMIN_TOKEN) {
        return res.status(403).json({ message: 'Unauthorisiert' });
    }

    try {
        const licenses = await License.find();
        res.json(licenses);
    } catch (error) {
        res.status(500).json({ message: 'Server Fehler' });
    }
});

// Deaktiviere License Key
app.patch('/api/admin/license/:key/deactivate', async (req, res) => {
    const adminToken = req.headers.authorization?.split(' ')[1];

    if (adminToken !== process.env.ADMIN_TOKEN) {
        return res.status(403).json({ message: 'Unauthorisiert' });
    }

    try {
        const license = await License.findOneAndUpdate(
            { key: req.params.key },
            { isActive: false },
            { new: true }
        );

        res.json({ message: 'License Key deaktiviert', license });
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
    console.log(`🚀 Server läuft auf Port ${PORT}`);
    console.log(`📚 API verfügbar unter http://localhost:${PORT}/api`);
});