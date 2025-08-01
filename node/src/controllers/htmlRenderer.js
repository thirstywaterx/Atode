const fs = require('fs').promises;
const path = require('path');

class HTMLRenderer {
    constructor() {
        this.browser = null;
        this.tempDir = path.join(__dirname, '../../temp');
        this.isRenderingAvailable = false; // 禁用浏览器渲染
        this.ensureTempDir();
        console.log('🚀 HTML渲染器初始化 - 使用轻量级分析模式');
    }

    async ensureTempDir() {
        try {
            // 修复: fs.mkdir 不带回调，直接 await
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.error('创建临时目录失败:', error);
        }
    }

    // 移除浏览器相关方法，专注于轻量级分析
    async renderHTMLToImage(htmlContent, options = {}) {
        throw new Error('浏览器渲染已禁用，请使用轻量级分析');
    }

    async saveScreenshot(htmlContent, filename, options = {}) {
        throw new Error('截图功能已禁用，请使用轻量级分析');
    }

    async convertToBase64(htmlContent, options = {}) {
        throw new Error('Base64转换已禁用，请使用轻量级分析');
    }

    async cleanup() {
        try {
            // 只清理临时文件
            const files = await fs.readdir(this.tempDir);
            for (const file of files) {
                if (file.endsWith('.png') || file.endsWith('.jpg')) {
                    await fs.unlink(path.join(this.tempDir, file));
                }
            }
        } catch (error) {
            console.error('清理资源失败:', error);
        }
    }

    // 检查内容是否包含HTML代码
    containsHTMLCode(content) {
        // 更严格的HTML检测
        return /```html/i.test(content) || 
               /<\s*html/i.test(content) || 
               /<\s*!DOCTYPE\s+html/i.test(content) ||
               (/<\s*head/i.test(content) && /<\s*body/i.test(content));
    }

    // 提取HTML中的代码块
    extractHTMLCode(content) {
        // 优先提取```html代码块
        const htmlCodeRegex = /```html\s*([\s\S]*?)```/gi;
        const matches = content.match(htmlCodeRegex);
        
        if (matches && matches.length > 0) {
            return matches[0].replace(/```html\s*/, '').replace(/```$/, '').trim();
        }
        
        // 如果没有代码块，检查是否是完整的HTML文档
        if (/<\s*html/i.test(content) || /<\s*!DOCTYPE/i.test(content)) {
            return content;
        }
        
        return null;
    }

    // 简化的HTML质量验证
    validateHTMLQuality(htmlContent) {
        const quality = {
            hasDoctype: /<!DOCTYPE\s+html/i.test(htmlContent),
            hasHtml: /<html/i.test(htmlContent),
            hasHead: /<head/i.test(htmlContent),
            hasBody: /<body/i.test(htmlContent),
            hasTitle: /<title/i.test(htmlContent),
            hasCSS: /<style/i.test(htmlContent) || /\.css/i.test(htmlContent),
            hasResponsive: /viewport/i.test(htmlContent),
            hasSemantic: /<(header|nav|main|section|article|aside|footer)/i.test(htmlContent),
            hasInteractivity: /<script/i.test(htmlContent) || /addEventListener/i.test(htmlContent),
            score: 0
        };

        const checks = Object.keys(quality).filter(key => key !== 'score');
        const passedChecks = checks.filter(key => quality[key]).length;
        quality.score = Math.round((passedChecks / checks.length) * 10);

        return quality;
    }

    analyzeHTMLCode(htmlContent) {
        const analysis = {
            structure: this.validateHTMLQuality(htmlContent),
            modernFeatures: {
                flexbox: /display\s*:\s*flex/i.test(htmlContent),
                grid: /display\s*:\s*grid/i.test(htmlContent),
                customProps: /--[\w-]+\s*:/i.test(htmlContent),
                transitions: /transition/i.test(htmlContent),
                animations: /@keyframes|animation/i.test(htmlContent),
                modernSelectors: /::(before|after)|:nth-child|:not\(/i.test(htmlContent),
                transformations: /transform|rotate|scale|translate/i.test(htmlContent)
            },
            accessibility: {
                altText: /alt\s*=/i.test(htmlContent),
                ariaLabels: /aria-/i.test(htmlContent),
                semanticHTML: /<(button|nav|main|section|article|header|footer)/i.test(htmlContent),
                focusManagement: /tabindex|focus/i.test(htmlContent),
                landmarks: /<(main|nav|aside|section)/i.test(htmlContent)
            },
            responsive: {
                mediaQueries: /@media/i.test(htmlContent),
                viewport: /viewport/i.test(htmlContent),
                flexibleUnits: /(rem|em|%|vw|vh)/i.test(htmlContent),
                containerQueries: /@container/i.test(htmlContent),
                fluidTypography: /clamp\(|min\(|max\(/i.test(htmlContent)
            },
            performance: {
                minimalCSS: htmlContent.length < 50000,
                externalResources: (htmlContent.match(/href=|src=/g) || []).length,
                inlineStyles: /<style/i.test(htmlContent),
                cssOptimization: /will-change|contain/i.test(htmlContent)
            },
            designPatterns: {
                colorScheme: /color-scheme|prefers-color-scheme/i.test(htmlContent),
                typography: /@font-face|font-display/i.test(htmlContent),
                layouts: /container|wrapper|layout/i.test(htmlContent),
                components: /component|module|card/i.test(htmlContent)
            }
        };

        // 计算各个维度的得分
        analysis.scores = {
            structure: this.calculateScore(analysis.structure),
            modernFeatures: this.calculateScore(analysis.modernFeatures),
            accessibility: this.calculateScore(analysis.accessibility),
            responsive: this.calculateScore(analysis.responsive),
            performance: this.calculateScore(analysis.performance),
            designPatterns: this.calculateScore(analysis.designPatterns)
        };

        // 计算总分
        const totalScore = Object.values(analysis.scores).reduce((sum, score) => sum + score, 0);
        analysis.overallScore = Math.round(totalScore / Object.keys(analysis.scores).length);

        return analysis;
    }

    calculateScore(category) {
        const items = Object.values(category).filter(v => typeof v === 'boolean');
        const passedItems = items.filter(Boolean).length;
        return Math.round((passedItems / items.length) * 10);
    }

    // 轻量级综合分析 - 只保留这一个方法
    async comprehensiveAnalysis(htmlContent, options = {}) {
        const result = {
            method: 'hybrid',
            staticAnalysis: null,
            lightweightRender: null,
            visualRender: null,
            renderingTime: null,
            success: false,
            error: null,
            recommendations: []
        };

        const startTime = Date.now();

        try {
            // 1. 静态代码分析
            console.log('🔍 开始静态代码分析...');
            result.staticAnalysis = this.analyzeHTMLCode(htmlContent);

            // 2. 轻量级视觉分析
            console.log('🎨 开始轻量级视觉分析...');
            try {
                const { lightRenderer } = require('./lightRenderer.js');
                const lightAnalysis = await lightRenderer.renderHTMLAnalysis(htmlContent);
                if (lightAnalysis.success) {
                    result.lightweightRender = lightAnalysis;
                }
            } catch (lightError) {
                console.warn('⚠️ 轻量级渲染器不可用:', lightError.message);
            }

            // 3. 真正的视觉分析（如果可用）
            try {
                const { visualRenderer } = require('./visualRenderer.js');
                if (visualRenderer && visualRenderer.isAvailable) {
                    console.log('🖼️ 开始AI视觉分析...');
                    const visualAnalysis = await visualRenderer.comprehensiveAnalysis(htmlContent, options);
                    if (visualAnalysis.success) {
                        result.visualRender = visualAnalysis;
                        result.method = 'full-visual';
                        console.log(`✅ AI视觉分析完成，整体评分: ${visualAnalysis.visualAnalysis.overallScore}/10`);
                    } else {
                        console.log('⚠️ AI视觉分析失败，使用轻量级分析');
                    }
                } else {
                    console.log('⚠️ 视觉渲染器不可用，使用轻量级分析');
                    result.method = 'lightweight-only';
                }
            } catch (visualError) {
                console.warn('⚠️ 视觉渲染器初始化失败:', visualError.message);
                result.method = 'lightweight-only';
            }

            result.renderingTime = Date.now() - startTime;
            result.success = true;
            result.recommendations = this.generateEnhancedRecommendations(result);

        } catch (error) {
            result.error = error.message;
            console.error('❌ HTML分析失败:', error);
        }

        return result;
    }

    // 生成增强的建议
    generateEnhancedRecommendations(analysisResult) {
        const recommendations = [];
        const staticAnalysis = analysisResult.staticAnalysis;
        const lightRender = analysisResult.lightweightRender;
        const visualRender = analysisResult.visualRender;

        // 基于静态分析的建议
        if (staticAnalysis) {
            if (staticAnalysis.scores.structure < 7) {
                recommendations.push('🏗️ 建议完善HTML结构，添加缺失的DOCTYPE、title等元素');
            }
            if (staticAnalysis.scores.accessibility < 7) {
                recommendations.push('♿ 建议改进可访问性，添加alt属性、ARIA标签、语义化标签等');
            }
            if (staticAnalysis.scores.responsive < 6) {
                recommendations.push('📱 建议添加响应式设计，使用媒体查询和灵活单位');
            }
        }

        // 基于AI视觉分析的专业建议
        if (visualRender && visualRender.success) {
            const visual = visualRender.visualAnalysis;
            
            if (visual.overallScore < 7) {
                recommendations.push('🎨 整体视觉质量需要提升，建议重新审视设计方案');
            }
            
            if (visual.weaknesses && visual.weaknesses.length > 0) {
                visual.weaknesses.forEach(weakness => {
                    recommendations.push(`⚠️ ${weakness}`);
                });
            }
            
            if (visual.improvements && visual.improvements.length > 0) {
                visual.improvements.forEach(improvement => {
                    recommendations.push(`💡 ${improvement}`);
                });
            }
        } else if (lightRender && lightRender.visualAnalysis) {
            // 基于轻量级分析的建议
            const visual = lightRender.visualAnalysis;
            if (visual.visualScore < 6) {
                recommendations.push('🎨 建议提升视觉设计质量，优化布局和配色');
            }
        }

        return recommendations;
    }
}

// 单例模式
const htmlRenderer = new HTMLRenderer();

// 进程退出时清理资源
process.on('exit', () => {
    htmlRenderer.cleanup();
});

process.on('SIGINT', () => {
    htmlRenderer.cleanup();
    process.exit();
});

module.exports = { htmlRenderer };
