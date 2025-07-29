const { execSQL, execSQLWithPromise } = require('./mysql.js');

/**
 * 初始化数据库表
 * 如果表不存在则创建
 */
async function initializeDatabase() {
    try {
        console.log('开始初始化数据库...');
        
        // 创建users表
        await execSQLWithPromise(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        console.log('数据库初始化完成');
        return true;
    } catch (error) {
        console.error('数据库初始化失败:', error);
        return false;
    }
}

module.exports = {
    initializeDatabase
};
