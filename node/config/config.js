require('dotenv').config();

module.exports = {
    gemini: {
        apiKey: process.env.GEMINI_API_KEY || 'YOUR_API_KEY',
        baseUrl: process.env.GEMINI_BASE_URL || 'generativelanguage.googleapis.com',
        model: process.env.GEMINI_MODEL || 'gemini-2.5-pro'
    },
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '3306',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'atode'
    }
};
