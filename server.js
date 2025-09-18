// server.js
const express = require('express');
const crypto = require('crypto');
const { URL } = require('url');
const logger = require('./LoggingMiddleware/logger');

const app = express();
const PORT = 3000;

// in-memory storage
const urls = {};
const clicks = {};

app.use(express.json());
app.use(logger); // Use our custom logging middleware

// Helper function to validate URL
function isValidURL(str) {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
}

// Helper to generate random shortcode
function generateCode() {
    return crypto.randomBytes(3).toString('hex');
}

// Create short URL
app.post('/shorturls', (req, res) => {
    const { url, validity, shortcode } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }
    
    if (!isValidURL(url)) {
        return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    let code = shortcode;
    
    // Check if custom shortcode is valid
    if (shortcode) {
        if (!/^[a-zA-Z0-9]{1,10}$/.test(shortcode)) {
            return res.status(400).json({ error: 'Invalid shortcode format' });
        }
        if (urls[shortcode]) {
            return res.status(409).json({ error: 'Shortcode already exists' });
        }
    } else {
        // Generate unique code
        do {
            code = generateCode();
        } while (urls[code]);
    }
    
    const validMinutes = validity || 30;
    const expiryTime = new Date(Date.now() + validMinutes * 60 * 1000);
    
    // Store URL data
    urls[code] = {
        originalUrl: url,
        createdAt: new Date(),
        expiry: expiryTime,
        clickCount: 0
    };
    
    clicks[code] = [];
    
    res.status(201).json({
        shortLink: `http://localhost:${PORT}/${code}`,
        expiry: expiryTime.toISOString()
    });
});

// Get URL statistics
app.get('/shorturls/:shortcode', (req, res) => {
    const { shortcode } = req.params;
    
    if (!urls[shortcode]) {
        return res.status(404).json({ error: 'Shortcode not found' });
    }
    
    const urlData = urls[shortcode];
    
    if (new Date() > urlData.expiry) {
        return res.status(410).json({ error: 'Short link expired' });
    }
    
    res.json({
        totalClicks: urlData.clickCount,
        originalUrl: urlData.originalUrl,
        createdAt: urlData.createdAt.toISOString(),
        expiryDate: urlData.expiry.toISOString(),
        clickDetails: clicks[shortcode]
    });
});

// Redirect to original URL
app.get('/:shortcode', (req, res) => {
    const { shortcode } = req.params;
    
    if (!urls[shortcode]) {
        return res.status(404).json({ error: 'Shortcode not found' });
    }
    
    const urlData = urls[shortcode];
    
    if (new Date() > urlData.expiry) {
        return res.status(410).json({ error: 'Short link expired' });
    }
    
    // Track click
    urlData.clickCount++;
    clicks[shortcode].push({
        timestamp: new Date().toISOString(),
        referrer: req.get('Referrer') || 'Direct',
        location: 'Unknown',
        userAgent: req.get('User-Agent')
    });
    
    res.redirect(302, urlData.originalUrl);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});