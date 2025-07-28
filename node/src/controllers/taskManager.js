const { getAIPrompt } = require('./aihandel.js');
const { AICoordinator } = require('./aiCoordinator.js');

class TaskManager {
    constructor() {
        this.tasks = new Map(); // 存储任务状态
        this.coordinator = new AICoordinator();
    }

    /**
     * 创建异步任务
     */
    async createTask(prompt, history = [], useCoordinator = false) {
        const taskId = this.generateTaskId();
        
        // 立即返回任务ID
        this.tasks.set(taskId, {
            id: taskId,
            status: 'processing',
            progress: 0,
            result: null,
            error: null,
            createdAt: new Date(),
            prompt: prompt
        });

        // 异步处理任务
        this.processTaskAsync(taskId, prompt, history, useCoordinator);

        return taskId;
    }

    /**
     * 异步处理任务
     */
    async processTaskAsync(taskId, prompt, history, useCoordinator) {
        try {
            this.updateTaskProgress(taskId, 5, '任务创建成功，准备分析用户需求...');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 如果未明确指定是否使用协调器，进行智能判断
            if (useCoordinator === undefined || useCoordinator === null) {
                const lowerPrompt = prompt.toLowerCase();
                
                // 优先检测文字创作需求
                const isWritingRequest = /写.*?(小说|故事|文章|散文|诗歌|剧本|日记|传记|报告|论文|说明|介绍|分析|评论|总结)/.test(lowerPrompt) ||
                                       /创作.*?(小说|故事|文章|散文|诗歌|剧本)/.test(lowerPrompt) ||
                                       /^(小说|故事|文章|散文|诗歌|剧本|日记|传记|报告|论文|说明|介绍|分析|评论|总结)/.test(lowerPrompt);
                
                // 检测代码开发需求
                const isCodeRequest = /写|生成|创建|制作.*?(网页|网站|页面|代码|html|应用|主页)/.test(lowerPrompt) ||
                                     /开发|设计|实现.*?(页面|网站|网页|应用)/.test(lowerPrompt);
                
                // 如果明确说不要代码，则不使用协调器
                const noCodeRequest = /不要.*代码|不写.*代码|不需要.*代码|只要.*文字|只需要.*文字|纯文字/.test(lowerPrompt);
                
                // 文字创作和代码开发都使用协调器，但会分配给不同的专家AI
                useCoordinator = (isWritingRequest || isCodeRequest) && !noCodeRequest;
                
                console.log(`📋 智能判断结果: 写作需求=${isWritingRequest}, 代码需求=${isCodeRequest}, 不要代码=${noCodeRequest}, useCoordinator=${useCoordinator}`);
            }
            
            let result;
            if (useCoordinator) {
                this.updateTaskProgress(taskId, 15, '启动多AI协调系统...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                this.updateTaskProgress(taskId, 25, '主协调AI正在制定执行计划...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                this.updateTaskProgress(taskId, 35, '思路AI正在制定详细实现思路...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                this.updateTaskProgress(taskId, 50, '分配任务给专业AI团队...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                this.updateTaskProgress(taskId, 70, '多个专业AI基于详细思路并行处理中...');
                result = await this.coordinator.processUserRequest(prompt, history);
                
                this.updateTaskProgress(taskId, 85, '审查AI正在检查结果质量和思路符合度...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                this.updateTaskProgress(taskId, 95, '整合AI正在合并最终结果...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                this.updateTaskProgress(taskId, 30, '使用单一AI处理任务...');
                result = await getAIPrompt(prompt, history);
            }

            this.updateTaskProgress(taskId, 98, '准备返回最终结果...');
            await new Promise(resolve => setTimeout(resolve, 500));

            if (result.success) {
                this.tasks.set(taskId, {
                    ...this.tasks.get(taskId),
                    status: 'completed',
                    progress: 100,
                    result: result,
                    message: '任务成功完成！',
                    completedAt: new Date()
                });
            } else {
                this.tasks.set(taskId, {
                    ...this.tasks.get(taskId),
                    status: 'failed',
                    progress: 100,
                    error: result.error,
                    message: '任务处理失败',
                    completedAt: new Date()
                });
            }
        } catch (error) {
            console.error('任务处理错误:', error);
            this.tasks.set(taskId, {
                ...this.tasks.get(taskId),
                status: 'failed',
                progress: 100,
                error: error.message,
                message: '任务执行出错',
                completedAt: new Date()
            });
        }
    }

    /**
     * 更新任务进度
     */
    updateTaskProgress(taskId, progress, message) {
        const task = this.tasks.get(taskId);
        if (task) {
            this.tasks.set(taskId, {
                ...task,
                progress: progress,
                message: message,
                updatedAt: new Date()
            });
        }
    }

    /**
     * 获取任务状态
     */
    getTaskStatus(taskId) {
        return this.tasks.get(taskId) || null;
    }

    /**
     * 生成任务ID
     */
    generateTaskId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 清理过期任务
     */
    cleanupExpiredTasks() {
        const now = new Date();
        const maxAge = 60 * 60 * 1000; // 1小时

        for (const [taskId, task] of this.tasks.entries()) {
            if (now - task.createdAt > maxAge) {
                this.tasks.delete(taskId);
            }
        }
    }

    /**
     * 终止任务
     */
    stopTask(taskId) {
        const task = this.tasks.get(taskId);
        if (task && task.status === 'processing') {
            this.tasks.set(taskId, {
                ...task,
                status: 'stopped',
                progress: 100,
                message: '任务已被用户终止',
                completedAt: new Date()
            });
            return true;
        }
        return false;
    }
}

// 单例模式
const taskManager = new TaskManager();

// 定期清理过期任务
setInterval(() => {
    taskManager.cleanupExpiredTasks();
}, 10 * 60 * 1000); // 每10分钟清理一次

module.exports = { taskManager };
