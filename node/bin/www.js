const http = require('http');
const path = require('path');
const WebSocketServer = require('../src/websocket/websocketServer.js');
const { AICoordinator } = require('../src/controllers/aiCoordinator.js');

const PORT = process.env.PORT || 5001;

// 添加全局错误处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
});

try {
    // 修正app路径引用 - 从 ../../app 改为 ../app
    const serverHandler = require('../app');
    const server = http.createServer(serverHandler);

    // 初始化并附加WebSocket服务器
    const wss = new WebSocketServer(server);
    // 初始化AI协调器并注入到WebSocket服务器中
    wss.coordinator = new AICoordinator();
    console.log('✅ WebSocket服务器已附加');

    server.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`📁 Working directory: ${process.cwd()}`);
        console.log(`📦 Node modules from: ${path.resolve('node_modules')}`);
    });

    server.on('error', (err) => {
        console.error('服务器错误:', err);
    });
} catch (error) {
    console.error('启动失败:', error);
    process.exit(1);
}