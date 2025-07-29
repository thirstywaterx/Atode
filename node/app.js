const fs = require('fs');
const path = require('path');
// 引入认证路由和数据库初始化
const authRoutes = require('./src/routes/auth.js');
const { initializeDatabase } = require('./src/db/initDb.js');
const AIData = require('./src/routes/aihandel.js');

// 初始化数据库
initializeDatabase().then(success => {
    if (success) {
        console.log('✅ 数据库初始化成功');
    } else {
        console.error('❌ 数据库初始化失败');
    }
});

// MIME 类型映射
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const serverHandler = async (req, res) => {
    const url = req.url;
    req.path = url.split('?')[0];

    // 处理根路径，重定向到 index.html
    if (req.path === '/') {
        req.path = '/index.html';
    }

    // 处理认证路由
    const authResult = await authRoutes(req, res);
    if (authResult === true) {
        return;
    }
    
    // 处理AI路由
    const AIResult = await AIData(req, res);
    if (AIResult === true) {
        return;
    }

    // 构建文件路径（指向上级目录 d:\Cloudode）
    const filePath = path.join(__dirname, '..', req.path);

    // 检查文件是否存在
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // 文件不存在，返回 404
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.write("404 Not Found\n");
            res.end();
            return;
        }

        // 获取文件扩展名
        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        // 读取并返回文件
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.write("500 Internal Server Error\n");
                res.end();
                return;
            }

            res.writeHead(200, { "Content-Type": contentType });
            res.write(data);
            res.end();
        });
    });
}

module.exports = serverHandler;