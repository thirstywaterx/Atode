const mysql = require('mysql2'); // 改为 mysql2

const connection = mysql.createConnection({
    host: 'YOUR_HOST', // 替换为你的数据库主机
    user: 'YOUR_USERNAME', // 替换为你的数据库用户名
    password: 'YOUR_PASSWORD', // 替换为你的数据库密码
    port: 3306, // 改为数字
    database: 'atode',
});

connection.connect((err) => {
    if (err) {
        console.error('数据库连接失败:', err);
        return;
    }
    console.log('数据库连接成功');
});

function execSQL(sql, params, callback) {
    // 如果只传了两个参数，说明第二个参数是callback
    if (typeof params === 'function') {
        callback = params;
        params = [];
    }
    
    connection.query(sql, params, callback);
}

// 添加Promise版本的SQL查询函数
function execSQLWithPromise(sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

module.exports = {
    execSQL,
    execSQLWithPromise,
    connection
};