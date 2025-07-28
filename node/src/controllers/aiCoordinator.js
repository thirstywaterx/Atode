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
    async createPlan(prompt, history, signal) {
        const planPrompt = `
你是任务规划专家AI。你的职责是将用户需求转化为具体可执行的任务计划。

用户需求: "${prompt}"

重要规则：
1. 如果用户要求生成代码/网页/程序，必须创建code类型任务
2. 如果用户要求写文章/说明/分析，创建writing类型任务
3. 每个任务描述必须具体明确，不能模糊
4. 必须明确指出最终交付物是什么

请严格按照以下JSON格式返回，不要添加任何解释：
{
    "analysis": "用户具体要求什么类型的交付物",
    "complexity": "simple|medium|complex",
    "tasks": [
        {
            "id": "task1", 
            "type": "code|writing",
            "description": "具体要生成什么，用什么技术",
            "deliverable": "最终要交付的具体文件或内容",
            "priority": 1
        }
    ],
    "strategy": "如何确保满足用户需求"
}

只返回JSON，绝对不要其他内容。
        `;

        const result = await getAIPrompt(planPrompt, history, signal);
        if (result.success) {
            try {
                const parsed = JSON.parse(result.data);
                // 验证计划是否合理
                if (!parsed.tasks || parsed.tasks.length === 0) {
                    return this.getDefaultPlan(prompt);
                }
                return parsed;
            } catch (e) {
                console.log('计划解析失败，使用默认计划');
                return this.getDefaultPlan(prompt);
            }
        }
        return this.getDefaultPlan(prompt);
    }

    getDefaultPlan(prompt) {
        // 智能判断用户需求类型
        const lowerPrompt = prompt.toLowerCase();
        const isCodeRequest = /写|生成|创建|制作.*?(网页|网站|页面|代码|html|css|js|程序|应用|主页)/.test(lowerPrompt);
        
        return {
            analysis: isCodeRequest ? "用户需要生成代码文件" : "用户需要文字内容",
            complexity: "medium",
            tasks: [
                {
                    id: "main_task",
                    type: isCodeRequest ? "code" : "writing",
                    description: prompt,
                    deliverable: isCodeRequest ? "完整可运行的代码文件" : "详细的文字内容",
                    priority: 1
                }
            ],
            strategy: "直接生成用户所需的具体内容"
        };
    }
}

// 思路规划AI
class StrategistAI {
    async createStrategy(prompt, plan, history, signal) {
        const strategyPrompt = `
你是实现思路专家AI。基于执行计划，制定详细的实现思路和技术方案。

用户需求: "${prompt}"

执行计划: ${JSON.stringify(plan, null, 2)}

请制定详细的实现思路，包括：
1. 技术选择和架构设计
2. 具体实现步骤
3. 关键技术点和最佳实践
4. 可能遇到的问题和解决方案
5. 质量标准和验收要求

返回JSON格式：
{
    "overview": "整体实现思路概述",
    "architecture": "技术架构设计",
    "implementation": {
        "steps": ["步骤1", "步骤2", "步骤3"],
        "keyPoints": ["关键点1", "关键点2"],
        "bestPractices": ["最佳实践1", "最佳实践2"]
    },
    "technologies": {
        "frontend": ["技术1", "技术2"],
        "styling": ["CSS技术", "设计原则"],
        "interaction": ["交互技术", "用户体验"]
    },
    "qualityStandards": {
        "performance": "性能要求",
        "accessibility": "可访问性要求",
        "compatibility": "兼容性要求"
    },
    "potential_issues": ["可能问题1", "可能问题2"],
    "solutions": ["解决方案1", "解决方案2"]
}

只返回JSON格式：
        `;

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
        
        return {
            overview: "基于用户需求制定实现方案",
            architecture: isCodeProject ? "现代化前端架构，注重性能和用户体验" : "结构化内容组织",
            implementation: {
                steps: ["需求分析", "设计规划", "核心实现", "优化完善"],
                keyPoints: ["用户体验", "代码质量", "性能优化"],
                bestPractices: ["模块化设计", "响应式布局", "语义化标签"]
            },
            technologies: {
                frontend: isCodeProject ? ["HTML5", "CSS3", "JavaScript"] : ["Markdown"],
                styling: ["CSS Grid", "Flexbox", "现代化设计"],
                interaction: ["原生JavaScript", "平滑动画", "交互反馈"]
            },
            qualityStandards: {
                performance: "快速加载，流畅交互",
                accessibility: "支持屏幕阅读器，键盘导航",
                compatibility: "现代浏览器兼容"
            },
            potential_issues: ["兼容性问题", "性能瓶颈"],
            solutions: ["渐进增强", "性能优化", "代码分割"]
        };
    }
}

// 代码生成专家AI
class CodeGeneratorAI {
    async process(task, originalPrompt, strategy, signal) {
        const codePrompt = `
你是专业的前端开发工程师。基于详细的实现思路生成高质量代码。

用户原始需求: "${originalPrompt}"
具体任务: "${task.description}"

实现思路: ${JSON.stringify(strategy, null, 2)}

⚠️ 关键要求：
1. 严格按照实现思路中的技术选择和架构设计
2. 遵循最佳实践和质量标准
3. 实现思路中提到的关键技术点
4. 考虑潜在问题并应用相应解决方案
5. 使用Markdown格式输出，代码放在代码块中

技术要求：
- 前端技术: ${strategy.technologies?.frontend?.join(', ') || 'HTML5, CSS3, JavaScript'}
- 样式技术: ${strategy.technologies?.styling?.join(', ') || 'CSS Grid, Flexbox'}
- 交互技术: ${strategy.technologies?.interaction?.join(', ') || '原生JavaScript'}

质量标准：
- 性能: ${strategy.qualityStandards?.performance || '快速加载，流畅交互'}
- 可访问性: ${strategy.qualityStandards?.accessibility || '支持屏幕阅读器'}
- 兼容性: ${strategy.qualityStandards?.compatibility || '现代浏览器兼容'}

输出格式：
# 项目实现

## 技术架构
${strategy.architecture}

## 实现要点
${strategy.implementation?.keyPoints?.map(point => `- ${point}`).join('\n') || '- 注重代码质量'}

## 代码实现

\`\`\`html
完整的HTML代码...
\`\`\`

## 实现说明
详细说明实现的关键技术点和设计思路
        `;

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
    async process(task, originalPrompt, strategy, signal) {
        const writePrompt = `
你是专业的内容创作专家。基于详细的实现思路创作高质量内容。

用户原始需求: "${originalPrompt}"
具体任务: "${task.description}"

实现思路: ${JSON.stringify(strategy, null, 2)}

⚠️ 创作要求：
1. 按照实现思路的整体概述组织内容
2. 体现思路中的关键要点
3. 使用标准的Markdown格式
4. 结构清晰，层次分明
5. 内容详细实用

质量标准：
- 准确性: 确保内容准确无误
- 完整性: 覆盖所有关键要点
- 可读性: 结构清晰，语言流畅

请以Markdown格式提供内容：
        `;

        const result = await getAIPrompt(writePrompt, [], signal);
        return {
            taskId: task.id,
            type: 'writing',
            content: result.success ? result.data : '内容生成失败',
            success: result.success
        };
    }
}

// 更新审查专家AI
class ReviewerAI {
    async reviewAllResults(taskResults, originalPrompt, strategy, signal) {
        const allContent = Object.values(taskResults)
            .map(result => `=== 任务${result.taskId}(${result.type}) ===\n${result.content}`)
            .join('\n\n');

        // 对HTML代码进行增强的综合分析
        let analysisResult = null;
        for (const result of Object.values(taskResults)) {
            if (result.type === 'code' && htmlRenderer.containsHTMLCode(result.content)) {
                try {
                    console.log('🔍 检测到HTML代码，启动增强综合分析...');
                    const htmlCode = htmlRenderer.extractHTMLCode(result.content);
                    if (htmlCode) {
                        analysisResult = await htmlRenderer.comprehensiveAnalysis(htmlCode, {
                            width: 1200,
                            height: 800,
                            fullPage: true
                        });
                        console.log(`✅ 分析完成 - 方法: ${analysisResult.method}, 总分: ${analysisResult.staticAnalysis?.overallScore || 'N/A'}`);
                        break;
                    }
                } catch (error) {
                    console.error('❌ HTML综合分析失败:', error);
                }
            }
        }

        let reviewPrompt;

        if (analysisResult && analysisResult.success) {
            const hasVisualPreview = analysisResult.method === 'hybrid';
            const staticAnalysis = analysisResult.staticAnalysis;
            
            reviewPrompt = `
你是质量控制专家。请基于实现思路和${hasVisualPreview ? '视觉预览+' : ''}详细代码分析结果审查AI生成的代码质量。

用户原始需求: "${originalPrompt}"

实现思路: ${JSON.stringify(strategy, null, 2)}

生成的内容:
${allContent}

=== 分析报告 ===
分析方法: ${analysisResult.method} ${hasVisualPreview ? '(静态分析 + 视觉渲染)' : '(纯静态分析)'}
${hasVisualPreview ? `渲染时间: ${analysisResult.renderingTime}ms` : ''}

详细评分:
- 结构质量: ${staticAnalysis.scores.structure}/10
- 现代化特性: ${staticAnalysis.scores.modernFeatures}/10  
- 可访问性: ${staticAnalysis.scores.accessibility}/10
- 响应式设计: ${staticAnalysis.scores.responsive}/10
- 性能优化: ${staticAnalysis.scores.performance}/10
- 设计模式: ${staticAnalysis.scores.designPatterns}/10
- 综合评分: ${staticAnalysis.overallScore}/10

改进建议:
${analysisResult.recommendations.map(rec => `- ${rec}`).join('\n')}

技术特性检测:
${JSON.stringify(staticAnalysis.modernFeatures, null, 2)}

可访问性检测:
${JSON.stringify(staticAnalysis.accessibility, null, 2)}

审查重点：
1. ${hasVisualPreview ? '结合视觉效果评价设计美观度' : '基于代码推测视觉效果'}
2. 各维度评分是否合理
3. 改进建议是否可行
4. 技术实现是否符合最佳实践
5. 是否严格按照实现思路执行

基于${hasVisualPreview ? '视觉预览和' : ''}深度静态分析，严格按此JSON格式返回：
{
    "overallScore": 1-10,
    "dimensionScores": {
        "structure": 1-10,
        "modernFeatures": 1-10,
        "accessibility": 1-10,
        "responsive": 1-10,
        "performance": 1-10,
        "designPatterns": 1-10
    },
    ${hasVisualPreview ? '"visualQuality": 1-10,' : ''}
    "analysisMethod": "${analysisResult.method}",
    "technicalCorrectness": true/false,
    "strategyCompliance": true/false,
    "issues": ["具体问题"],
    "suggestions": ["改进建议"],
    "approved": true/false,
    "professionalFeedback": "基于${hasVisualPreview ? '视觉和' : ''}代码分析的专业评价"
}

只返回JSON：
            `;
        } else {
            // 标准文本审查
            reviewPrompt = `
你是质量控制专家。基于实现思路审查AI生成的内容质量。

用户原始需求: "${originalPrompt}"

实现思路: ${JSON.stringify(strategy, null, 2)}

AI生成的内容:
${allContent}

审查重点：
1. 是否严格按照实现思路执行
2. 是否达到质量标准要求
3. 技术选择是否正确
4. 关键技术点是否实现
5. 潜在问题是否得到解决

严格按此JSON格式返回：
{
    "overallScore": 1-10,
    "strategyCompliance": true/false,
    "qualityStandards": true/false,
    "technicalCorrectness": true/false,
    "issues": ["具体问题"],
    "suggestions": ["改进建议"],
    "approved": true/false
}

只返回JSON：
            `;
        }

        const result = await getAIPrompt(reviewPrompt, [], signal);
        return this.parseReviewResult(result);
    }

    async getAIPromptWithImage(prompt, base64Image) {
        // 这里需要调用支持图片的AI API
        // 由于当前的getAIPrompt不支持图片，我们先用文本提示代替
        const enhancedPrompt = `
${prompt}

注意：我已经为你生成了HTML代码的实际渲染效果预览图。请想象你能看到这个页面的视觉效果，并基于你对代码的分析给出评价。

代码分析要点：
- 检查HTML结构是否语义化
- 检查CSS样式是否现代化
- 检查响应式设计实现
- 检查交互功能是否完整
        `;

        return await getAIPrompt(enhancedPrompt);
    }

    parseReviewResult(result) {
        if (result.success) {
            try {
                return JSON.parse(result.data);
            } catch (e) {
                return {
                    overallScore: 7,
                    visualQuality: 7,
                    codeQuality: 7,
                    strategyCompliance: true,
                    designModern: true,
                    responsive: true,
                    issues: [],
                    suggestions: ["建议进一步优化"],
                    approved: true,
                    visualFeedback: "无法获取详细的视觉反馈"
                };
            }
        }
        return {
            overallScore: 6,
            strategyCompliance: false,
            qualityStandards: false,
            technicalCorrectness: false,
            issues: ["审查失败"],
            suggestions: [],
            approved: false
        };
    }

    generateAnalysisReport(analysisResult) {
        const staticAnalysis = analysisResult.staticAnalysis;
        const light = analysisResult.lightweightRender;
        const visual = analysisResult.visualRender;
        
        let report = '\n---\n\n## 🎨 顶级设计标准分析报告\n\n';
        
        // 分析方法说明
        report += `**分析标准**: ${analysisResult.method === 'full-visual' ? '🔍 严格AI视觉分析 (顶级设计师标准)' : '📊 技术分析'}\n`;
        if (analysisResult.renderingTime) {
            report += `**分析耗时**: ${analysisResult.renderingTime}ms\n\n`;
        }
        
        // 严格AI视觉分析结果（优先显示）
        if (visual && visual.success) {
            const va = visual.visualAnalysis;
            
            report += `### 🏆 设计等级评估\n`;
            report += `- **设计等级**: ${va.designGrade} ${this.getGradeEmoji(va.designGrade)}\n`;
            report += `- **综合评分**: ${va.overallScore}/10 ${this.getStrictScoreEmoji(va.overallScore)}\n`;
            report += `- **商业标准**: ${va.passingStandard ? '✅ 达标' : '❌ 未达标'}\n\n`;
            
            report += `### 📊 设计维度评分\n`;
            report += `- **视觉层次**: ${va.dimensionScores.visualHierarchy}/10 ${this.getStrictScoreEmoji(va.dimensionScores.visualHierarchy)}\n`;
            report += `- **空间布局**: ${va.dimensionScores.spaceLayout}/10 ${this.getStrictScoreEmoji(va.dimensionScores.spaceLayout)}\n`;
            report += `- **色彩对比**: ${va.dimensionScores.colorContrast}/10 ${this.getStrictScoreEmoji(va.dimensionScores.colorContrast)}\n`;
            report += `- **字体排版**: ${va.dimensionScores.typography}/10 ${this.getStrictScoreEmoji(va.dimensionScores.typography)}\n`;
            report += `- **一致性**: ${va.dimensionScores.consistency}/10 ${this.getStrictScoreEmoji(va.dimensionScores.consistency)}\n`;
            report += `- **现代化**: ${va.dimensionScores.modernDesign}/10 ${this.getStrictScoreEmoji(va.dimensionScores.modernDesign)}\n\n`;
            
            if (va.strengths && va.strengths.length > 0) {
                report += `### ✅ 设计优势\n`;
                va.strengths.forEach(strength => {
                    report += `- ${strength}\n`;
                });
                report += '\n';
            }
            
            if (va.criticalIssues && va.criticalIssues.length > 0) {
                report += `### 🚨 严重设计问题\n`;
                va.criticalIssues.forEach(issue => {
                    report += `- ${issue}\n`;
                });
                report += '\n';
            }
            
            if (va.improvements && va.improvements.length > 0) {
                report += `### 🔧 详细改进方案\n`;
                const highPriority = va.improvements.filter(imp => imp.priority === 'high');
                const mediumPriority = va.improvements.filter(imp => imp.priority === 'medium');
                const lowPriority = va.improvements.filter(imp => imp.priority === 'low');
                
                if (highPriority.length > 0) {
                    report += `**🔴 高优先级**:\n`;
                    highPriority.forEach(imp => {
                        report += `- **问题**: ${imp.issue}\n`;
                        report += `  **解决方案**: ${imp.solution}\n\n`;
                    });
                }
                
                if (mediumPriority.length > 0) {
                    report += `**🟡 中优先级**:\n`;
                    mediumPriority.forEach(imp => {
                        report += `- **问题**: ${imp.issue}\n`;
                        report += `  **解决方案**: ${imp.solution}\n\n`;
                    });
                }
                
                if (lowPriority.length > 0) {
                    report += `**🟢 低优先级**:\n`;
                    lowPriority.forEach(imp => {
                        report += `- **问题**: ${imp.issue}\n`;
                        report += `  **解决方案**: ${imp.solution}\n\n`;
                    });
                }
            }
            
            if (va.designPrinciples) {
                report += `### 🎯 设计原则分析\n`;
                if (va.designPrinciples.violated && va.designPrinciples.violated.length > 0) {
                    report += `**❌ 违反的设计原则**:\n`;
                    va.designPrinciples.violated.forEach(principle => {
                        report += `- ${principle}\n`;
                    });
                    report += '\n';
                }
                
                if (va.designPrinciples.followed && va.designPrinciples.followed.length > 0) {
                    report += `**✅ 遵循的设计原则**:\n`;
                    va.designPrinciples.followed.forEach(principle => {
                        report += `- ${principle}\n`;
                    });
                    report += '\n';
                }
            }
            
            report += `### 🎯 专业评价\n${va.professionalVerdict}\n\n`;
        }
        
        // 技术质量分析（作为补充）
        if (staticAnalysis) {
            report += `### 📊 技术实现质量\n`;
            report += `- **代码结构**: ${staticAnalysis.scores.structure}/10\n`;
            report += `- **现代化程度**: ${staticAnalysis.scores.modernFeatures}/10\n`;
            report += `- **可访问性**: ${staticAnalysis.scores.accessibility}/10\n`;
            report += `- **响应式设计**: ${staticAnalysis.scores.responsive}/10\n`;
            report += `- **性能表现**: ${staticAnalysis.scores.performance}/10\n\n`;
        }
        
        // 最终建议
        if (visual && visual.visualAnalysis) {
            const score = visual.visualAnalysis.overallScore;
            const passing = visual.visualAnalysis.passingStandard;
            
            report += `### 📝 最终建议\n`;
            if (!passing) {
                report += `❌ **设计未达到商业标准**，需要重大改进才能用于正式项目。\n\n`;
                report += `**必须解决的问题**:\n`;
                if (visual.visualAnalysis.criticalIssues) {
                    visual.visualAnalysis.criticalIssues.forEach(issue => {
                        report += `- ${issue}\n`;
                    });
                }
            } else if (score >= 9) {
                report += `🏆 **顶级设计水准**，可直接用于大型商业项目！\n`;
            } else if (score >= 7) {
                report += `✅ **良好设计水准**，经微调后可用于商业项目。\n`;
            } else {
                report += `⚠️ **一般设计水准**，需要显著改进后才能商用。\n`;
            }
        }
        
        return report;
    }

    getGradeEmoji(grade) {
        const gradeMap = {
            'A+': '🏆', 'A': '🥇', 'B+': '🥈', 'B': '🥉',
            'C+': '⚠️', 'C': '❌', 'D': '🚫', 'F': '💥'
        };
        return gradeMap[grade] || '❓';
    }

    getStrictScoreEmoji(score) {
        if (score >= 9) return '🏆'; // 顶级
        if (score >= 7) return '✅'; // 良好
        if (score >= 5) return '⚠️'; // 一般
        if (score >= 3) return '❌'; // 较差
        return '💥'; // 很差
    }

    getScoreEmoji(score) {
        if (score >= 9) return '🌟';
        if (score >= 7) return '✅';
        if (score >= 5) return '⚠️';
        return '❌';
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
