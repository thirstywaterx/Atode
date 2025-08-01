const WebSocket = require('ws');
const { getAIPrompt, getAIPromptStream } = require('../controllers/aihandel.js');
const { AICoordinator } = require('../controllers/aiCoordinator.js');

class WebSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.clients = new Map();
        this.coordinator = null;
        this.initCoordinator();
        this.init();
    }

    /**
     * 初始化协调器
     */
    initCoordinator() {
        try {
            const { AICoordinator } = require('../controllers/aiCoordinator.js');
            this.coordinator = new AICoordinator();
            console.log('✅ WebSocket协调器初始化成功');
        } catch (error) {
            console.error('❌ WebSocket协调器初始化失败:', error.message);
            this.coordinator = null;
        }
    }

    init() {
        this.wss.on('connection', (ws) => {
            const clientId = this.generateClientId();
            this.clients.set(clientId, { ws, isProcessing: false, abortController: null });

            console.log(`新客户端连接: ${clientId}`);

            ws.on('message', (message) => {
                this.handleMessage(clientId, message);
            });

            ws.on('close', () => {
                this.clients.delete(clientId);
                console.log(`客户端断开连接: ${clientId}`);
            });
        });
    }

    generateClientId() {
        return `client-${Math.random().toString(36).substr(2, 9)}`;
    }

    async handleMessage(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client) return;

        try {
            const parsedMessage = JSON.parse(message);

            // 优先处理控制消息
            if (parsedMessage.type === 'ping') return;

            if (parsedMessage.type === 'stop_task') {
                if (client.isProcessing && client.abortController) {
                    console.log(`客户端 ${clientId} 请求停止任务，发送中止信号。`);
                    client.abortController.abort();
                }
                return;
            }

            if (client.isProcessing) return;

            const { prompt, history = [], useCoordinator = true } = parsedMessage;

            client.isProcessing = true;
            const abortController = new AbortController();
            client.abortController = abortController;
            
            this.sendMessage(clientId, {
                type: 'processing_start',
                message: 'AI思考中...'
            });

            try {
                let finalContent = '';
                
                const streamCallback = (chunk) => {
                    console.log(`📤 发送流式数据到客户端 ${clientId}: ${chunk.fullContent ? chunk.fullContent.length : 0} 字符`);
                    this.sendMessage(clientId, {
                        type: 'stream_chunk',
                        chunk: chunk.content,
                        fullContent: chunk.fullContent
                    });
                };

                if (useCoordinator && this.coordinator) {
                    console.log(`🤖 使用AI协调器处理客户端 ${clientId} 的请求`);
                    
                    const result = await this.coordinator.processUserRequestStream(
                        prompt, 
                        history, 
                        streamCallback, 
                        (stageUpdate) => {
                            console.log(`📤 发送阶段更新到客户端 ${clientId}:`, stageUpdate);
                            this.sendMessage(clientId, stageUpdate);
                        }, 
                        abortController.signal
                    );
                    
                    if (result.success) {
                        finalContent = result.data;
                        console.log(`✅ 协调器处理完成，最终内容长度: ${finalContent.length}`);
                    } else {
                        console.error(`❌ 协调器处理失败: ${result.error}`);
                        throw new Error(result.error);
                    }
                } else {
                    console.log(`🔧 使用基础AI处理客户端 ${clientId} 的请求`);
                    this.sendMessage(clientId, { type: 'stream_start' });
                    
                    const result = await getAIPromptStream(prompt, history, streamCallback, abortController.signal);
                    
                    if (result.success) {
                        finalContent = result.data;
                        console.log(`✅ 基础AI处理完成，最终内容长度: ${finalContent.length}`);
                    } else {
                        console.error(`❌ 基础AI处理失败: ${result.error}`);
                        throw new Error(result.error);
                    }
                }

                // 确保发送完成消息
                console.log(`📤 发送完成消息到客户端 ${clientId}`);
                this.sendMessage(clientId, { 
                    type: 'stream_complete',
                    content: finalContent,
                    fullContent: finalContent
                });

            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log(`⏸️ 任务被客户端 ${clientId} 中止`);
                    this.sendMessage(clientId, {
                        type: 'stream_complete',
                        content: '任务已中止',
                        fullContent: '任务已中止'
                    });
                } else {
                    console.error(`❌ 处理客户端 ${clientId} 请求时出错:`, error);
                    this.sendMessage(clientId, {
                        type: 'error',
                        message: 'AI处理失败: ' + error.message
                    });
                }
            } finally {
                client.isProcessing = false;
                client.abortController = null;
            }

        } catch (parseError) {
            console.error(`❌ 解析客户端 ${clientId} 消息失败:`, parseError);
        }
    }

    sendMessage(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            try {
                const messageStr = JSON.stringify(message);
                console.log(`📤 向客户端 ${clientId} 发送消息: ${message.type}`);
                client.ws.send(messageStr);
            } catch (error) {
                console.error(`❌ 发送消息到客户端 ${clientId} 失败:`, error);
            }
        } else {
            console.warn(`⚠️ 无法发送消息到客户端 ${clientId}: 连接不可用`);
        }
    }
}

module.exports = WebSocketServer;