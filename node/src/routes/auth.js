const userController = require('../controllers/userController.js');
const sessionManager = require('../controllers/sessionManager.js');

async function handleAuthRoutes(req, res) {
    const { method, path } = req;

    // 提取请求体 - 改进版，更好地支持不同类型的数据
    const getBody = () => new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                // 尝试解析JSON，如果失败则解析为表单数据
                try {
                    resolve(JSON.parse(body || '{}'));
                } catch (e) {
                    // 如果不是JSON，尝试解析表单数据
                    const formData = {};
                    body.split('&').forEach(item => {
                        const [key, value] = item.split('=');
                        if (key && value) {
                            formData[decodeURIComponent(key)] = decodeURIComponent(value);
                        }
                    });
                    resolve(formData);
                }
            } catch (e) {
                reject(new Error('Invalid request body'));
            }
        });
    });

    // 注册
    if (method === 'POST' && path === '/api/register') {
        try {
            const { username, password, email } = await getBody();
            const result = await userController.registerUser(username, password, email);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return true;
    }

    // 登录
    if (method === 'POST' && path === '/api/login') {
        try {
            const { username, password, rememberMe } = await getBody();
            const result = await userController.loginUser(username, password);
            if (result.success) {
                const { sessionId, expires } = sessionManager.createSession(result.user, rememberMe === 'true' || rememberMe === true);
                const cookieOptions = [
                    `sessionId=${sessionId}`,
                    'HttpOnly',
                    'Path=/',
                    'SameSite=Strict',
                    // 'Secure', // 在生产环境中使用HTTPS时取消注释
                    `Expires=${new Date(expires).toUTCString()}`
                ];
                res.setHeader('Set-Cookie', cookieOptions.join('; '));
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
        } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return true;
    }

    // 登出
    if (method === 'POST' && path === '/api/logout') {
        const cookies = req.headers.cookie || '';
        const sessionId = cookies.split(';').find(c => c.trim().startsWith('sessionId='))?.split('=')[1];
        if (sessionId) {
            sessionManager.deleteSession(sessionId);
        }
        res.setHeader('Set-Cookie', 'sessionId=; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, message: '登出成功' }));
        return true;
    }

    // 检查会话状态
    if (method === 'GET' && path === '/api/session') {
        const cookies = req.headers.cookie || '';
        const sessionId = cookies.split(';').find(c => c.trim().startsWith('sessionId='))?.split('=')[1];
        const session = sessionId ? sessionManager.getSession(sessionId) : null;
        res.setHeader('Content-Type', 'application/json');
        if (session) {
            res.end(JSON.stringify({ success: true, user: { id: session.userId, username: session.username } }));
        } else {
            res.end(JSON.stringify({ success: false }));
        }
        return true;
    }

    return false;
}

module.exports = handleAuthRoutes;
