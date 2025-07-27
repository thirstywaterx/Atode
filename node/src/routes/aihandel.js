const { getAIPrompt } = require('../controllers/aihandel.js');

const AIData = async (req, res) => {
    const method = req.method;
    const path = req.path;

    console.log('AI Route:', method, path); // 添加调试日志

    if (method === 'POST' && path === '/api/ai/postprompt') {
        try {
            // 获取请求体中的prompt
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                try {
                    console.log('Request body:', body);
                    const { prompt, history } = JSON.parse(body);
                    const result = await getAIPrompt(prompt, history);
                    
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(result));
                } catch (error) {
                    console.error('处理请求错误:', error); // 添加错误日志
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                        success: false,
                        error: error.message
                    }));
                }
            });
            
            return true; // 表示已处理该路由
        } catch (error) {
            console.error('路由处理错误:', error); // 添加错误日志
            return false;
        }
    }

    return false; // 表示未处理该路由
}

module.exports = AIData;