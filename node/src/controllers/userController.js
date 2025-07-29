const { execSQL, execSQLWithPromise } = require('../db/mysql.js');
let bcrypt;
try {
    bcrypt = require('bcrypt');
} catch (e) {
    console.error("\n[重要提示] 'bcrypt' 模块未安装，用户注册和登录功能将不可用。");
    console.error("请在您的项目目录下运行 'npm install bcrypt' 来安装它。\n");
    bcrypt = null;
}
const saltRounds = 10;

/**
 * 注册新用户
 * @param {string} username
 * @param {string} password
 * @param {string} email 可选的邮箱
 * @returns {Promise<Object>}
 */
async function registerUser(username, password, email = null) {
    if (!bcrypt) {
        return { success: false, error: "服务配置不完整：bcrypt 模块缺失，无法注册。" };
    }
    if (!username || !password) {
        return { success: false, error: '用户名和密码不能为空' };
    }

    try {
        // 检查用户名是否已存在
        const users = await execSQLWithPromise('SELECT * FROM users WHERE username = ?', [username]);

        if (users.length > 0) {
            return { success: false, error: '用户名已存在' };
        }

        // 哈希密码
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 插入新用户
        let sql, params;
        if (email) {
            sql = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
            params = [username, hashedPassword, email];
        } else {
            sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
            params = [username, hashedPassword];
        }

        await execSQLWithPromise(sql, params);

        return { success: true, message: '注册成功' };
    } catch (error) {
        console.error('注册用户时出错:', error);
        return { success: false, error: '数据库操作失败' };
    }
}

/**
 * 用户登录
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Object>}
 */
async function loginUser(username, password) {
    if (!bcrypt) {
        return { success: false, error: "服务配置不完整：bcrypt 模块缺失，无法登录。" };
    }
    if (!username || !password) {
        return { success: false, error: '用户名和密码不能为空' };
    }

    try {
        const users = await execSQLWithPromise('SELECT * FROM users WHERE username = ?', [username]);

        if (users.length === 0) {
            return { success: false, error: '用户名或密码错误' };
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            return { success: true, message: '登录成功', user: { id: user.id, username: user.username } };
        } else {
            return { success: false, error: '用户名或密码错误' };
        }
    } catch (error) {
        console.error('登录时出错:', error);
        return { success: false, error: '数据库操作失败' };
    }
}

module.exports = {
    registerUser,
    loginUser
};
