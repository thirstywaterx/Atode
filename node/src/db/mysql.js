const mysql = require('mysql2'); // 改为 mysql2

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '@Aa2257436167',
    port: 3306, // 改为数字
    database: 'myblog'
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

module.exports = {
    execSQL
};