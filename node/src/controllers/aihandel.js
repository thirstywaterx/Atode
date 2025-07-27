const https = require('https');
const config = require('../../config/config.js');

/**
 * 向Gemini API发送请求并返回结果
 * @param {string} prompt - 用户输入的提示文本
 * @param {Array} history - 对话历史记录
 * @returns {Promise<Object>} - API响应结果
 */
async function getAIPrompt(prompt, history = []) {
    const { apiKey, baseUrl, model } = config.gemini;
    
    return new Promise((resolve, reject) => {
        // 构建包含历史对话的内容
        const contents = [];
        
        // 添加历史对话
        if (history && history.length > 0) {
            for (let i = 0; i < history.length; i++) {
                const msg = history[i];
                contents.push({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                });
            }
        } else {
            // 如果没有历史记录，只添加当前用户消息
            contents.push({
                role: 'user',
                parts: [{ text: prompt }]
            });
        }

        const data = JSON.stringify({
            contents: contents
        });

        const options = {
            hostname: baseUrl,
            port: 443,
            path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    console.log('Gemini API Response:', JSON.stringify(result, null, 2));
                    
                    if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
                        const aiResponse = result.candidates[0].content.parts[0].text;
                        
                        resolve({
                            success: true,
                            data: aiResponse
                        });
                    } else if (result.error) {
                        resolve({
                            success: false,
                            error: `API Error: ${result.error.message || result.error}`
                        });
                    } else {
                        resolve({
                            success: false,
                            error: 'Invalid response format',
                            debug: result
                        });
                    }
                } catch (error) {
                    console.error('Parse error:', error, 'Raw response:', responseData);
                    reject({
                        success: false,
                        error: 'Failed to parse response',
                        raw: responseData
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject({
                success: false,
                error: error.message
            });
        });

        req.write(data);
        req.end();
    });
}

module.exports = { getAIPrompt };
