const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { execSQLWithPromise } = require('./node/src/db/mysql.js');
const app = express();

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
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ success: false, message: '用户名和密码不能为空' });
    try {
        const users = await execSQLWithPromise('SELECT * FROM users WHERE username=?', [username]);
        if (users.length > 0) return res.json({ success: false, message: '用户名已存在' });
        await execSQLWithPromise('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash(password)]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: '注册失败' });
    }
});

// 登录
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const users = await execSQLWithPromise('SELECT * FROM users WHERE username=?', [username]);
        if (users.length === 0 || users[0].password !== hash(password)) {
            return res.json({ success: false, message: '用户名或密码错误' });
        }
        const token = genToken();
        await execSQLWithPromise('UPDATE users SET token=? WHERE username=?', [token, username]);
        res.json({ success: true, token });
    } catch (err) {
        res.json({ success: false, message: '登录失败' });
    }
});

// 校验
app.get('/api/check', async (req, res) => {
    const token = req.headers.authorization || req.cookies.token;
    if (!token) return res.json({ success: false });
    try {
        const users = await execSQLWithPromise('SELECT * FROM users WHERE token=?', [token]);
        if (users.length > 0) {
            res.json({ success: true, username: users[0].username });
        } else {
            res.json({ success: false });
        }
    } catch (err) {
        res.json({ success: false });
    }
});

app.listen(5001, () => {
    console.log('Server running at http://localhost:5001');
});
