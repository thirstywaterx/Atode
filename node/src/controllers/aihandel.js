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
    
    return new Promise((resolve) => {
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

module.exports = { getAIPrompt };
