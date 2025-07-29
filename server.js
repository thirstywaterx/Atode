const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();
const db = new sqlite3.Database('./users.db');

// 自动建表
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    token TEXT
)`);

app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('.'));

function hash(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

function genToken() {
    return crypto.randomBytes(24).toString('hex');
}

// 注册
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ success: false, message: '用户名和密码不能为空' });
    db.get('SELECT * FROM users WHERE username=?', [username], (err, row) => {
        if (row) return res.json({ success: false, message: '用户名已存在' });
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash(password)], err => {
            if (err) return res.json({ success: false, message: '注册失败' });
            res.json({ success: true });
        });
    });
});

// 登录
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username=?', [username], (err, row) => {
        if (!row || row.password !== hash(password)) return res.json({ success: false, message: '用户名或密码错误' });
        const token = genToken();
        db.run('UPDATE users SET token=? WHERE username=?', [token, username]);
        res.json({ success: true, token });
    });
});

// 校验
app.get('/api/check', (req, res) => {
    const token = req.headers.authorization || req.cookies.token;
    if (!token) return res.json({ success: false });
    db.get('SELECT * FROM users WHERE token=?', [token], (err, row) => {
        if (row) res.json({ success: true, username: row.username });
        else res.json({ success: false });
    });
});

app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});
