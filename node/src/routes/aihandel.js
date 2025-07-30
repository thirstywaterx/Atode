const { getAIPrompt } = require('../controllers/aihandel.js');
const { AICoordinator } = require('../controllers/aiCoordinator.js');
const { taskManager } = require('../controllers/taskManager.js');
const { htmlRenderer } = require('../controllers/htmlRenderer.js');
const sessionManager = require('../controllers/sessionManager.js');
const chatHistoryController = require('../controllers/chatHistoryController.js');

let coordinator;
try {
    coordinator = new AICoordinator();
} catch (error) {
    console.error('协调器初始化失败:', error);
    coordinator = null;
}

const AIData = async (req, res) => {
    const method = req.method;
    const path = req.path;

    // 验证用户会话
    if (path.startsWith('/api/ai/')) {
        const cookies = req.headers.cookie || '';
        const sessionId = cookies.split(';').find(c => c.trim().startsWith('sessionId='))?.split('=')[1];
        const session = sessionId ? sessionManager.getSession(sessionId) : null;

        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: '请先登录后再使用AI功能' }));
            return true; // 阻止后续处理
        }
    }

    console.log('AI Route:', method, path); // 添加调试日志

    // 保存聊天历史记录
    if (method === 'POST' && path === '/api/ai/save-history') {
        try {
            const cookies = req.headers.cookie || '';
            const sessionId = cookies.split(';').find(c => c.trim().startsWith('sessionId='))?.split('=')[1];
            const session = sessionId ? sessionManager.getSession(sessionId) : null;
            
            if (!session) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: '请先登录后再使用此功能' }));
                return true;
            }
            
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    const { title, content } = JSON.parse(body);
                    
                    if (!title || !content) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: '标题和内容不能为空' }));
                        return;
                    }
                    
                    const result = await chatHistoryController.saveHistory(session.userId, title, content);
                    
                    res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (error) {
                    console.error('保存聊天历史处理错误:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: '处理请求失败: ' + error.message }));
                }
            });
            
            return true;
        } catch (error) {
            console.error('保存聊天历史路由错误:', error);
            return false;
        }
    }

    // 获取聊天历史记录
    if (method === 'GET' && path === '/api/ai/history') {
        try {
            const cookies = req.headers.cookie || '';
            const sessionId = cookies.split(';').find(c => c.trim().startsWith('sessionId='))?.split('=')[1];
            const session = sessionId ? sessionManager.getSession(sessionId) : null;
            
            if (!session) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: '请先登录后再使用此功能' }));
                return true;
            }
            
            const result = await chatHistoryController.getHistory(session.userId);
            
            res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return true;
        } catch (error) {
            console.error('获取聊天历史路由错误:', error);
            return false;
        }
    }
    
    // 删除聊天历史记录
    if (method === 'DELETE' && path.startsWith('/api/ai/history/')) {
        try {
            const historyId = path.split('/').pop();
            const cookies = req.headers.cookie || '';
            const sessionId = cookies.split(';').find(c => c.trim().startsWith('sessionId='))?.split('=')[1];
            const session = sessionId ? sessionManager.getSession(sessionId) : null;
            
            if (!session) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: '请先登录后再使用此功能' }));
                return true;
            }
            
            const result = await chatHistoryController.deleteHistory(session.userId, historyId);
            
            res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return true;
        } catch (error) {
            console.error('删除聊天历史路由错误:', error);
            return false;
        }
    }

    // 创建异步任务
    if (method === 'POST' && path === '/api/ai/create-task') {
        try {
            // 获取请求体中的prompt
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    const requestData = JSON.parse(body);
                    const { prompt, history, useCoordinator = false } = requestData; // 默认不使用协调器
                    
                    // 输入验证
                    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({
                            success: false,
                            error: '无效的prompt输入'
                        }));
                        return;
                    }
                    
                    const taskId = await taskManager.createTask(prompt.trim(), history || [], useCoordinator);
                    
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                        success: true,
                        taskId: taskId,
                        message: '任务已创建，请轮询获取结果'
                    }));
                } catch (error) {
                    console.error('创建任务错误:', error);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                        success: false,
                        error: '创建任务失败: ' + error.message
                    }));
                }
            });
            
            return true; // 表示已处理该路由
        } catch (error) {
            console.error('任务创建路由错误:', error);
            return false;
        }
    }

    // 获取任务状态
    if (method === 'GET' && path.startsWith('/api/ai/task-status/')) {
        try {
            const taskId = path.split('/').pop();
            const taskStatus = taskManager.getTaskStatus(taskId);
            
            if (!taskStatus) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    success: false,
                    error: '任务不存在或已过期'
                }));
                return true;
            }
            
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                success: true,
                task: taskStatus
            }));
            return true;
        } catch (error) {
            console.error('获取任务状态错误:', error);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                success: false,
                error: '获取任务状态失败: ' + error.message
            }));
            return true;
        }
    }

    // 原有的同步处理路由
    if (method === 'POST' && path === '/api/ai/postprompt') {
        try {
            // 获取请求体中的prompt
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    console.log('收到请求体:', body);
                    const requestData = JSON.parse(body);
                    const { prompt, history, useCoordinator = false } = requestData; // 默认不使用协调器
                    
                    // 输入验证
                    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({
                            success: false,
                            error: '无效的prompt输入'
                        }));
                        return;
                    }
                    
                    let result;
                    let retryCount = 0;
                    const maxRetries = 3; // 增加重试次数，因为现在有质量控制
                    
                    while (retryCount < maxRetries) {
                        if (useCoordinator && coordinator) {
                            console.log(`使用AI协调器 (尝试 ${retryCount + 1}/${maxRetries})`);
                            result = await coordinator.processUserRequest(prompt.trim(), history || []);
                            
                            // 检查质量评分，如果太低则重试
                            if (result.success && result.process?.reviewResults?.overallScore < 6 && retryCount < maxRetries - 1) {
                                console.log(`质量评分过低 (${result.process.reviewResults.overallScore}/10)，重试...`);
                                retryCount++;
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                continue;
                            }
                        } else {
                            console.log(`使用基础AI (尝试 ${retryCount + 1}/${maxRetries})`);
                            result = await getAIPrompt(prompt.trim(), history || []);
                        }
                        
                        // 如果成功或者不是超时错误，就跳出重试循环
                        if (result.success || !result.error?.includes('超时')) {
                            break;
                        }
                        
                        retryCount++;
                        if (retryCount < maxRetries) {
                            console.log('请求超时，2秒后重试...');
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    }
                    
                    // 在返回结果中添加质量信息
                    if (result.success && result.process?.reviewResults) {
                        const review = result.process.reviewResults;
                        result.qualityInfo = {
                            score: review.overallScore,
                            grade: review.overallScore >= 9 ? 'A+' : 
                                   review.overallScore >= 8 ? 'A' : 
                                   review.overallScore >= 7 ? 'B+' : 
                                   review.overallScore >= 6 ? 'B' : 'C',
                            attempts: result.process.attempts || 1,
                            approved: review.approved
                        };
                    }
                    
                    console.log('返回结果:', result);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(result));
                } catch (parseError) {
                    console.error('请求处理错误:', parseError);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                        success: false,
                        error: '请求处理失败: ' + parseError.message
                    }));
                }
            });
            
            return true; // 表示已处理该路由
        } catch (error) {
            console.error('路由错误:', error); // 添加错误日志
            return false;
        }
    }

    // 新增：HTML预览图片生成路由
    if (method === 'POST' && path === '/api/ai/preview-html') {
        try {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    const { htmlContent } = JSON.parse(body);
                    
                    if (!htmlContent) {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({
                            success: false,
                            error: 'HTML内容不能为空'
                        }));
                        return;
                    }
                    
                    // 只有明确包含HTML标签的内容才进行预览
                    if (!/<\s*html|<\s*!DOCTYPE|<\s*body|<\s*head/i.test(htmlContent)) {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({
                            success: false,
                            error: '内容不是有效的HTML格式'
                        }));
                        return;
                    }
                    
                    const base64Image = await htmlRenderer.convertToBase64(htmlContent);
                    
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                        success: true,
                        image: `data:image/png;base64,${base64Image}`,
                        message: 'HTML预览图生成成功'
                    }));
                } catch (error) {
                    console.error('生成HTML预览失败:', error);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                        success: false,
                        error: '生成预览失败: ' + error.message
                    }));
                }
            });
            
            return true;
        } catch (error) {
            console.error('HTML预览路由错误:', error);
            return false;
        }
    }

    // 新增：终止任务路由
    if (method === 'POST' && path.startsWith('/api/ai/stop-task/')) {
        try {
            const taskId = path.split('/').pop();
            const result = taskManager.stopTask(taskId);
            
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                success: result,
                message: result ? '任务已终止' : '任务终止失败或任务不存在'
            }));
            return true;
        } catch (error) {
            console.error('终止任务错误:', error);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
                success: false,
                error: '终止任务失败: ' + error.message
            }));
            return true;
        }
    }

    // 新增：HTML视觉质量分析路由
    if (method === 'POST' && path === '/api/ai/analyze-visual') {
        try {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    const { htmlContent } = JSON.parse(body);
                    
                    if (!htmlContent) {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({
                            success: false,
                            error: 'HTML内容不能为空'
                        }));
                        return;
                    }
                    
                    // 使用visualRenderer进行严格的视觉分析
                    const { visualRenderer } = require('../controllers/visualRenderer.js');
                    
                    if (!visualRenderer.isAvailable) {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({
                            success: false,
                            error: '视觉分析服务不可用，请检查Puppeteer安装'
                        }));
                        return;
                    }
                    
                    const analysisResult = await visualRenderer.comprehensiveAnalysis(htmlContent);
                    
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(analysisResult));
                } catch (error) {
                    console.error('HTML视觉分析失败:', error);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                        success: false,
                        error: '视觉分析失败: ' + error.message
                    }));
                }
            });
            
            return true;
        } catch (error) {
            console.error('HTML视觉分析路由错误:', error);
            return false;
        }
    }

    return false; // 表示未处理该路由
}

module.exports = AIData;