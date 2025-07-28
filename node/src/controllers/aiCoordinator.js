const { getAIPrompt, getAIPromptStream } = require('./aihandel.js');
const { htmlRenderer } = require('./htmlRenderer.js');

/**
 * AI协调器 - 负责任务分配和结果整合
 */
class AICoordinator {
    constructor() {
        this.aiWorkers = {
            planner: new PlannerAI(),
            strategist: new StrategistAI(), // 新增思路AI
            coder: new CodeGeneratorAI(),
            reviewer: new ReviewerAI(),
            writer: new WriterAI(),
            integrator: new IntegratorAI()
        };
    }

    /**
     * 主入口 - 处理用户请求
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
            const strategy = await this.aiWorkers.strategist.createStrategy(prompt, plan, history);
            console.log('实现思路:', strategy);

            // 第3步：并行分配任务给不同的专业AI
            console.log('步骤3: 分配任务给专业AI');
            const taskResults = await this.executeTasksInParallel(plan.tasks, prompt, strategy);
            console.log('任务执行结果:', taskResults);

            // 第4步：审查AI审查所有结果
            console.log('步骤4: 审查所有结果');
            const reviewResults = await this.aiWorkers.reviewer.reviewAllResults(taskResults, prompt, strategy);
            console.log('审查结果:', reviewResults);

            // 第5步：整合AI整合最终结果
            console.log('步骤5: 整合最终结果');
            const finalResult = await this.aiWorkers.integrator.integrateResults(
                taskResults, 
                reviewResults, 
                prompt, 
                plan,
                strategy
            );
            console.log('最终整合结果:', finalResult);

            return {
                success: true,
                data: finalResult,
                mode: 'multi-ai-coordinator',
                process: {
                    plan: plan,
                    strategy: strategy,
                    taskResults: taskResults,
                    reviewResults: reviewResults
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
     * 新增：流式处理用户请求
     */
    async processUserRequestStream(prompt, history, streamCallback, stageCallback, signal) {
        try {
            if (signal?.aborted) throw new DOMException('请求已中止', 'AbortError');
            stageCallback({ type: 'coordination_progress', stage: 1, progress: 10, message: '制定执行计划...' });
            const plan = await this.aiWorkers.planner.createPlan(prompt, history, signal);

            if (signal?.aborted) throw new DOMException('请求已中止', 'AbortError');
            stageCallback({ type: 'coordination_progress', stage: 2, progress: 25, message: '制定实现思路...' });
            const strategy = await this.aiWorkers.strategist.createStrategy(prompt, plan, history, signal);

            if (signal?.aborted) throw new DOMException('请求已中止', 'AbortError');
            stageCallback({ type: 'coordination_progress', stage: 3, progress: 50, message: '并行执行任务...' });
            const taskResults = await this.executeTasksInParallel(plan.tasks, prompt, strategy, signal);

            if (signal?.aborted) throw new DOMException('请求已中止', 'AbortError');
            stageCallback({ type: 'coordination_progress', stage: 4, progress: 75, message: '审查所有结果...' });
            const reviewResults = await this.aiWorkers.reviewer.reviewAllResults(taskResults, prompt, strategy, signal);

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
        switch (task.type) {
            case 'code':
                worker = this.aiWorkers.coder;
                break;
            case 'writing':
                worker = this.aiWorkers.writer;
                break;
            default:
                worker = this.aiWorkers.writer;
        }

        return await worker.process(task, originalPrompt, strategy, signal);
    }
}

// 计划制定AI
class PlannerAI {
    getSystemPrompt() {
        return `你是顶级的项目规划专家和需求分析师，拥有丰富的行业经验和前瞻性思维。

核心职责：
1. 深度分析用户需求，挖掘隐含需求和潜在价值
2. 预见用户可能遗漏的重要功能和体验细节
3. 制定超越用户期望的完整解决方案
4. 识别潜在风险和机会点

专业能力：
- 需求洞察：从用户简单描述中识别真实业务需求
- 场景预测：预见用户在实际使用中的各种情况
- 体验设计：考虑用户体验的完整流程和细节
- 技术前瞻：推荐最适合的现代化技术方案

思维原则：
1. 用户说的是表面需求，要挖掘深层需求
2. 考虑使用场景的完整性和连贯性
3. 主动补充用户未想到的重要功能
4. 平衡功能完整性与复杂度控制`;
    }

    async createPlan(prompt, history, signal) {
        const planPrompt = `${this.getSystemPrompt()}

用户原始需求: "${prompt}"

请进行深度需求分析和规划：

分析维度：
1. **显性需求**：用户明确表达的需求
2. **隐性需求**：用户未说但实际需要的功能
3. **潜在需求**：用户可能未意识到但很有价值的特性
4. **使用场景**：用户在什么情况下使用，会遇到什么问题
5. **体验目标**：最终要达到什么样的用户体验

规划要求：
- 如果是写作需求：考虑文体特色、目标读者、传播渠道、后续优化等
- 如果是代码需求：考虑用户交互、数据处理、性能优化、扩展性等
- 主动增加用户未提及但重要的功能点
- 预见可能的使用问题并提供解决方案

请严格按照以下JSON格式返回：
{
    "userRequest": "用户的原始需求理解",
    "deepAnalysis": {
        "explicitNeeds": ["明确需求1", "明确需求2"],
        "implicitNeeds": ["隐含需求1", "隐含需求2"],
        "potentialNeeds": ["潜在需求1", "潜在需求2"],
        "userScenarios": ["使用场景1", "使用场景2"],
        "experienceGoals": ["体验目标1", "体验目标2"]
    },
    "enhancedRequirements": ["增强需求1", "增强需求2"],
    "complexity": "simple|medium|complex",
    "tasks": [
        {
            "id": "task1", 
            "type": "code|writing",
            "description": "具体要生成什么内容（包含增强功能）",
            "deliverable": "最终要交付的具体文件或内容",
            "priority": 1,
            "enhancedFeatures": ["增强特性1", "增强特性2"]
        }
    ],
    "strategy": "如何确保超越用户期望",
    "qualityStandards": ["质量标准1", "质量标准2"],
    "successMetrics": ["成功指标1", "成功指标2"]
}

只返回JSON，不要其他内容。`;

        const result = await getAIPrompt(planPrompt, history, signal);
        if (result.success) {
            try {
                const parsed = JSON.parse(result.data);
                if (!parsed.tasks || parsed.tasks.length === 0) {
                    return this.getEnhancedDefaultPlan(prompt);
                }
                return parsed;
            } catch (e) {
                console.log('计划解析失败，使用增强默认计划');
                return this.getEnhancedDefaultPlan(prompt);
            }
        }
        return this.getEnhancedDefaultPlan(prompt);
    }

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
        } else if (isCodeRequest) {
            finalType = "code";
        } else {
            finalType = "writing";
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
                        type: "writing",
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
                        type: "code",
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
        
        const strategyPrompt = `${this.getSystemPrompt()}

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

        const result = await getAIPrompt(strategyPrompt, history, signal);
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
        return `你是资深的前端开发工程师，专精于现代Web技术。

专业领域：
- HTML5语义化标签和结构设计
- CSS3现代布局和视觉效果
- JavaScript交互功能和用户体验
- 响应式设计和跨浏览器兼容
- 性能优化和代码质量

核心原则：
1. 代码简洁优雅，结构清晰
2. 严格遵循Web标准和最佳实践
3. 注重用户体验和可访问性
4. 确保代码的可维护性和扩展性

你只处理代码开发任务，绝不参与文字创作工作。`;
    }

    async process(task, originalPrompt, strategy, signal) {
        // 如果任务类型不是代码，拒绝处理
        if (task.type !== 'code') {
            console.log('🚫 代码AI拒绝处理非代码任务');
            return {
                taskId: task.id,
                type: 'error',
                content: '代码生成AI只处理代码开发任务',
                success: false
            };
        }

        // 检查是否明确不要代码
        const lowerPrompt = originalPrompt.toLowerCase();
        const explicitNoCode = ['不要代码', '不写代码', '不需要代码', '只要文字', '只需要文字', '纯文字说明', '文字版本'];
        
        if (explicitNoCode.some(phrase => lowerPrompt.includes(phrase))) {
            console.log('🔄 用户明确不要代码，代码AI退出');
            return {
                taskId: task.id,
                type: 'error',
                content: '用户明确不需要代码，请使用文字创作AI',
                success: false
            };
        }

        console.log('🚀 代码AI开始生成代码');
        const codePrompt = `${this.getSystemPrompt()}

用户原始需求: "${originalPrompt}"
具体任务: "${task.description}"
实现思路: ${JSON.stringify(strategy, null, 2)}

请基于以上需求和思路，生成高质量的前端代码：

技术要求：
- 前端技术: ${strategy.technologies?.primary?.join(', ') || 'HTML5, CSS3, JavaScript'}
- 样式技术: ${strategy.technologies?.secondary?.join(', ') || 'CSS Grid, Flexbox'}
- 高级特性: ${strategy.technologies?.advanced?.join(', ') || '响应式设计, 性能优化'}

质量标准：
- 主要标准: ${strategy.qualityStandards?.primary || '功能完整性'}
- 次要标准: ${strategy.qualityStandards?.secondary || '用户体验'}
- 高级标准: ${strategy.qualityStandards?.advanced || '代码质量'}

输出格式：
# ${task.deliverable}

## 技术架构
${strategy.architecture}

## 核心特性
${strategy.implementation?.keyPoints?.map(point => `- ${point}`).join('\n') || '- 现代化设计\n- 响应式布局\n- 优秀用户体验'}

## 完整代码

\`\`\`html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>页面标题</title>
    <style>
        /* CSS样式 */
    </style>
</head>
<body>
    <!-- HTML结构 -->
    
    <script>
        // JavaScript功能
    </script>
</body>
</html>
\`\`\`

## 技术说明
详细说明实现的关键技术点和设计思路

## 使用指南
如何使用和自定义这个代码`;

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
        return `你是专业的文字创作专家，擅长各种体裁的内容创作。

专业领域：
- 小说故事创作（短篇、中篇、长篇）
- 散文随笔写作
- 说明文档撰写
- 分析报告编写
- 创意文案创作

创作原则：
1. 内容原创，绝不抄袭
2. 语言生动，表达准确
3. 结构清晰，逻辑严密
4. 情感真挚，引人入胜
5. 符合文体特点和要求

你专注于文字内容创作，绝不生成任何代码。`;
    }

    async process(task, originalPrompt, strategy, signal) {
        // 如果任务类型不是写作，拒绝处理
        if (task.type !== 'writing') {
            console.log('🚫 写作AI拒绝处理非写作任务');
            return {
                taskId: task.id,
                type: 'error',
                content: '文字创作AI只处理写作任务',
                success: false
            };
        }

        console.log('✍️ 写作AI开始创作内容');
        
        // 分析创作类型
        const lowerPrompt = originalPrompt.toLowerCase();
        const isNovel = /小说|故事|情节|人物|剧情/.test(lowerPrompt);
        const isArticle = /文章|散文|随笔|杂文/.test(lowerPrompt);
        const isAnalysis = /分析|报告|说明|介绍|评论/.test(lowerPrompt);
        
        let contentType = '内容';
        if (isNovel) contentType = '小说故事';
        else if (isArticle) contentType = '文章';
        else if (isAnalysis) contentType = '分析说明';

        const writePrompt = `${this.getSystemPrompt()}

用户原始需求: "${originalPrompt}"
具体任务: "${task.description}"
内容类型: ${contentType}
实现思路: ${JSON.stringify(strategy, null, 2)}

请基于以上需求创作高质量的${contentType}：

创作要求：
- 主要技巧: ${strategy.technologies?.primary?.join(', ') || '叙事技巧, 文字表达'}
- 辅助技巧: ${strategy.technologies?.secondary?.join(', ') || '人物塑造, 环境描写'}
- 高级技巧: ${strategy.technologies?.advanced?.join(', ') || '文学手法, 修辞技巧'}

质量标准：
- 主要标准: ${strategy.qualityStandards?.primary || '内容原创性'}
- 次要标准: ${strategy.qualityStandards?.secondary || '语言流畅性'}
- 高级标准: ${strategy.qualityStandards?.advanced || '思想深度'}

创作步骤：
${strategy.implementation?.steps?.map((step, index) => `${index + 1}. ${step}`).join('\n') || '1. 确定主题\n2. 构思框架\n3. 内容创作\n4. 修改完善'}

请直接开始创作，不要包含任何代码标记或技术术语：`;

        const result = await getAIPrompt(writePrompt, [], signal);
        return {
            taskId: task.id,
            type: 'writing',
            content: result.success ? result.data : '内容创作失败',
            success: result.success
        };
    }
}

// 更新审查专家AI
class ReviewerAI {
    getSystemPrompt() {
        return `你是业界顶级的质量控制专家，拥有严格的评判标准和丰富的审查经验。

核心职责：
1. 对所有类型的内容进行严格的质量审查
2. 发现潜在问题并提供专业改进建议
3. 确保最终交付物达到行业顶级标准
4. 预见用户使用中可能遇到的问题

审查标准：
- 代码类：功能完整性、性能优化、安全性、可维护性、用户体验
- 文字类：内容质量、语言表达、逻辑结构、原创性、感染力
- 通用：创新性、实用性、完整性、专业性

评判原则：
1. 标准严格，不轻易通过
2. 发现问题要具体明确
3. 改进建议要可操作
4. 考虑长期价值和影响`;
    }

    async reviewAllResults(taskResults, originalPrompt, strategy, signal) {
        const allContent = Object.values(taskResults)
            .map(result => `=== 任务${result.taskId}(${result.type}) ===\n${result.content}`)
            .join('\n\n');

        // 判断内容类型并选择相应的审查策略
        const hasCodeContent = Object.values(taskResults).some(result => result.type === 'code');
        const hasWritingContent = Object.values(taskResults).some(result => result.type === 'writing');

        let analysisResult = null;
        
        // 对HTML代码进行技术分析
        if (hasCodeContent) {
            for (const result of Object.values(taskResults)) {
                if (result.type === 'code' && htmlRenderer.containsHTMLCode(result.content)) {
                    try {
                        console.log('🔍 检测到HTML代码，启动技术分析...');
                        const htmlCode = htmlRenderer.extractHTMLCode(result.content);
                        if (htmlCode) {
                            analysisResult = await htmlRenderer.comprehensiveAnalysis(htmlCode, {
                                width: 1200,
                                height: 800,
                                fullPage: true
                            });
                            console.log(`✅ 技术分析完成 - 方法: ${analysisResult.method}, 总分: ${analysisResult.staticAnalysis?.overallScore || 'N/A'}`);
                            break;
                        }
                    } catch (error) {
                        console.error('❌ 技术分析失败:', error);
                    }
                }
            }
        }

        let reviewPrompt;

        if (hasCodeContent && analysisResult && analysisResult.success) {
            // 代码审查
            const staticAnalysis = analysisResult.staticAnalysis;
            
            reviewPrompt = `${this.getSystemPrompt()}

=== 代码质量严格审查 ===

用户原始需求: "${originalPrompt}"
实现思路: ${JSON.stringify(strategy, null, 2)}

生成的代码内容:
${allContent}

=== 技术分析报告 ===
分析方法: ${analysisResult.method}
综合评分: ${staticAnalysis.overallScore}/10

详细评分:
- 代码结构: ${staticAnalysis.scores.structure}/10
- 现代化特性: ${staticAnalysis.scores.modernFeatures}/10  
- 可访问性: ${staticAnalysis.scores.accessibility}/10
- 响应式设计: ${staticAnalysis.scores.responsive}/10
- 性能优化: ${staticAnalysis.scores.performance}/10
- 设计模式: ${staticAnalysis.scores.designPatterns}/10

=== 严格审查标准 ===
1. **功能完整性** (权重25%)：是否完全实现用户需求，有无功能遗漏
2. **代码质量** (权重20%)：代码结构、可读性、可维护性
3. **用户体验** (权重20%)：界面设计、交互体验、响应速度
4. **技术先进性** (权重15%)：是否采用现代化技术和最佳实践
5. **安全性能** (权重10%)：安全漏洞、性能瓶颈
6. **扩展性** (权重10%)：未来扩展的可能性和便利性

审查要求：
- 标准严格，发现所有潜在问题
- 每个问题都要给出具体的改进方案
- 评分要客观公正，不能过于宽松
- 考虑实际使用中可能遇到的问题

请按以下JSON格式返回严格的审查结果：
{
    "overallScore": 1-10,
    "passStandard": true/false,
    "dimensionScores": {
        "functionality": 1-10,
        "codeQuality": 1-10,
        "userExperience": 1-10,
        "modernTech": 1-10,
        "security": 1-10,
        "scalability": 1-10
    },
    "criticalIssues": ["严重问题1", "严重问题2"],
    "majorIssues": ["主要问题1", "主要问题2"],
    "minorIssues": ["次要问题1", "次要问题2"],
    "improvements": [
        {
            "issue": "具体问题描述",
            "solution": "详细解决方案",
            "priority": "critical|major|minor",
            "effort": "low|medium|high"
        }
    ],
    "strengths": ["优势1", "优势2"],
    "professionalFeedback": "专业评价和建议",
    "approved": true/false
}

只返回JSON：`;
        } else if (hasWritingContent) {
            // 文字内容审查
            reviewPrompt = `${this.getSystemPrompt()}

=== 文字内容严格审查 ===

用户原始需求: "${originalPrompt}"
创作策略: ${JSON.stringify(strategy, null, 2)}

生成的文字内容:
${allContent}

=== 严格审查标准 ===
1. **内容质量** (权重25%)：原创性、深度、准确性、完整性
2. **语言表达** (权重20%)：流畅性、准确性、生动性、风格一致性
3. **结构逻辑** (权重20%)：条理清晰、逻辑严密、层次分明
4. **创新价值** (权重15%)：新颖性、独特视角、创意表达
5. **情感共鸣** (权重10%)：感染力、真实性、情感深度
6. **实用价值** (权重10%)：对读者的价值、可读性、传播性

具体审查要点：
- 内容是否原创，有无抄袭痕迹
- 语言是否流畅自然，有无语法错误
- 结构是否清晰合理，逻辑是否严密
- 是否有吸引力和感染力
- 是否达到了预期的表达效果
- 是否考虑了目标读者的需求

审查要求：
- 标准严格，不容忍低质量内容
- 发现所有语言、逻辑、内容问题
- 提供具体可行的改进建议
- 确保最终质量达到出版级标准

请按以下JSON格式返回严格的审查结果：
{
    "overallScore": 1-10,
    "passStandard": true/false,
    "dimensionScores": {
        "contentQuality": 1-10,
        "languageExpression": 1-10,
        "structureLogic": 1-10,
        "innovation": 1-10,
        "emotionalResonance": 1-10,
        "practicalValue": 1-10
    },
    "contentAnalysis": {
        "wordCount": "估算字数",
        "readingTime": "阅读时长",
        "targetAudience": "目标读者",
        "writingStyle": "写作风格"
    },
    "criticalIssues": ["严重问题1", "严重问题2"],
    "majorIssues": ["主要问题1", "主要问题2"],
    "minorIssues": ["次要问题1", "次要问题2"],
    "improvements": [
        {
            "issue": "具体问题描述",
            "solution": "详细改进方案",
            "priority": "critical|major|minor",
            "effort": "low|medium|high"
        }
    ],
    "strengths": ["优势1", "优势2"],
    "professionalFeedback": "专业文学评价和建议",
    "approved": true/false
}

只返回JSON：`;
        } else {
            // 通用内容审查
            reviewPrompt = `${this.getSystemPrompt()}

=== 综合内容严格审查 ===

用户原始需求: "${originalPrompt}"
实现策略: ${JSON.stringify(strategy, null, 2)}

生成内容:
${allContent}

请进行全面的质量审查，确保内容达到专业标准。

请按以下JSON格式返回审查结果：
{
    "overallScore": 1-10,
    "passStandard": true/false,
    "issues": ["问题1", "问题2"],
    "suggestions": ["建议1", "建议2"],
    "strengths": ["优势1", "优势2"],
    "professionalFeedback": "专业评价",
    "approved": true/false
}

只返回JSON：`;
        }

        const result = await getAIPrompt(reviewPrompt, [], signal);
        return this.parseReviewResult(result);
    }

    parseReviewResult(result) {
        if (result.success) {
            try {
                // 清理可能的Markdown代码块标记
                let jsonText = result.data;
                
                // 移除可能的```json开头和```结尾标记
                jsonText = jsonText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
                
                // 移除可能的其他代码块标记
                jsonText = jsonText.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
                
                // 去除首尾空白字符
                jsonText = jsonText.trim();
                
                console.log('🔍 清理后的JSON文本预览:', jsonText.substring(0, 200) + '...');
                
                const parsed = JSON.parse(jsonText);
                
                // 确保审查结果包含必要字段
                if (!parsed.overallScore) parsed.overallScore = 6;
                if (!parsed.hasOwnProperty('approved')) parsed.approved = parsed.overallScore >= 7;
                if (!parsed.passStandard) parsed.passStandard = parsed.approved;
                
                console.log('✅ 审查结果解析成功:', {
                    score: parsed.overallScore,
                    approved: parsed.approved,
                    passStandard: parsed.passStandard
                });
                
                return parsed;
            } catch (e) {
                console.error('❌ 审查结果解析失败:', e);
                console.error('🔍 原始响应数据:', result.data?.substring(0, 500) + '...');
                
                // 尝试提取JSON部分（如果有的话）
                try {
                    const jsonMatch = result.data.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        console.log('🔄 尝试提取JSON部分...');
                        const extracted = JSON.parse(jsonMatch[0]);
                        
                        // 补充必要字段
                        if (!extracted.overallScore) extracted.overallScore = 6;
                        if (!extracted.hasOwnProperty('approved')) extracted.approved = extracted.overallScore >= 7;
                        if (!extracted.passStandard) extracted.passStandard = extracted.approved;
                        
                        console.log('✅ JSON提取成功');
                        return extracted;
                    }
                } catch (extractError) {
                    console.error('❌ JSON提取也失败:', extractError);
                }
                
                return {
                    overallScore: 6,
                    passStandard: false,
                    approved: false,
                    issues: ["审查结果解析失败: " + e.message],
                    suggestions: ["需要重新审查"],
                    professionalFeedback: "由于技术问题，无法完成详细审查，但系统将继续处理"
                };
            }
        }
        
        console.log('❌ 审查请求失败');
        return {
            overallScore: 5,
            passStandard: false,
            approved: false,
            issues: ["审查过程失败"],
            suggestions: ["需要重新处理"],
            professionalFeedback: "审查失败，但系统将继续处理，建议后续手动检查内容质量"
        };
    }

    // 补充缺失的方法
    generateAnalysisReport(analysisResult) {
        const staticAnalysis = analysisResult.staticAnalysis;
        
        let report = '\n---\n\n## 🎨 分析报告\n\n';
        
        if (staticAnalysis) {
            report += `### 📊 技术实现质量\n`;
            report += `- **代码结构**: ${staticAnalysis.scores.structure}/10\n`;
            report += `- **现代化程度**: ${staticAnalysis.scores.modernFeatures}/10\n`;
            report += `- **可访问性**: ${staticAnalysis.scores.accessibility}/10\n`;
            report += `- **响应式设计**: ${staticAnalysis.scores.responsive}/10\n`;
            report += `- **性能表现**: ${staticAnalysis.scores.performance}/10\n\n`;
        }
        
        return report;
    }
}

// 整合专家AI
class IntegratorAI {
    async integrateResults(taskResults, reviewResults, originalPrompt, plan, strategy) {
        const allContent = Object.values(taskResults)
            .map(result => `=== 任务${result.taskId}(${result.type}) ===\n${result.content}`)
            .join('\n\n');

        const integrationPrompt = `
你是最终交付专家。基于实现思路和审查结果，整合最终的Markdown文档。

用户原始需求: "${originalPrompt}"

执行计划: ${JSON.stringify(plan, null, 2)}

实现思路: ${JSON.stringify(strategy, null, 2)}

审查结果: ${JSON.stringify(reviewResults, null, 2)}

各专家AI的输出:
${allContent}

⚠️ 整合要求：
1. 输出标准的Markdown格式
2. 严格按照实现思路组织内容
3. 如果审查发现问题，必须修正
4. 确保技术实现符合架构设计
5. 体现所有关键技术点和最佳实践

最终交付物应该包括：
- 实现概述
- 技术架构说明
- 完整代码实现
- 使用说明
- 技术特点

请提供最终的Markdown格式交付物：
        `;

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

        const integrationPrompt = `
你是最终交付专家。基于实现思路和审查结果，整合最终的Markdown文档。

用户原始需求: "${originalPrompt}"

执行计划: ${JSON.stringify(plan, null, 2)}

实现思路: ${JSON.stringify(strategy, null, 2)}

审查结果: ${JSON.stringify(reviewResults, null, 2)}

各专家AI的输出:
${allContent}

⚠️ 整合要求：
1. 输出标准的Markdown格式
2. 严格按照实现思路组织内容
3. 如果审查发现问题，必须修正
4. 确保技术实现符合架构设计
5. 体现所有关键技术点和最佳实践

最终交付物应该包括：
- 实现概述
- 技术架构说明
- 完整代码实现
- 使用说明
- 技术特点

请提供最终的Markdown格式交付物：
        `;

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

module.exports = { AICoordinator };
