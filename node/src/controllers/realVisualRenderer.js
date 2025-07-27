const puppeteer = require('puppeteer');
const fs = require('fs').promises;

class RealVisualRenderer {
    constructor() {
        this.browser = null;
    }

    async renderToImage(htmlContent) {
        try {
            // 1. 启动浏览器
            this.browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            // 2. 创建页面并设置HTML内容
            const page = await this.browser.newPage();
            await page.setViewport({ width: 1200, height: 800 });
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

            // 3. 截图生成图片
            const screenshot = await page.screenshot({
                type: 'png',
                fullPage: true,
                encoding: 'base64'
            });

            // 4. 关闭浏览器
            await this.browser.close();

            return screenshot;
        } catch (error) {
            if (this.browser) await this.browser.close();
            throw error;
        }
    }

    async sendImageToAI(base64Image, analysisPrompt) {
        // 5. 将图片发送给支持视觉的AI模型（如GPT-4V, Gemini Pro Vision）
        const imageAnalysisPrompt = `
请分析这个网页的视觉设计质量：

${analysisPrompt}

请从以下角度评价：
1. 视觉层次是否清晰
2. 色彩搭配是否和谐
3. 布局是否平衡
4. 字体排版是否易读
5. 整体设计是否专业

图片数据: data:image/png;base64,${base64Image}
        `;

        // 调用支持图片的AI API
        return await this.callVisionAI(imageAnalysisPrompt, base64Image);
    }

    async callVisionAI(prompt, image) {
        // 这里需要调用支持视觉的AI API
        // 比如OpenAI的GPT-4V或Google的Gemini Pro Vision
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-4-vision-preview",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:image/png;base64,${image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000
            })
        });

        return await response.json();
    }
}

module.exports = { RealVisualRenderer };
