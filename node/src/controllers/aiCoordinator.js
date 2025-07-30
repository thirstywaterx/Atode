const { getAIPrompt, getAIPromptStream } = require('./aihandel.js');
const { htmlRenderer } = require('./htmlRenderer.js');
const { visualRenderer } = require('./visualRenderer.js');

// 先定义所有AI工作者类

// 计划制定AI
class PlannerAI {
    getSystemPrompt() {
        return `你是AI协调系统的计划制定专家。

🚨 重要任务说明：
你的职责是分析用户需求并制定执行计划，绝对不能直接回答用户问题！

你必须严格按照JSON格式返回计划，不能包含任何其他内容。

输出格式要求：
- 只能输出JSON
- 不能有任何解释性文字
- 不能直接回答用户问题
- 不能生成最终内容`;
    }

    async createPlan(prompt, history, signal) {
        // 构建包含系统提示词的完整提示
        const systemPrompt = this.getSystemPrompt();
        
        // 预先判断任务类型，强制AI只生成我们支持的类型
        const lowerPrompt = prompt.toLowerCase();
        const isCodeRequest = /写|生成|创建|制作.*?(网页|网站|页面|代码|html|css|js|程序|应用|主页|界面|布局|系统)/.test(lowerPrompt) ||
                             /开发|设计|实现.*?(页面|网站|网页|应用|系统)/.test(lowerPrompt);
        const isWritingRequest = /写.*?(小说|故事|文章|散文|诗歌|剧本|日记|传记|报告|论文|说明|介绍|分析|评论|总结)/.test(lowerPrompt) ||
                                /创作.*?(小说|故事|文章|散文|诗歌|剧本)/.test(lowerPrompt);
        const noCodeRequest = /不要.*代码|不写.*代码|不需要.*代码|只要.*文字|只需要.*文字|纯文字/.test(lowerPrompt);
        
        let expectedTaskType;
        if (isWritingRequest || noCodeRequest) {
            expectedTaskType = "writing";
        } else if (isCodeRequest) {
            expectedTaskType = "code";
        } else {
            expectedTaskType = "code"; // 默认为代码任务，因为"个人主页"通常需要代码
        }

        const planPrompt = `${systemPrompt}

用户需求: "${prompt}"

⚠️ 重要指令：
1. 你只能返回JSON格式的执行计划
2. 绝对不能直接回答用户问题
3. 不能生成任何最终内容
4. 不能包含解释性文字
5. 任务类型只能是 "code" 或 "writing"，不能使用其他类型

根据需求分析，这个任务应该是：${expectedTaskType} 类型

请分析需求并返回执行计划：

{
    "userRequest": "用户需求理解",
    "tasks": [
        {
            "id": "main_task",
            "type": "${expectedTaskType}",
            "description": "具体任务描述",
            "deliverable": "最终交付物",
            "priority": 1
        }
    ],
    "complexity": "medium"
}

只返回上述JSON格式，任务类型必须是 "${expectedTaskType}"，不要任何其他内容：`;

        console.log('📤 发送给计划AI的提示词预览:', planPrompt.substring(0, 200) + '...');
        
        // 使用包含系统提示词的完整提示调用AI，传入空的history以确保专注于计划制定
        const result = await getAIPrompt(planPrompt, [], signal);
        
        console.log('📥 计划AI返回的原始数据预览:', result.data?.substring(0, 200) + '...');
        
        if (result.success) {
            try {
                // 更严格的JSON提取
                let jsonText = result.data.trim();
                
                console.log('🔍 原始响应长度:', jsonText.length);
                
                // 如果响应明显不是JSON（包含太多文字），直接使用默认计划
                if (jsonText.length > 2000 || /好的|这是|可以|如下|以下是/.test(jsonText.substring(0, 50))) {
                    console.warn('⚠️ 检测到AI返回了文字回答而非JSON，使用默认计划');
                    return this.getEnhancedDefaultPlan(prompt);
                }
                
                // 移除可能的markdown代码块标记
                jsonText = jsonText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
                jsonText = jsonText.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
                
                // 查找JSON对象
                const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    jsonText = jsonMatch[0];
                    console.log('🔍 提取的JSON长度:', jsonText.length);
                } else {
                    console.warn('⚠️ 无法在响应中找到JSON对象');
                    return this.getEnhancedDefaultPlan(prompt);
                }
                
                const parsed = JSON.parse(jsonText);
                
                // 验证并修正任务类型
                if (parsed.tasks && Array.isArray(parsed.tasks)) {
                    parsed.tasks.forEach(task => {
                        if (task.type !== 'code' && task.type !== 'writing') {
                            console.warn(`⚠️ 修正无效任务类型: ${task.type} -> ${expectedTaskType}`);
                            task.type = expectedTaskType;
                        }
                    });
                }
                
                // 验证是否是有效的计划
                if (!parsed.tasks || parsed.tasks.length === 0) {
                    console.warn('⚠️ 计划AI返回的计划无效，使用增强默认计划');
                    return this.getEnhancedDefaultPlan(prompt);
                }
                
                console.log('✅ 计划AI成功生成执行计划');
                return parsed;
            } catch (e) {
                console.error('❌ 计划解析失败:', e);
                console.error('🔍 导致解析失败的数据:', result.data?.substring(0, 500) + '...');
                console.log('🔄 使用增强默认计划');
                return this.getEnhancedDefaultPlan(prompt);
            }
        }
        
        console.error('❌ 计划AI调用失败:', result.error);
        return this.getEnhancedDefaultPlan(prompt);
    }

    /**
     * 新增：增强默认计划
     */
    getEnhancedDefaultPlan(prompt) {
        const lowerPrompt = prompt.toLowerCase();
        
        // 更精确的需求分析
        const isWritingRequest = /写.*?(小说|故事|文章|散文|诗歌|剧本|日记|传记|报告|论文|说明|介绍|分析|评论|总结)/.test(lowerPrompt) ||
                                /创作.*?(小说|故事|文章|散文|诗歌|剧本)/.test(lowerPrompt) ||
                                /^(小说|故事|文章|散文|诗歌|剧本|日记|传记|报告|论文|说明|介绍|分析|评论|总结)/.test(lowerPrompt);
        
        const isCodeRequest = /写|生成|创建|制作.*?(网页|网站|页面|代码|html|css|js|程序|应用|主页|界面|布局|系统)/.test(lowerPrompt) ||
                             /开发|设计|实现.*?(页面|网站|网页|应用|系统)/.test(lowerPrompt);
        
        const noCodeKeywords = ['不要.*代码', '不写.*代码', '不需要.*代码', '只要.*文字', '只需要.*文字', '纯文字', '文字说明'];
        const isNoCodeRequest = noCodeKeywords.some(keyword => new RegExp(keyword).test(lowerPrompt));
        
        let finalType;
        if (isWritingRequest || isNoCodeRequest) {
            finalType = "writing";
            console.log('📝 识别为文字创作需求');
        } else if (isCodeRequest) {
            finalType = "code";
            console.log('💻 识别为代码开发需求');
        } else {
            finalType = "writing";
            console.log('💬 默认识别为文字创作需求');
        }
        
        // 根据类型提供增强的默认计划
        if (finalType === "writing") {
            return {
                userRequest: prompt,
                deepAnalysis: {
                    explicitNeeds: ["创作指定类型的文字内容"],
                    implicitNeeds: ["内容要有吸引力", "语言要流畅自然", "结构要清晰合理"],
                    potentialNeeds: ["考虑目标读者群体", "适合的传播渠道", "后续修改和优化"],
                    userScenarios: ["阅读欣赏", "分享传播", "学习参考"],
                    experienceGoals: ["引人入胜", "易于理解", "留下深刻印象"]
                },
                enhancedRequirements: ["增加情感共鸣元素", "优化语言表达", "完善内容结构"],
                complexity: "medium",
                tasks: [
                    {
                        id: "main_task",
                        type: "writing", // 确保类型正确
                        description: prompt + "（增强版：包含更丰富的细节、更生动的表达、更完整的结构）",
                        deliverable: "高质量原创文字内容",
                        priority: 1,
                        enhancedFeatures: ["生动的细节描写", "流畅的语言表达", "清晰的逻辑结构", "情感共鸣点"]
                    }
                ],
                strategy: "通过深度创作超越用户期望，提供具有感染力和传播价值的优质内容",
                qualityStandards: ["内容原创性100%", "语言表达优美流畅", "结构逻辑清晰", "情感真挚感人"],
                successMetrics: ["读者满意度", "内容完整度", "语言质量", "创新性"]
            };
        } else {
            return {
                userRequest: prompt,
                deepAnalysis: {
                    explicitNeeds: ["实现指定的功能需求"],
                    implicitNeeds: ["界面美观易用", "性能稳定流畅", "兼容性良好"],
                    potentialNeeds: ["移动端适配", "无障碍访问", "SEO优化", "未来扩展性"],
                    userScenarios: ["不同设备访问", "不同网络环境", "不同用户群体"],
                    experienceGoals: ["快速加载", "直观操作", "稳定运行"]
                },
                enhancedRequirements: ["响应式设计", "性能优化", "用户体验增强", "代码规范化"],
                complexity: "medium",
                tasks: [
                    {
                        id: "main_task",
                        type: "code", // 确保类型正确
                        description: prompt + "（增强版：包含响应式设计、性能优化、无障碍访问等现代化特性）",
                        deliverable: "完整可运行的现代化代码",
                        priority: 1,
                        enhancedFeatures: ["响应式布局", "性能优化", "无障碍访问", "代码注释", "错误处理"]
                    }
                ],
                strategy: "采用现代化前端技术，确保代码质量和用户体验达到行业标准",
                qualityStandards: ["代码规范化", "性能优秀", "兼容性好", "可维护性强"],
                successMetrics: ["功能完整度", "性能指标", "用户体验", "代码质量"]
            };
        }
    }
}

// 思路规划AI
class StrategistAI {
    getSystemPrompt() {
        return `你是专业的实现思路专家，负责为不同类型的任务制定详细的实现方案。

核心能力：
1. 为代码项目制定技术架构和开发策略
2. 为文字创作制定写作框架和创作策略
3. 识别关键技术点和最佳实践
4. 预见潜在问题并提供解决方案

你必须根据任务类型制定相应的专业策略，不能混淆代码开发和文字创作的方法论。`;
    }

    async createStrategy(prompt, plan, history, signal) {
        const isCodeProject = plan.tasks.some(task => task.type === 'code');
        
        const systemPrompt = this.getSystemPrompt();
        const strategyPrompt = `${systemPrompt}

用户需求: "${prompt}"
执行计划: ${JSON.stringify(plan, null, 2)}

任务类型: ${isCodeProject ? '代码开发项目' : '文字创作项目'}

请制定详细的实现思路，${isCodeProject ? '重点关注技术实现' : '重点关注内容创作'}：

${isCodeProject ? `
代码项目要求：
1. 技术选择和架构设计
2. 具体开发步骤
3. 关键技术点和最佳实践
4. 性能和兼容性考虑
` : `
文字创作要求：
1. 内容结构和写作框架
2. 创作步骤和方法
3. 文体特点和表现手法
4. 质量标准和评判要求
`}

返回JSON格式：
{
    "overview": "整体实现思路概述",
    "architecture": "${isCodeProject ? '技术架构设计' : '内容结构设计'}",
    "implementation": {
        "steps": ["步骤1", "步骤2", "步骤3"],
        "keyPoints": ["关键点1", "关键点2"],
        "bestPractices": ["最佳实践1", "最佳实践2"]
    },
    "technologies": {
        "primary": ["${isCodeProject ? 'HTML5, CSS3, JavaScript' : '叙事技巧, 文字表达, 情节构建'}"],
        "secondary": ["${isCodeProject ? 'CSS Grid, Flexbox' : '人物塑造, 环境描写, 情感渲染'}"],
        "advanced": ["${isCodeProject ? '响应式设计, 交互优化' : '文学手法, 修辞技巧, 深度思考'}"]
    },
    "qualityStandards": {
        "primary": "${isCodeProject ? '功能完整性' : '内容原创性'}",
        "secondary": "${isCodeProject ? '用户体验' : '语言流畅性'}",
        "advanced": "${isCodeProject ? '代码质量' : '思想深度'}"
    },
    "potential_issues": ["可能问题1", "可能问题2"],
    "solutions": ["解决方案1", "解决方案2"]
}

只返回JSON格式：`;

        const result = await getAIPrompt(strategyPrompt, [], signal);
        if (result.success) {
            try {
                return JSON.parse(result.data);
            } catch (e) {
                console.log('思路解析失败，使用默认思路');
                return this.getDefaultStrategy(prompt, plan);
            }
        }
        return this.getDefaultStrategy(prompt, plan);
    }

    getDefaultStrategy(prompt, plan) {
        const isCodeProject = plan.tasks.some(task => task.type === 'code');
        
        if (isCodeProject) {
            return {
                overview: "基于现代前端技术实现用户需求",
                architecture: "响应式网页架构，注重性能和用户体验",
                implementation: {
                    steps: ["需求分析", "界面设计", "功能实现", "测试优化"],
                    keyPoints: ["用户界面", "交互逻辑", "性能优化"],
                    bestPractices: ["语义化HTML", "模块化CSS", "渐进增强"]
                },
                technologies: {
                    primary: ["HTML5", "CSS3", "JavaScript"],
                    secondary: ["CSS Grid", "Flexbox", "ES6+"],
                    advanced: ["响应式设计", "性能优化", "无障碍访问"]
                },
                qualityStandards: {
                    primary: "功能完整，界面美观",
                    secondary: "兼容性良好，加载快速",
                    advanced: "代码规范，可维护性强"
                },
                potential_issues: ["浏览器兼容性", "性能瓶颈"],
                solutions: ["渐进增强", "代码优化", "资源压缩"]
            };
        } else {
            return {
                overview: "采用专业写作方法创作高质量文字内容",
                architecture: "结构化内容组织，注重逻辑性和可读性",
                implementation: {
                    steps: ["主题确定", "大纲构思", "内容创作", "修改完善"],
                    keyPoints: ["主题明确", "结构清晰", "语言生动"],
                    bestPractices: ["开头吸引", "情节紧凑", "结尾有力"]
                },
                technologies: {
                    primary: ["叙事技巧", "文字表达", "情节构建"],
                    secondary: ["人物塑造", "环境描写", "情感渲染"],
                    advanced: ["文学手法", "修辞技巧", "深度思考"]
                },
                qualityStandards: {
                    primary: "内容原创，主题鲜明",
                    secondary: "语言流畅，逻辑清晰",
                    advanced: "情感真挚，思想深刻"
                },
                potential_issues: ["情节单调", "人物扁平"],
                solutions: ["增加转折", "深化人物", "丰富细节"]
            };
        }
    }
}

// 代码生成专家AI
class CodeGeneratorAI {
    getSystemPrompt() {
        return `你是资深的前端开发工程师，专精于现代Web技术。你只处理代码开发任务，绝不参与文字创作工作。`;
    }

    async process(task, originalPrompt, strategy, signal) {
        // 移除严格的类型检查，允许处理更多任务
        console.log('🚀 代码AI开始生成代码');
        const systemPrompt = this.getSystemPrompt();
        const codePrompt = `${systemPrompt}

用户原始需求: "${originalPrompt}"
具体任务: "${task.description}"
实现策略: ${JSON.stringify(strategy, null, 2)}

要求：
1. 生成完整的HTML、CSS和JavaScript代码
2. 采用现代前端开发最佳实践
3. 确保代码的可读性和可维护性
4. 包含必要的注释和说明
5. 实现响应式设计，支持移动端

请生成高质量的前端代码：`;

        const result = await getAIPrompt(codePrompt, [], signal);
        return {
            taskId: task.id,
            type: 'code',
            content: result.success ? result.data : '代码生成失败',
            success: result.success
        };
    }
}

// 内容创作专家AI
class WriterAI {
    getSystemPrompt() {
        return `你是专业的文字创作专家，擅长各种体裁的内容创作。你专注于文字内容创作，绝不生成任何代码。`;
    }

    async process(task, originalPrompt, strategy, signal) {
        // 移除严格的类型检查，允许处理更多任务
        console.log('✍️ 写作AI开始创作内容');
        
        const systemPrompt = this.getSystemPrompt();
        const writePrompt = `${systemPrompt}

用户原始需求: "${originalPrompt}"
具体任务: "${task.description}"
创作策略: ${JSON.stringify(strategy, null, 2)}

要求：
1. 内容必须原创且具有吸引力
2. 语言表达要流畅自然
3. 结构要清晰合理
4. 适合目标读者群体
5. 体现情感共鸣和深度思考

请基于以上需求创作高质量的内容：`;

        const result = await getAIPrompt(writePrompt, [], signal);
        return {
            taskId: task.id,
            type: 'writing',
            content: result.success ? result.data : '内容创作失败',
            success: result.success
        };
    }
}

// 审查专家AI
class ReviewerAI {
    getSystemPrompt() {
        return `你是业界顶级的质量控制专家，拥有严格的评判标准和丰富的审查经验。

**严格评分标准：**
- 9-10分：卓越品质，可直接商用
- 7-8分：良好品质，需要微调
- 5-6分：一般品质，需要改进
- 3-4分：较差品质，需要重做
- 1-2分：极差品质，完全重做

**评分低于7分时必须打回重做！**`;
    }

    async reviewAllResults(taskResults, originalPrompt, strategy, signal, maxRetries = 2, currentAttempt = 1) {
        const allContent = Object.values(taskResults)
            .map(result => `=== 任务${result.taskId}(${result.type}) ===\n${result.content}`)
            .join('\n\n');

        // 检查是否包含HTML代码，如果是则进行视觉审查
        const hasHtmlContent = Object.values(taskResults).some(result => 
            result.type === 'code' && result.success && 
            /<!DOCTYPE|<html|<head|<body/i.test(result.content)
        );

        let visualAnalysis = null;
        if (hasHtmlContent) {
            console.log('🎨 检测到HTML内容，启动视觉质量分析...');
            try {
                // 提取HTML内容
                const htmlResults = Object.values(taskResults).filter(result => 
                    result.type === 'code' && result.success && 
                    /<!DOCTYPE|<html|<head|<body/i.test(result.content)
                );
                
                if (htmlResults.length > 0) {
                    const htmlContent = htmlResults[0].content;
                    
                    // 使用视觉分析器进行严格的视觉质量评估
                    if (visualRenderer && visualRenderer.isAvailable) {
                        console.log('🔍 使用高级视觉渲染器进行严格分析...');
                        const visualResult = await visualRenderer.comprehensiveAnalysis(htmlContent);
                        
                        if (visualResult.success) {
                            visualAnalysis = visualResult.visualAnalysis;
                            console.log('✅ 视觉分析完成，评分:', visualAnalysis.overallScore);
                        }
                    }
                }
            } catch (error) {
                console.error('视觉分析过程出错:', error);
            }
        }

        const systemPrompt = this.getSystemPrompt();
        const reviewPrompt = `${systemPrompt}

**审查轮次：${currentAttempt}/${maxRetries + 1}**

用户原始需求: "${originalPrompt}"
实现策略: ${JSON.stringify(strategy, null, 2)}

生成内容:
${allContent}

${visualAnalysis ? `

视觉质量分析结果:
${JSON.stringify(visualAnalysis, null, 2)}

请将视觉分析结果纳入总体评价中。
` : ''}

**严格质量审查要求：**
1. 功能完整性评估（0-10分）
2. 内容质量和专业度（0-10分）
3. 技术实现正确性（0-10分，如适用）
4. 用户体验和可用性（0-10分）
5. 创新性和完整性（0-10分）
${visualAnalysis ? '6. 视觉设计质量（0-10分，基于视觉分析结果）' : ''}

**关键要求：**
- 综合评分低于7分必须打回重做
- 必须提供具体、可执行的改进建议
- 评分标准要严格，不能过于宽松

返回JSON格式：
{
    "overallScore": 数字评分(0-10),
    "dimensionScores": {
        "functionality": 0-10,
        "quality": 0-10,
        "technical": 0-10,
        "usability": 0-10,
        "innovation": 0-10
        ${visualAnalysis ? ',"visual": 0-10' : ''}
    },
    "passStandard": true/false,
    "approved": true/false,
    "issues": ["具体问题1", "具体问题2"],
    "suggestions": [
        {
            "issue": "具体问题描述",
            "solution": "详细解决方案",
            "priority": "high/medium/low"
        }
    ],
    "professionalFeedback": "专业评价反馈",
    "needsRework": true/false,
    "reworkInstructions": "如果需要重做，提供具体指导"
}

只返回JSON：`;

        const result = await getAIPrompt(reviewPrompt, [], signal);
        const reviewResult = this.parseReviewResult(result);
        
        // 将视觉分析结果附加到审查结果中
        if (visualAnalysis) {
            reviewResult.visualQuality = visualAnalysis;
            // 如果视觉分析评分很低，强制降低总评分
            if (visualAnalysis.overallScore < 6) {
                reviewResult.overallScore = Math.min(reviewResult.overallScore, 6);
                reviewResult.approved = false;
                reviewResult.needsRework = true;
                reviewResult.issues.push('视觉设计质量不达标');
                reviewResult.suggestions.push({
                    issue: '视觉设计需要重新设计',
                    solution: '参考视觉分析建议进行重新设计',
                    priority: 'high'
                });
            }
        }
        
        // 严格执行评分标准
        if (reviewResult.overallScore < 7) {
            console.log(`❌ 质量审查未通过 - 评分: ${reviewResult.overallScore}/10 (第${currentAttempt}次尝试)`);
            reviewResult.approved = false;
            reviewResult.passStandard = false;
            reviewResult.needsRework = true;
            
            if (!reviewResult.reworkInstructions) {
                reviewResult.reworkInstructions = '根据以下建议进行重新制作，确保质量达到7分以上标准';
            }
        } else {
            console.log(`✅ 质量审查通过 - 评分: ${reviewResult.overallScore}/10`);
            reviewResult.approved = true;
            reviewResult.passStandard = true;
            reviewResult.needsRework = false;
        }
        
        return reviewResult;
    }

    parseReviewResult(result) {
        if (result.success) {
            try {
                let jsonText = result.data.trim();
                jsonText = jsonText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
                jsonText = jsonText.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
                
                const parsed = JSON.parse(jsonText);
                
                // 确保所有必要字段存在
                if (!parsed.overallScore) parsed.overallScore = 5;
                if (!parsed.hasOwnProperty('approved')) parsed.approved = parsed.overallScore >= 7;
                if (!parsed.passStandard) parsed.passStandard = parsed.approved;
                if (!parsed.issues) parsed.issues = [];
                if (!parsed.suggestions) parsed.suggestions = [];
                if (!parsed.needsRework) parsed.needsRework = parsed.overallScore < 7;
                if (!parsed.dimensionScores) {
                    parsed.dimensionScores = {
                        functionality: Math.max(1, parsed.overallScore - 1),
                        quality: parsed.overallScore,
                        technical: parsed.overallScore,
                        usability: Math.min(10, parsed.overallScore + 1),
                        innovation: parsed.overallScore
                    };
                }
                
                return parsed;
            } catch (e) {
                console.error('❌ 审查结果解析失败:', e);
                return this.getStrictDefaultReview();
            }
        }
        
        return this.getStrictDefaultReview();
    }

    getStrictDefaultReview() {
        return {
            overallScore: 5,
            dimensionScores: {
                functionality: 5,
                quality: 5,
                technical: 5,
                usability: 5,
                innovation: 5
            },
            passStandard: false,
            approved: false,
            needsRework: true,
            issues: ["无法正确评估质量", "需要重新生成内容"],
            suggestions: [
                {
                    issue: "内容质量无法确定",
                    solution: "重新生成并确保内容质量达标",
                    priority: "high"
                }
            ],
            professionalFeedback: "审查系统异常，建议重新生成内容",
            reworkInstructions: "请重新生成内容，确保满足用户需求并达到专业标准"
        };
    }
}

// 整合专家AI
class IntegratorAI {
    getSystemPrompt() {
        return `你是最终交付专家，负责整合各专业AI的输出成为完美的最终结果。

核心职责：
1. 整合多个专业AI的输出
2. 确保内容的一致性和完整性
3. 优化用户体验和呈现效果
4. 提供超越用户期望的最终交付

你必须确保最终结果是高质量的、完整的、可直接使用的内容。`;
    }

    async integrateResults(taskResults, reviewResults, originalPrompt, plan, strategy) {
        const allContent = Object.values(taskResults)
            .map(result => `=== 任务${result.taskId}(${result.type}) ===\n${result.content}`)
            .join('\n\n');

        const systemPrompt = this.getSystemPrompt();
        const integrationPrompt = `${systemPrompt}

用户原始需求: "${originalPrompt}"
执行计划: ${JSON.stringify(plan, null, 2)}
实现策略: ${JSON.stringify(strategy, null, 2)}
审查结果: ${JSON.stringify(reviewResults, null, 2)}

各专家AI的输出:
${allContent}

要求：
1. 整合所有专业AI的最佳输出
2. 确保最终结果完整且可直接使用
3. 保持内容的专业性和高质量
4. 优化用户体验和呈现效果

请整合成最终的完整内容：`;

        const result = await getAIPrompt(integrationPrompt);

        if (!result.success) {
            // 智能选择最佳结果
            const codeResults = Object.values(taskResults).filter(r => r.type === 'code' && r.success);
            const writingResults = Object.values(taskResults).filter(r => r.type === 'writing' && r.success);

            if (codeResults.length > 0) {
                return codeResults[0].content;
            } else if (writingResults.length > 0) {
                return writingResults[0].content;
            } else {
                return '抱歉，无法生成满足要求的内容，请重新尝试。';
            }
        }

        return result.data;
    }

    async integrateResultsStream(taskResults, reviewResults, originalPrompt, plan, strategy, streamCallback, signal) {
        const allContent = Object.values(taskResults)
            .map(result => `=== 任务${result.taskId}(${result.type}) ===\n${result.content}`)
            .join('\n\n');

        const systemPrompt = this.getSystemPrompt();
        const integrationPrompt = `${systemPrompt}

用户原始需求: "${originalPrompt}"
执行计划: ${JSON.stringify(plan, null, 2)}
实现策略: ${JSON.stringify(strategy, null, 2)}
审查结果: ${JSON.stringify(reviewResults, null, 2)}

各专家AI的输出:
${allContent}

要求：
1. 整合所有专业AI的最佳输出
2. 确保最终结果完整且可直接使用
3. 保持内容的专业性和高质量
4. 优化用户体验和呈现效果

请整合成最终的完整内容：`;

        const result = await getAIPromptStream(integrationPrompt, [], streamCallback, signal);
        
        if (!result.success) {
            // 智能选择最佳结果作为fallback
            const codeResults = Object.values(taskResults).filter(r => r.type === 'code' && r.success);
            const writingResults = Object.values(taskResults).filter(r => r.type === 'writing' && r.success);

            let fallbackContent = '';
            if (codeResults.length > 0) {
                fallbackContent = codeResults[0].content;
            } else if (writingResults.length > 0) {
                fallbackContent = writingResults[0].content;
            } else {
                fallbackContent = '抱歉，无法生成满足要求的内容，请重新尝试。';
            }
            
            // 通过streamCallback发送fallback内容
            if (streamCallback) {
                streamCallback({ content: fallbackContent, fullContent: fallbackContent });
            }
            
            return fallbackContent;
        }

        return result.data;
    }
}

// 视觉分析专家AI
class VisualAnalyzerAI {
    getSystemPrompt() {
        return `你是世界顶级的UI/UX设计专家和视觉分析师，拥有Apple、Google等顶级公司的设计经验。

核心职责：
1. 分析网页的视觉设计质量
2. 评估用户界面的专业程度
3. 提供具体的改进建议
4. 按照业界最高标准进行严格评分

你的评分标准极其严格，只有达到商业级别的设计才能获得高分。`;
    }

    async analyzeVisualQuality(htmlContent, originalPrompt) {
        if (!visualRenderer || !visualRenderer.isAvailable) {
            console.warn('⚠️ 视觉渲染器不可用，跳过视觉分析');
            return {
                success: false,
                error: '视觉分析服务不可用'
            };
        }

        try {
            console.log('🎨 开始严格的视觉质量分析...');
            const analysisResult = await visualRenderer.comprehensiveAnalysis(htmlContent);
            
            if (analysisResult.success) {
                console.log('✅ 视觉分析完成');
                return {
                    success: true,
                    analysis: analysisResult.visualAnalysis,
                    screenshot: analysisResult.screenshot,
                    method: analysisResult.method
                };
            } else {
                console.error('❌ 视觉分析失败:', analysisResult.error);
                return {
                    success: false,
                    error: analysisResult.error
                };
            }
        } catch (error) {
            console.error('❌ 视觉分析过程出错:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

/**
 * AI协调器 - 负责任务分配和结果整合
 */
class AICoordinator {
    constructor() {
        this.aiWorkers = {
            planner: new PlannerAI(),
            strategist: new StrategistAI(),
            coder: new CodeGeneratorAI(),
            reviewer: new ReviewerAI(),
            writer: new WriterAI(),
            integrator: new IntegratorAI(),
            visualAnalyzer: new VisualAnalyzerAI()
        };
        this.maxRetries = 2; // 最多重试2次
    }

    /**
     * 主入口 - 处理用户请求（带质量控制循环）
     */
    async processUserRequest(prompt, history = []) {
        try {
            console.log('=== 开始多AI协调处理 ===');
            
            // 第1步：主协调AI制定执行计划
            console.log('步骤1: 制定执行计划');
            const plan = await this.aiWorkers.planner.createPlan(prompt, history);
            console.log('执行计划:', plan);

            // 第2步：思路AI制定详细实现思路
            console.log('步骤2: 制定详细实现思路');
            let strategy = await this.aiWorkers.strategist.createStrategy(prompt, plan, history);
            console.log('实现思路:', strategy);

            // 质量控制循环
            let taskResults, reviewResults, finalResult;
            let attempt = 1;
            
            while (attempt <= this.maxRetries + 1) {
                console.log(`\n🔄 第${attempt}次执行开始`);
                
                // 第3步：并行分配任务给不同的专业AI
                console.log(`步骤3.${attempt}: 分配任务给专业AI`);
                taskResults = await this.executeTasksInParallel(plan.tasks, prompt, strategy);
                console.log(`任务执行结果(第${attempt}次):`, taskResults);

                // 第4步：审查AI审查所有结果
                console.log(`步骤4.${attempt}: 审查所有结果`);
                reviewResults = await this.aiWorkers.reviewer.reviewAllResults(
                    taskResults, 
                    prompt, 
                    strategy, 
                    null, 
                    this.maxRetries, 
                    attempt
                );
                console.log(`审查结果(第${attempt}次):`, reviewResults);

                // 判断是否需要重做
                if (reviewResults.needsRework && attempt <= this.maxRetries) {
                    console.log(`❌ 第${attempt}次尝试未通过审查，评分: ${reviewResults.overallScore}/10`);
                    console.log('🔧 问题列表:', reviewResults.issues);
                    console.log('💡 改进建议:', reviewResults.suggestions);
                    console.log('📋 重做指导:', reviewResults.reworkInstructions);
                    
                    // 更新策略，加入改进建议
                    strategy = this.enhanceStrategyWithFeedback(strategy, reviewResults);
                    attempt++;
                    continue;
                } else {
                    if (reviewResults.approved) {
                        console.log(`✅ 第${attempt}次尝试通过审查，评分: ${reviewResults.overallScore}/10`);
                    } else {
                        console.log(`⚠️ 达到最大重试次数，使用当前结果，评分: ${reviewResults.overallScore}/10`);
                    }
                    break;
                }
            }

            // 第5步：整合AI整合最终结果
            console.log('步骤5: 整合最终结果');
            finalResult = await this.aiWorkers.integrator.integrateResults(
                taskResults, 
                reviewResults, 
                prompt, 
                plan,
                strategy
            );
            console.log('最终整合结果完成');

            return {
                success: true,
                data: finalResult,
                mode: 'multi-ai-coordinator-with-qa',
                process: {
                    plan: plan,
                    strategy: strategy,
                    taskResults: taskResults,
                    reviewResults: reviewResults,
                    attempts: attempt,
                    qualityScore: reviewResults.overallScore
                }
            };

        } catch (error) {
            console.error('多AI协调处理错误:', error);
            return {
                success: false,
                error: '多AI协调失败: ' + error.message
            };
        }
    }

    /**
     * 根据审查反馈增强策略
     */
    enhanceStrategyWithFeedback(originalStrategy, reviewResults) {
        const enhancedStrategy = { ...originalStrategy };
        
        // 添加质量改进要求
        enhancedStrategy.qualityRequirements = {
            previousScore: reviewResults.overallScore,
            targetScore: 8,
            criticalIssues: reviewResults.issues,
            improvementSuggestions: reviewResults.suggestions,
            reworkGuidance: reviewResults.reworkInstructions
        };
        
        // 更新实现步骤，加入改进要求
        if (enhancedStrategy.implementation) {
            enhancedStrategy.implementation.qualityFocus = reviewResults.suggestions.map(s => s.solution);
            enhancedStrategy.implementation.avoidIssues = reviewResults.issues;
        }
        
        console.log('🔧 策略已根据审查反馈增强');
        return enhancedStrategy;
    }

    /**
     * 流式处理用户请求（带质量控制）
     */
    async processUserRequestStream(prompt, history, streamCallback, stageCallback, signal) {
        try {
            if (signal?.aborted) throw new DOMException('请求已中止', 'AbortError');
            stageCallback({ type: 'coordination_progress', stage: 1, progress: 10, message: '制定执行计划...' });
            const plan = await this.aiWorkers.planner.createPlan(prompt, history, signal);

            if (signal?.aborted) throw new DOMException('请求已中止', 'AbortError');
            stageCallback({ type: 'coordination_progress', stage: 2, progress: 25, message: '制定实现思路...' });
            let strategy = await this.aiWorkers.strategist.createStrategy(prompt, plan, history, signal);

            // 质量控制循环
            let taskResults, reviewResults;
            let attempt = 1;
            let currentProgress = 50;
            
            while (attempt <= this.maxRetries + 1) {
                if (signal?.aborted) throw new DOMException('请求已中止', 'AbortError');
                
                const progressStep = Math.round(25 / (this.maxRetries + 1));
                stageCallback({ 
                    type: 'coordination_progress', 
                    stage: 3, 
                    progress: currentProgress, 
                    message: `执行任务 (第${attempt}次尝试)...` 
                });
                
                taskResults = await this.executeTasksInParallel(plan.tasks, prompt, strategy, signal);

                if (signal?.aborted) throw new DOMException('请求已中止', 'AbortError');
                
                stageCallback({ 
                    type: 'coordination_progress', 
                    stage: 4, 
                    progress: currentProgress + progressStep, 
                    message: `质量审查 (第${attempt}次)...` 
                });
                
                reviewResults = await this.aiWorkers.reviewer.reviewAllResults(
                    taskResults, prompt, strategy, signal, this.maxRetries, attempt
                );

                if (reviewResults.needsRework && attempt <= this.maxRetries) {
                    stageCallback({ 
                        type: 'coordination_progress', 
                        stage: 4, 
                        progress: currentProgress + progressStep, 
                        message: `质量未达标，准备重做 (评分: ${reviewResults.overallScore}/10)...` 
                    });
                    
                    strategy = this.enhanceStrategyWithFeedback(strategy, reviewResults);
                    attempt++;
                    currentProgress += progressStep;
                } else {
                    if (reviewResults.approved) {
                        stageCallback({ 
                            type: 'coordination_progress', 
                            stage: 4, 
                            progress: 75, 
                            message: `质量审查通过 (评分: ${reviewResults.overallScore}/10)` 
                        });
                    } else {
                        stageCallback({ 
                            type: 'coordination_progress', 
                            stage: 4, 
                            progress: 75, 
                            message: `达到最大重试次数，使用当前结果 (评分: ${reviewResults.overallScore}/10)` 
                        });
                    }
                    break;
                }
            }

            if (signal?.aborted) throw new DOMException('请求已中止', 'AbortError');
            stageCallback({ type: 'coordination_progress', stage: 5, progress: 90, message: '整合最终结果...' });
            const finalResult = await this.aiWorkers.integrator.integrateResultsStream(
                taskResults,
                reviewResults,
                prompt,
                plan,
                strategy,
                streamCallback,
                signal
            );
            
            stageCallback({ type: 'coordination_progress', stage: 6, progress: 100, message: '处理完成' });

            return { success: true, data: finalResult };

        } catch (error) {
            console.error('多AI协调流式处理错误:', error);
            return { success: false, error: '多AI协调失败: ' + error.message };
        }
    }

    async executeTasksInParallel(tasks, originalPrompt, strategy, signal) {
        const results = {};
        const promises = [];

        for (const task of tasks) {
            const promise = this.executeTask(task, originalPrompt, strategy, signal)
                .then(result => {
                    results[task.id] = result;
                    return result;
                });
            promises.push(promise);
        }

        await Promise.all(promises);
        return results;
    }

    async executeTask(task, originalPrompt, strategy, signal) {
        let worker;
        console.log(`🔍 任务分配: 任务ID=${task.id}, 任务类型=${task.type}`);
        
        switch (task.type) {
            case 'code':
                worker = this.aiWorkers.coder;
                console.log('✅ 分配给代码生成AI');
                break;
            case 'writing':
                worker = this.aiWorkers.writer;
                console.log('✅ 分配给文字创作AI');
                break;
            default:
                // 动态生成专用AI来处理特殊任务类型
                console.log(`🤖 创建动态AI专家处理任务类型: ${task.type}`);
                worker = await this.createDynamicWorker(task.type, task, originalPrompt, strategy);
                break;
        }

        return await worker.process(task, originalPrompt, strategy, signal);
    }

    /**
     * 动态创建专门的AI工作者
     */
    async createDynamicWorker(taskType, task, originalPrompt, strategy) {
        return {
            async process(task, originalPrompt, strategy, signal) {
                console.log(`🎯 动态AI专家开始处理 ${taskType} 类型任务`);
                
                // 根据任务类型和描述智能判断应该用哪种AI
                const taskDesc = task.description?.toLowerCase() || '';
                const isActuallyCode = /代码|html|css|javascript|网页|网站|页面|程序|应用|界面|布局/.test(taskDesc) ||
                                     /个人主页|主页|homepage|website/.test(originalPrompt.toLowerCase());
                
                if (isActuallyCode) {
                    console.log('🔄 动态判断: 实际是代码任务，转发给代码AI');
                    // 临时修改任务类型并转发给代码AI
                    const modifiedTask = { ...task, type: 'code' };
                    
                    const systemPrompt = `你是资深的前端开发工程师，专精于现代Web技术。你只处理代码开发任务，绝不参与文字创作工作。`;
                    const codePrompt = `${systemPrompt}

用户原始需求: "${originalPrompt}"
具体任务: "${task.description}"
实现策略: ${JSON.stringify(strategy, null, 2)}

要求：
1. 生成完整的HTML、CSS和JavaScript代码
2. 采用现代前端开发最佳实践
3. 确保代码的可读性和可维护性
4. 包含必要的注释和说明
5. 实现响应式设计，支持移动端

请生成高质量的前端代码：`;

                    const result = await getAIPrompt(codePrompt, [], signal);
                    return {
                        taskId: task.id,
                        type: 'code',
                        content: result.success ? result.data : '代码生成失败',
                        success: result.success
                    };
                } else {
                    console.log('🔄 动态判断: 实际是写作任务，转发给写作AI');
                    // 临时修改任务类型并转发给写作AI
                    const modifiedTask = { ...task, type: 'writing' };
                    
                    const systemPrompt = `你是专业的文字创作专家，擅长各种体裁的内容创作。你专注于文字内容创作，绝不生成任何代码。`;
                    const writePrompt = `${systemPrompt}

用户原始需求: "${originalPrompt}"
具体任务: "${task.description}"
创作策略: ${JSON.stringify(strategy, null, 2)}

要求：
1. 内容必须原创且具有吸引力
2. 语言表达要流畅自然
3. 结构要清晰合理
4. 适合目标读者群体
5. 体现情感共鸣和深度思考

请基于以上需求创作高质量的内容：`;

                    const result = await getAIPrompt(writePrompt, [], signal);
                    return {
                        taskId: task.id,
                        type: 'writing',
                        content: result.success ? result.data : '内容创作失败',
                        success: result.success
                    };
                }
            }
        };
    }
}

module.exports = { AICoordinator };
