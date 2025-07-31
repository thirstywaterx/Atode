const mysql = require('mysql2');
const config = require('../../config/config.js');

const pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    connectionLimit: 10
});

function execSQL(sql, params, callback) {
    // 如果只传了两个参数，说明第二个参数是callback
    if (typeof params === 'function') {
        callback = params;
        params = [];
    }
    
    pool.query(sql, params, callback);
}

// 添加Promise版本的SQL查询函数
function execSQLWithPromise(sql, params = []) {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (error, results) => {
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
    execSQLWithPromise
};