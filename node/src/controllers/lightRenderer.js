const fs = require('fs').promises;
const path = require('path');

class LightRenderer {
    constructor() {
        this.isAvailable = true; // 轻量级方案始终可用
    }

    /**
     * 基于正则和规则的轻量级HTML渲染分析
     * 不需要真实浏览器，通过代码解析估算视觉效果
     */
    async renderHTMLAnalysis(htmlContent) {
        try {
            const analysis = {
                layout: this.analyzeLayout(htmlContent),
                colors: this.analyzeColors(htmlContent),
                typography: this.analyzeTypography(htmlContent),
                spacing: this.analyzeSpacing(htmlContent),
                components: this.analyzeComponents(htmlContent),
                designPrinciples: this.analyzeDesignPrinciples(htmlContent),
                userExperience: this.analyzeUserExperience(htmlContent),
                visualHierarchy: this.analyzeVisualHierarchy(htmlContent),
                modernDesign: this.analyzeModernDesign(htmlContent),
                visualScore: 0
            };

            // 计算更专业的视觉质量分数
            analysis.visualScore = this.calculateAdvancedVisualScore(analysis);

            return {
                success: true,
                method: 'lightweight',
                visualAnalysis: analysis,
                estimatedAppearance: this.generateProfessionalAppearanceDescription(analysis),
                designCritique: this.generateDesignCritique(analysis)
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    analyzeLayout(html) {
        return {
            hasGrid: /display\s*:\s*grid/i.test(html),
            hasFlex: /display\s*:\s*flex/i.test(html),
            hasFloat: /float\s*:/i.test(html),
            hasPosition: /position\s*:\s*(absolute|relative|fixed)/i.test(html),
            layoutMethod: this.detectPrimaryLayout(html),
            isResponsive: /@media/i.test(html),
            hasContainer: /max-width|container/i.test(html)
        };
    }

    analyzeColors(html) {
        const colorRegex = /#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|hsl\([^)]+\)|rgba\([^)]+\)|hsla\([^)]+\)/g;
        const colors = html.match(colorRegex) || [];
        
        return {
            colorCount: colors.length,
            hasColorScheme: /color-scheme|prefers-color-scheme/i.test(html),
            hasGradients: /gradient/i.test(html),
            dominantColors: this.extractDominantColors(colors),
            hasConsistentPalette: colors.length > 0 && colors.length < 20
        };
    }

    analyzeTypography(html) {
        return {
            fontFamilies: this.extractFontFamilies(html),
            hasFontSizes: /font-size/i.test(html),
            hasTypographyScale: this.detectTypographyScale(html),
            hasLineHeight: /line-height/i.test(html),
            hasLetterSpacing: /letter-spacing/i.test(html),
            readabilityScore: this.calculateReadability(html)
        };
    }

    analyzeSpacing(html) {
        return {
            hasMargins: /margin/i.test(html),
            hasPadding: /padding/i.test(html),
            hasConsistentSpacing: this.detectSpacingPattern(html),
            spacingMethod: this.detectSpacingMethod(html)
        };
    }

    analyzeComponents(html) {
        return {
            buttons: (html.match(/<button|btn/gi) || []).length,
            cards: (html.match(/card|component/gi) || []).length,
            navigation: /<nav|menu/i.test(html),
            forms: /<form|input|textarea/i.test(html),
            modals: /modal|dialog/i.test(html),
            animations: /@keyframes|animation|transition/i.test(html)
        };
    }

    analyzeDesignPrinciples(html) {
        return {
            contrast: this.evaluateContrast(html),
            alignment: this.evaluateAlignment(html),
            proximity: this.evaluateProximity(html),
            repetition: this.evaluateRepetition(html),
            balance: this.evaluateBalance(html),
            emphasis: this.evaluateEmphasis(html),
            unity: this.evaluateUnity(html)
        };
    }

    analyzeUserExperience(html) {
        return {
            accessibility: this.evaluateAccessibility(html),
            usability: this.evaluateUsability(html),
            interactivity: this.evaluateInteractivity(html),
            performance: this.evaluatePerformance(html),
            mobile_friendly: this.evaluateMobileFriendly(html)
        };
    }

    analyzeVisualHierarchy(html) {
        return {
            heading_structure: this.evaluateHeadingStructure(html),
            font_sizes: this.evaluateFontSizes(html),
            color_hierarchy: this.evaluateColorHierarchy(html),
            spacing_hierarchy: this.evaluateSpacingHierarchy(html),
            visual_weight: this.evaluateVisualWeight(html)
        };
    }

    analyzeModernDesign(html) {
        return {
            minimalism: this.evaluateMinimalism(html),
            flat_design: this.evaluateFlatDesign(html),
            material_design: this.evaluateMaterialDesign(html),
            contemporary_trends: this.evaluateContemporaryTrends(html),
            brand_consistency: this.evaluateBrandConsistency(html)
        };
    }

    detectPrimaryLayout(html) {
        if (/display\s*:\s*grid/i.test(html)) return 'grid';
        if (/display\s*:\s*flex/i.test(html)) return 'flexbox';
        if (/float\s*:/i.test(html)) return 'float';
        return 'default';
    }

    extractDominantColors(colors) {
        // 简化：返回前5个颜色
        return colors.slice(0, 5);
    }

    extractFontFamilies(html) {
        const fontRegex = /font-family\s*:\s*([^;}]+)/gi;
        const matches = html.match(fontRegex) || [];
        return matches.map(m => m.replace(/font-family\s*:\s*/i, '').trim());
    }

    detectTypographyScale(html) {
        const sizeRegex = /font-size\s*:\s*([^;}]+)/gi;
        const sizes = html.match(sizeRegex) || [];
        return sizes.length > 3; // 有多种字体大小认为有层次
    }

    detectSpacingPattern(html) {
        const spacingRegex = /(margin|padding)\s*:\s*([^;}]+)/gi;
        const spacings = html.match(spacingRegex) || [];
        // 简化检测：如果有spacing定义就认为有模式
        return spacings.length > 0;
    }

    detectSpacingMethod(html) {
        if (/rem|em/i.test(html)) return 'relative';
        if (/px/i.test(html)) return 'absolute';
        return 'mixed';
    }

    calculateReadability(html) {
        let score = 5; // 基础分
        if (/line-height/i.test(html)) score += 1;
        if (/letter-spacing/i.test(html)) score += 1;
        if (/font-size.*1\.[2-9]|font-size.*[2-9]/i.test(html)) score += 1;
        if (!/font-size.*1[0-2]px/i.test(html)) score += 1; // 避免过小字体
        return Math.min(score, 10);
    }

    calculateAdvancedVisualScore(analysis) {
        let score = 0;
        
        // 设计原则 (35%)
        const principlesAvg = Object.values(analysis.designPrinciples)
            .reduce((sum, principle) => sum + (principle.score || 5), 0) / 7;
        score += (principlesAvg / 10) * 35;
        
        // 用户体验 (25%)
        const uxScore = Object.values(analysis.userExperience)
            .reduce((sum, ux) => sum + (ux.score || 5), 0) / 5;
        score += (uxScore / 10) * 25;
        
        // 视觉层次 (20%)
        const hierarchyScore = Object.values(analysis.visualHierarchy)
            .reduce((sum, hier) => sum + (hier.score || 5), 0) / 5;
        score += (hierarchyScore / 10) * 20;
        
        // 现代设计 (20%)
        const modernScore = Object.values(analysis.modernDesign)
            .reduce((sum, modern) => sum + (modern.score || 5), 0) / 5;
        score += (modernScore / 10) * 20;
        
        return Math.round(score);
    }

    generateDesignCritique(analysis) {
        const critique = {
            strengths: [],
            weaknesses: [],
            recommendations: []
        };
        
        // 分析优势
        if (analysis.designPrinciples.contrast.score > 7) {
            critique.strengths.push('色彩对比度良好，文本可读性强');
        }
        if (analysis.modernDesign.minimalism.score > 7) {
            critique.strengths.push('设计简洁，符合极简主义原则');
        }
        if (analysis.layout.hasFlex || analysis.layout.hasGrid) {
            critique.strengths.push('使用现代布局技术，结构灵活');
        }
        
        // 分析弱点
        Object.values(analysis.designPrinciples).forEach((principle, index) => {
            if (principle.issues && principle.issues.length > 0) {
                critique.weaknesses.push(...principle.issues);
            }
        });
        
        // 生成建议
        if (analysis.visualScore < 70) {
            critique.recommendations.push('整体视觉质量需要提升，建议重新审视设计方案');
        }
        if (analysis.modernDesign.minimalism.score < 6) {
            critique.recommendations.push('减少视觉元素，采用更简洁的设计语言');
        }
        if (analysis.designPrinciples.contrast.score < 6) {
            critique.recommendations.push('增强色彩对比度，提高内容的可读性');
        }
        
        return critique;
    }

    generateProfessionalAppearanceDescription(analysis) {
        let description = "预估视觉效果：";
        
        // 布局描述
        if (analysis.layout.hasGrid) {
            description += "使用CSS Grid布局，结构化程度高；";
        } else if (analysis.layout.hasFlex) {
            description += "使用Flexbox布局，灵活性好；";
        }
        
        // 响应式描述
        if (analysis.layout.isResponsive) {
            description += "支持响应式设计；";
        }
        
        // 颜色描述
        if (analysis.colors.colorCount > 5) {
            description += "色彩丰富；";
        } else if (analysis.colors.colorCount > 0) {
            description += "配色简洁；";
        }
        
        // 排版描述
        if (analysis.typography.readabilityScore > 7) {
            description += "文字排版清晰易读；";
        }
        
        // 动画描述
        if (analysis.components.animations) {
            description += "包含动画效果，交互性强；";
        }
        
        return description || "基础样式设计";
    }

    // 生成CSS到视觉效果的映射
    async generateVisualPreview(htmlContent) {
        const analysis = await this.renderHTMLAnalysis(htmlContent);
        
        if (!analysis.success) {
            throw new Error('轻量级渲染分析失败');
        }
        
        // 生成基于分析的视觉描述
        const visualDescription = {
            layout: analysis.visualAnalysis.layout.layoutMethod,
            appearance: analysis.estimatedAppearance,
            score: analysis.visualAnalysis.visualScore,
            details: analysis.visualAnalysis
        };
        
        return visualDescription;
    }

    // 添加缺失的评估方法实现
    evaluateProximity(html) { 
        const hasGrouping = /section|article|div.*class/i.test(html);
        const hasSpacing = /margin|padding/i.test(html);
        
        let score = 5;
        if (hasGrouping) score += 2;
        if (hasSpacing) score += 2;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 6 ? ['相关元素距离过远，缺乏视觉组织'] : [] 
        }; 
    }
    
    evaluateRepetition(html) { 
        const hasConsistentClasses = /class="[^"]*"/g.test(html);
        const hasRepeatedStyles = (html.match(/color\s*:|font-/gi) || []).length > 2;
        
        let score = 5;
        if (hasConsistentClasses) score += 2;
        if (hasRepeatedStyles) score += 2;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 6 ? ['缺乏统一的设计模式'] : [] 
        }; 
    }
    
    evaluateBalance(html) { 
        const hasSymmetry = /center|justify|space-/i.test(html);
        const hasProportions = /width.*%|flex/i.test(html);
        
        let score = 5;
        if (hasSymmetry) score += 2;
        if (hasProportions) score += 2;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 6 ? ['布局缺乏平衡感'] : [] 
        }; 
    }
    
    evaluateEmphasis(html) { 
        const hasFontWeight = /font-weight|bold/i.test(html);
        const hasColorEmphasis = /color.*#|background.*#/i.test(html);
        
        let score = 5;
        if (hasFontWeight) score += 2;
        if (hasColorEmphasis) score += 2;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 6 ? ['缺乏视觉重点，层次不清'] : [] 
        }; 
    }
    
    evaluateUnity(html) { 
        const hasConsistentNaming = /class="[\w-]*"/g.test(html);
        const hasTheme = /color.*#|background/i.test(html);
        
        let score = 5;
        if (hasConsistentNaming) score += 2;
        if (hasTheme) score += 2;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 6 ? ['整体设计缺乏统一性'] : [] 
        }; 
    }
    
    evaluateAccessibility(html) { 
        const hasAlt = /alt\s*=/i.test(html);
        const hasAria = /aria-/i.test(html);
        const hasSemanticTags = /<(header|nav|main|section|article|footer)/i.test(html);
        
        let score = 3;
        if (hasAlt) score += 2;
        if (hasAria) score += 2;
        if (hasSemanticTags) score += 3;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 7 ? ['可访问性有待提升'] : [] 
        }; 
    }
    
    evaluateUsability(html) { 
        const hasNavigation = /<nav|<a.*href/i.test(html);
        const hasButtons = /<button|input.*type.*submit/i.test(html);
        const hasLabels = /<label|placeholder/i.test(html);
        
        let score = 4;
        if (hasNavigation) score += 2;
        if (hasButtons) score += 2;
        if (hasLabels) score += 2;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 6 ? ['用户交互体验需要改善'] : [] 
        }; 
    }
    
    evaluateInteractivity(html) { 
        const hasHover = /:hover/i.test(html);
        const hasTransitions = /transition/i.test(html);
        const hasJavaScript = /<script|addEventListener/i.test(html);
        
        let score = 3;
        if (hasHover) score += 2;
        if (hasTransitions) score += 3;
        if (hasJavaScript) score += 2;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 6 ? ['缺乏交互动画和反馈'] : [] 
        }; 
    }
    
    evaluatePerformance(html) { 
        const isLightweight = html.length < 10000;
        const hasOptimizedCSS = !/<style[\s\S]*?<\/style>[\s\S]*?<style/i.test(html);
        const hasMinimalExternal = (html.match(/href=|src=/gi) || []).length < 5;
        
        let score = 4;
        if (isLightweight) score += 2;
        if (hasOptimizedCSS) score += 2;
        if (hasMinimalExternal) score += 2;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 7 ? ['性能优化有待提升'] : [] 
        }; 
    }
    
    evaluateMobileFriendly(html) { 
        const hasViewport = /viewport/i.test(html);
        const hasMediaQueries = /@media/i.test(html);
        const hasFlexibleUnits = /(rem|em|%|vw|vh)/i.test(html);
        
        let score = 3;
        if (hasViewport) score += 3;
        if (hasMediaQueries) score += 2;
        if (hasFlexibleUnits) score += 2;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 7 ? ['移动端适配需要改进'] : [] 
        }; 
    }
    
    evaluateHeadingStructure(html) { 
        const hasH1 = /<h1/i.test(html);
        const hasMultipleHeadings = (html.match(/<h[1-6]/gi) || []).length > 1;
        const hasLogicalOrder = /<h1[\s\S]*?<h2/i.test(html);
        
        let score = 4;
        if (hasH1) score += 2;
        if (hasMultipleHeadings) score += 2;
        if (hasLogicalOrder) score += 2;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 6 ? ['标题层次结构不清晰'] : [] 
        }; 
    }
    
    evaluateFontSizes(html) { 
        const fontSizes = html.match(/font-size\s*:\s*[^;}]+/gi) || [];
        const hasVariety = fontSizes.length > 2;
        const hasHierarchy = /font-size.*[2-9]/.test(html);
        
        let score = 5;
        if (hasVariety) score += 2;
        if (hasHierarchy) score += 2;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 6 ? ['字体大小层次不够明确'] : [] 
        }; 
    }
    
    evaluateColorHierarchy(html) { 
        const colors = html.match(/#[0-9a-f]{3,6}|rgb\([^)]+\)/gi) || [];
        const hasHierarchy = colors.length > 1 && colors.length < 8;
        const hasContrast = /color.*#0|color.*#1|color.*#2/.test(html);
        
        let score = 5;
        if (hasHierarchy) score += 2;
        if (hasContrast) score += 2;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 6 ? ['色彩层次需要优化'] : [] 
        }; 
    }
    
    evaluateSpacingHierarchy(html) { 
        const spacings = html.match(/(margin|padding)\s*:\s*[^;}]+/gi) || [];
        const hasVariety = spacings.length > 2;
        const hasConsistency = /margin.*[12]|padding.*[12]/.test(html);
        
        let score = 5;
        if (hasVariety) score += 2;
        if (hasConsistency) score += 2;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 6 ? ['间距层次需要改进'] : [] 
        }; 
    }
    
    evaluateVisualWeight(html) { 
        const hasBold = /font-weight.*bold|font-weight.*[6-9]00/i.test(html);
        const hasSizes = /font-size.*[2-9]|width.*[5-9]0%/i.test(html);
        const hasColors = /background.*#|color.*#/.test(html);
        
        let score = 4;
        if (hasBold) score += 2;
        if (hasSizes) score += 2;
        if (hasColors) score += 2;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 6 ? ['视觉重量分布需要调整'] : [] 
        }; 
    }
    
    evaluateMaterialDesign(html) { 
        const hasElevation = /box-shadow|elevation/i.test(html);
        const hasRoundedCorners = /border-radius/i.test(html);
        const hasModernColors = /#[0-9a-f]{6}/i.test(html);
        
        let score = 4;
        if (hasElevation) score += 2;
        if (hasRoundedCorners) score += 2;
        if (hasModernColors) score += 2;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 6 ? ['Material Design元素不足'] : [] 
        }; 
    }
    
    evaluateContemporaryTrends(html) { 
        const hasModernLayout = /display\s*:\s*(grid|flex)/i.test(html);
        const hasCustomProps = /--[\w-]+\s*:/i.test(html);
        const hasModernFeatures = /:not\(|:nth-child|::before|::after/.test(html);
        
        let score = 4;
        if (hasModernLayout) score += 3;
        if (hasCustomProps) score += 2;
        if (hasModernFeatures) score += 1;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 6 ? ['缺乏现代设计趋势'] : [] 
        }; 
    }
    
    evaluateBrandConsistency(html) { 
        const hasConsistentColors = (html.match(/#[0-9a-f]{3,6}/gi) || []).length <= 5;
        const hasConsistentFonts = (html.match(/font-family/gi) || []).length <= 3;
        const hasTheme = /color.*#|background.*#/.test(html);
        
        let score = 5;
        if (hasConsistentColors) score += 2;
        if (hasConsistentFonts) score += 2;
        if (hasTheme) score += 1;
        
        return { 
            score: Math.min(score, 10), 
            issues: score < 6 ? ['品牌一致性有待加强'] : [] 
        }; 
    }
    
    evaluateContrast(html) {
        // 这只是通过正则表达式检查代码中的颜色定义
        const hasLightBackground = /background.*#f|background.*white|background.*#fff/i.test(html);
        const hasDarkText = /color.*#0|color.*#1|color.*#2|color.*#3|color.*black/i.test(html);
        
        // 并没有真正计算视觉对比度，只是基于代码推测
        let score = 5;
        if (hasLightBackground && hasDarkText) score += 2;
        
        return {
            score: Math.min(score, 10),
            issues: score < 7 ? ['对比度可能不足，影响可读性'] : []
        };
    }
}

// 单例
const lightRenderer = new LightRenderer();

module.exports = { lightRenderer };
