const http = require('http');

const PORT = 5001;

const serverHandler = require('../app');

// 需要将 serverHandler 传入 createServer
const server = http.createServer(serverHandler);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('服务器启动失败:', err);
});