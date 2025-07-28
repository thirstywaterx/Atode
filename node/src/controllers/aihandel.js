const https = require('https');
const config = require('../../config/config.js');

/**
 * 向Gemini API发送请求并返回结果
 * @param {string} prompt - 用户输入的提示文本
 * @param {Array} history - 对话历史记录
 * @returns {Promise<Object>} - API响应结果
 */
async function getAIPrompt(prompt, history = [], signal) {
    const { apiKey, baseUrl, model } = config.gemini;
    
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            return reject(new DOMException('请求已中止', 'AbortError'));
        }

        // 简化内容构建，只发送当前prompt
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        };

        const data = JSON.stringify(requestBody);
        console.log('发送数据:', data);

        const options = {
            hostname: baseUrl,
            port: 443,
            path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data, 'utf8')
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                console.log('响应状态码:', res.statusCode);
                console.log('响应数据:', responseData.substring(0, 200) + '...');
                
                // 检查是否是HTML错误页面
                if (responseData.startsWith('<!DOCTYPE') || responseData.startsWith('<html')) {
                    resolve({
                        success: false,
                        error: `API服务器错误 (状态码: ${res.statusCode})`,
                        debug: 'API返回了HTML错误页面'
                    });
                    return;
                }

                try {
                    const result = JSON.parse(responseData);
                    
                    if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
                        resolve({
                            success: true,
                            data: result.candidates[0].content.parts[0].text
                        });
                    } else if (result.error) {
                        resolve({
                            success: false,
                            error: `API错误: ${result.error.message || result.error}`
                        });
                    } else {
                        resolve({
                            success: false,
                            error: '响应格式无效',
                            debug: result
                        });
                    }
                } catch (error) {
                    resolve({
                        success: false,
                        error: 'JSON解析失败: ' + error.message,
                        raw: responseData.substring(0, 200)
                    });
                }
            });

            res.on('error', (error) => {
                console.error('响应错误:', error);
                resolve({
                    success: false,
                    error: '响应处理失败: ' + error.message
                });
            });
        });

        // 监听中止信号
        signal?.addEventListener('abort', () => {
            req.destroy();
            reject(new DOMException('请求已中止', 'AbortError'));
        });

        req.on('error', (error) => {
            console.error('请求错误:', error);
            resolve({
                success: false,
                error: '网络请求失败: ' + error.message
            });
        });

        req.on('timeout', () => {
            console.error('请求超时');
            req.destroy();
            resolve({
                success: false,
                error: '请求超时，请稍后重试'
            });
        });

        req.on('abort', () => {
            console.error('请求被中止');
            resolve({
                success: false,
                error: '请求被中止'
            });
        });

        req.setTimeout(300000); // 延长到5分钟超时
        
        try {
            req.write(data);
            req.end();
        } catch (error) {
            resolve({
                success: false,
                error: '发送请求失败: ' + error.message
            });
        }
    });
}

/**
 * 流式获取AI响应 (重构版)
 * @param {string} prompt - 用户输入的提示文本
 * @param {Array} history - 对话历史记录
 * @param {Function} onChunk - 接收流式数据的回调函数
 * @returns {Promise<Object>} - 包含最终完整响应或错误的对象
 */
async function getAIPromptStream(prompt, history = [], onChunk, signal) {
    const { apiKey, baseUrl, model } = config.gemini;
    
    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }]
    };

    const options = {
        hostname: baseUrl,
        port: 443,
        path: `/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache'
        }
    };

    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            return reject(new DOMException('请求已中止', 'AbortError'));
        }

        const req = https.request(options, (res) => {
            if (res.statusCode !== 200) {
                let errorBody = '';
                res.on('data', chunk => errorBody += chunk);
                res.on('end', () => {
                    console.error(`API错误响应: ${errorBody}`);
                    resolve({ success: false, error: `API服务器错误 (状态码: ${res.statusCode})` });
                });
                return;
            }

            console.log('✅ 流式连接已建立，开始接收数据...');
            let fullContent = '';

            res.on('data', (chunk) => {
                const lines = chunk.toString().split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.slice(6);
                            const data = JSON.parse(jsonStr);
                            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                                const textChunk = data.candidates[0].content.parts[0].text;
                                fullContent += textChunk;
                                if (onChunk) {
                                    onChunk({ content: textChunk, fullContent });
                                }
                            }
                        } catch (e) {
                            // 忽略不完整的JSON块
                        }
                    }
                }
            });

            res.on('end', () => {
                console.log('✅ 流式传输完成');
                resolve({ success: true, data: fullContent });
            });

            res.on('error', (error) => {
                console.error('流式响应错误:', error);
                resolve({ success: false, error: '流式响应处理失败: ' + error.message });
            });
        });

        // 监听中止信号
        signal?.addEventListener('abort', () => {
            req.destroy();
            reject(new DOMException('请求已中止', 'AbortError'));
        });

        req.on('error', (error) => {
            console.error('流式请求错误:', error);
            resolve({ success: false, error: '网络请求失败: ' + error.message });
        });

        req.setTimeout(300000);
        req.write(JSON.stringify(requestBody));
        req.end();
    });
}

module.exports = { getAIPrompt, getAIPromptStream };
module.exports = { getAIPrompt, getAIPromptStream };
