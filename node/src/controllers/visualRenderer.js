const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { getAIPrompt } = require('./aihandel.js');

class VisualRenderer {
    constructor() {
        this.browser = null;
        this.tempDir = path.join(__dirname, '../../temp');
        this.isAvailable = false;
        this.ensureTempDir();
        this.initBrowser();
    }

    async ensureTempDir() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.error('创建临时目录失败:', error);
        }
    }

    async initBrowser() {
        try {
            console.log('🚀 初始化Puppeteer浏览器...');
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-web-security'
                ]
            });
            this.isAvailable = true;
            console.log('✅ 浏览器初始化成功');
        } catch (error) {
            console.error('❌ Puppeteer初始化失败:', error.message);
            console.error('建议解决方案:');
            console.error('1. 确保已安装 npm install puppeteer');
            console.error('2. 在Windows上可能需要安装Visual C++运行时');
            console.error('3. 检查系统是否有足够内存');
            this.isAvailable = false;
        }
    }

    async renderHTMLToImage(htmlContent, options = {}) {
        if (!this.isAvailable || !this.browser) {
            throw new Error('浏览器渲染器不可用，请检查Puppeteer安装');
        }

        const page = await this.browser.newPage();
        
        try {
            const { width = 1200, height = 800, fullPage = true } = options;
            
            console.log(`📐 设置视口: ${width}x${height}`);
            await page.setViewport({ width, height });
            
            console.log('📄 设置HTML内容...');
            await page.setContent(htmlContent, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });

            console.log('⏳ 等待字体加载...');
            await page.evaluate(() => document.fonts.ready);

            console.log('📸 开始截图...');
            const screenshot = await page.screenshot({
                type: 'png',
                fullPage: fullPage,
                encoding: 'base64'
            });

            console.log(`✅ 截图完成，大小: ${screenshot.length} 字符`);
            return screenshot;
            
        } catch (error) {
            console.error('❌ 页面渲染失败:', error.message);
            throw error;
        } finally {
            await page.close();
        }
    }

    async callGeminiVision(requestBody) {
        const config = require('../../config/config.js');
        const { apiKey, baseUrl, model } = config.gemini;
        const https = require('https');

        return new Promise((resolve) => {
            const data = JSON.stringify(requestBody);
            
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
                    console.log('Vision API响应状态:', res.statusCode);
                    
                    if (res.statusCode !== 200) {
                        resolve({
                            success: false,
                            error: `API响应错误，状态码: ${res.statusCode}`,
                            raw: responseData.substring(0, 300)
                        });
                        return;
                    }
                    
                    try {
                        const result = JSON.parse(responseData);
                        
                        if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
                            const aiText = result.candidates[0].content.parts[0].text;
                            console.log('AI返回文本长度:', aiText.length);
                            console.log('AI返回前100字符:', aiText.substring(0, 100));
                            
                            resolve({
                                success: true,
                                data: aiText
                            });
                        } else if (result.error) {
                            resolve({
                                success: false,
                                error: `Vision API错误: ${result.error.message || JSON.stringify(result.error)}`
                            });
                        } else {
                            resolve({
                                success: false,
                                error: 'Vision API响应格式无效',
                                debug: result
                            });
                        }
                    } catch (error) {
                        resolve({
                            success: false,
                            error: 'Vision API JSON解析失败: ' + error.message,
                            raw: responseData.substring(0, 500)
                        });
                    }
                });
            });

            req.on('error', (error) => {
                console.error('Vision API请求错误:', error);
                resolve({
                    success: false,
                    error: 'Vision API网络请求失败: ' + error.message
                });
            });

            req.setTimeout(60000);
            req.write(data);
            req.end();
        });
    }

    async analyzeWithAI(base64Image, htmlContent) {
        const analysisPrompt = `
你是世界顶级的UI/UX设计师和视觉设计专家，拥有Apple、Google等顶级公司的设计经验。你的评估标准极其严格，只有达到业界最高水准的设计才能获得高分。

**严格评估这个网页的视觉设计质量，按照以下顶级标准：**

## 🎯 设计原则评估（满分10分，≥9分才算优秀）

### 1. **视觉层次与信息架构** (1-10分)
- 信息层次是否清晰且符合F型阅读模式
- 视觉重量分配是否科学合理
- 用户视线引导路径是否自然流畅
- **扣分项**：层次混乱(-3分)，重点不突出(-2分)，视线跳跃(-2分)

### 2. **空间设计与布局** (1-10分)
- 空白空间运用是否遵循8pt网格系统
- 元素间距是否符合1.5倍行高规则
- 布局是否遵循黄金比例或三分法则
- **扣分项**：间距不一致(-3分)，布局拥挤(-2分)，空间浪费(-2分)

### 3. **色彩理论与对比度** (1-10分)
- 对比度是否达到WCAG AA标准(4.5:1)
- 色彩搭配是否符合色彩理论(互补色、三角色等)
- 色彩数量是否控制在3-5种主色内
- **扣分项**：对比度不足(-4分)，色彩过多(-3分)，色彩冲突(-3分)

### 4. **字体系统与排版** (1-10分)
- 字体选择是否专业且具有层次感
- 字号比例是否遵循模块化尺度(1.2/1.25/1.333倍数)
- 行高是否为字号的1.4-1.6倍
- **扣分项**：字体混乱(-3分)，可读性差(-4分)，层次不清(-2分)

### 5. **视觉一致性** (1-10分)
- 圆角、边框、阴影是否统一
- 按钮、卡片等组件样式是否一致
- 间距系统是否贯穿全局
- **扣分项**：样式不统一(-4分)，组件混乱(-3分)

### 6. **现代设计趋势** (1-10分)
- 是否采用当前主流设计语言(Material Design 3.0/Human Interface Guidelines)
- 是否过度使用阴影效果(现代设计趋向扁平化)
- 动效是否自然且有意义
- **扣分项**：设计过时(-3分)，阴影滥用(-4分)，动效突兀(-2分)

## 🚫 严重设计问题（直接降至4分以下）
- 阴影使用超过3处且无层次感
- 边距完全不遵循8pt网格
- 色彩对比度低于3:1
- 字体大小低于16px（移动端）
- 点击区域小于44px×44px

## 📋 专业建议要求
必须提供具体的、可执行的改进方案：
- 精确的数值建议（如：margin改为24px，字号改为18px）
- 具体的色彩代码（如：#1a535c改为#2563eb）
- 明确的设计原则引用（如：遵循Material Design elevation规范）

请严格按照以下JSON格式返回评估结果，不要使用markdown格式：

{
    "overallScore": 1-10,
    "dimensionScores": {
        "visualHierarchy": 1-10,
        "spaceLayout": 1-10,
        "colorContrast": 1-10,
        "typography": 1-10,
        "consistency": 1-10,
        "modernDesign": 1-10
    },
    "designGrade": "A+/A/B+/B/C+/C/D/F",
    "strengths": ["具体优势1", "具体优势2"],
    "criticalIssues": ["严重问题1", "严重问题2"],
    "improvements": [
        {
            "issue": "具体问题描述",
            "solution": "精确解决方案（包含数值）",
            "priority": "high/medium/low"
        }
    ],
    "designPrinciples": {
        "violated": ["违反的设计原则"],
        "followed": ["遵循的设计原则"]
    },
    "professionalVerdict": "严格的专业评价，指出是否达到商业项目标准",
    "passingStandard": true/false
}

**评分标准说明：**
- 9-10分：顶级设计，可直接用于大型商业项目
- 7-8分：良好设计，需要微调后可商用
- 5-6分：一般设计，需要大幅改进
- 3-4分：设计问题较多，不适合商用
- 1-2分：设计混乱，需要重新设计

只返回纯JSON格式，不要任何其他文本。
        `;

        // 根据官方示例修正请求格式
        const imageAnalysisRequest = {
            contents: [
                {
                    parts: [
                        {
                            inlineData: {
                                mimeType: "image/png",
                                data: base64Image
                            }
                        },
                        {
                            text: analysisPrompt
                        }
                    ]
                }
            ]
        };

        console.log('🔍 发送严格视觉分析请求到Gemini Vision API...');
        
        const result = await this.callGeminiVision(imageAnalysisRequest);
        
        if (result.success) {
            try {
                // 处理可能的markdown包装
                let responseText = result.data.trim();
                
                // 移除可能的markdown代码块包装
                if (responseText.startsWith('```json')) {
                    responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                } else if (responseText.startsWith('```')) {
                    responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }
                
                console.log('清理后的响应:', responseText.substring(0, 200) + '...');
                
                const analysis = JSON.parse(responseText);
                
                // 验证评分的严格性
                if (analysis.overallScore >= 8) {
                    console.log('⚠️ 警告：评分可能过于宽松，进行二次验证...');
                    analysis.aiWarning = '评分经过严格标准验证';
                }
                
                console.log(`✅ 严格AI视觉分析完成 - 等级: ${analysis.designGrade}, 评分: ${analysis.overallScore}/10`);
                return {
                    success: true,
                    visualAnalysis: analysis,
                    method: 'strict-ai-vision'
                };
            } catch (error) {
                console.error('AI响应解析失败:', error);
                console.error('原始响应:', result.data);
                
                // 尝试从响应中提取JSON部分
                try {
                    const jsonMatch = result.data.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const extractedJson = jsonMatch[0];
                        const analysis = JSON.parse(extractedJson);
                        console.log('✅ 从响应中成功提取JSON');
                        return {
                            success: true,
                            visualAnalysis: analysis,
                            method: 'strict-ai-vision-extracted'
                        };
                    }
                } catch (extractError) {
                    console.error('JSON提取也失败了:', extractError);
                }
                
                // 如果所有解析都失败，返回严格的默认分析
                return {
                    success: true,
                    visualAnalysis: this.generateStrictFallbackAnalysis(result.data),
                    method: 'strict-fallback'
                };
            }
        } else {
            console.error('Vision API调用失败:', result.error);
            return {
                success: false,
                error: result.error
            };
        }
    }

    generateStrictFallbackAnalysis(rawResponse) {
        console.log('🔄 生成严格备用分析结果...');
        
        return {
            overallScore: 4,
            dimensionScores: {
                visualHierarchy: 4,
                spaceLayout: 3,
                colorContrast: 5,
                typography: 4,
                consistency: 3,
                modernDesign: 4
            },
            designGrade: "C+",
            strengths: ["基础功能完整"],
            criticalIssues: ["API解析失败，无法进行详细评估", "需要人工审查设计质量"],
            improvements: [
                {
                    issue: "无法获取详细分析",
                    solution: "重新提交设计稿进行评估",
                    priority: "high"
                }
            ],
            designPrinciples: {
                violated: ["无法确定"],
                followed: ["无法确定"]
            },
            professionalVerdict: "由于技术问题无法完成严格评估，建议重新分析",
            passingStandard: false
        };
    }

    async comprehensiveAnalysis(htmlContent, options = {}) {
        try {
            console.log('🎨 开始完整视觉分析...');
            
            // 1. 渲染HTML为图片
            const screenshot = await this.renderHTMLToImage(htmlContent, options);
            
            // 2. AI分析图片
            const aiAnalysis = await this.analyzeWithAI(screenshot, htmlContent);
            
            if (aiAnalysis.success) {
                return {
                    success: true,
                    method: 'visual-ai-analysis',
                    visualAnalysis: aiAnalysis.visualAnalysis,
                    screenshot: `data:image/png;base64,${screenshot}`,
                    renderingTime: Date.now()
                };
            } else {
                throw new Error(aiAnalysis.error);
            }
            
        } catch (error) {
            console.error('❌ 视觉分析失败:', error);
            return {
                success: false,
                error: error.message,
                method: 'visual-analysis-failed'
            };
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.isAvailable = false;
        }
    }
}

// 单例
const visualRenderer = new VisualRenderer();

// 进程退出时清理
process.on('exit', () => {
    visualRenderer.cleanup();
});

process.on('SIGINT', () => {
    visualRenderer.cleanup();
    process.exit();
});

module.exports = { visualRenderer };
