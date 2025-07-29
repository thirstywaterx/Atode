const { execSQLWithPromise } = require('../db/mysql.js');

/**
 * 保存聊天历史记录
 * @param {number} userId - 用户ID
 * @param {string} title - 聊天标题 (第一条消息的截取)
 * @param {string} content - 聊天完整内容 (JSON格式的聊天历史)
 * @returns {Promise<Object>} - 包含成功状态和消息的对象
 */
async function saveHistory(userId, title, content) {
    try {
        // 检查该用户的历史记录数量
        const countResult = await execSQLWithPromise(
            'SELECT COUNT(*) as count FROM chat_history WHERE user_id = ?',
            [userId]
        );
        
        const count = countResult[0].count;
        
        // 如果超过50条，删除最旧的记录
        if (count >= 50) {
            await execSQLWithPromise(
                'DELETE FROM chat_history WHERE user_id = ? ORDER BY created_at ASC LIMIT ?',
                [userId, count - 49] // 保留最新的49条，加上即将添加的1条，总共50条
            );
        }
        
        // 保存新的聊天记录
        await execSQLWithPromise(
            'INSERT INTO chat_history (user_id, title, content) VALUES (?, ?, ?)',
            [userId, title, content]
        );
        
        return { success: true, message: '聊天历史保存成功' };
    } catch (error) {
        console.error('保存聊天历史失败:', error);
        return { success: false, error: '保存聊天历史失败: ' + error.message };
    }
}

/**
 * 获取用户的聊天历史记录
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>} - 包含成功状态和历史记录的对象
 */
async function getHistory(userId) {
    try {
        const historyResult = await execSQLWithPromise(
            'SELECT id, title, content, created_at FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        
        return { success: true, history: historyResult };
    } catch (error) {
        console.error('获取聊天历史失败:', error);
        return { success: false, error: '获取聊天历史失败: ' + error.message };
    }
}

/**
 * 删除聊天历史记录
 * @param {number} userId - 用户ID
 * @param {number} historyId - 历史记录ID
 * @returns {Promise<Object>} - 包含成功状态和消息的对象
 */
async function deleteHistory(userId, historyId) {
    try {
        await execSQLWithPromise(
            'DELETE FROM chat_history WHERE id = ? AND user_id = ?',
            [historyId, userId]
        );
        
        return { success: true, message: '聊天历史删除成功' };
    } catch (error) {
        console.error('删除聊天历史失败:', error);
        return { success: false, error: '删除聊天历史失败: ' + error.message };
    }
}

module.exports = {
    saveHistory,
    getHistory,
    deleteHistory
};
