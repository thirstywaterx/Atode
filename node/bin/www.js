const http = require('http');

const PORT = 5001;

// 添加全局错误处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
});

try {
    const serverHandler = require('../app');
    const server = http.createServer(serverHandler);

    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });

    server.on('error', (err) => {
        console.error('服务器错误:', err);
    });
} catch (error) {
    console.error('启动失败:', error);
}