const mysql = require('mysql2'); // 改为 mysql2

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '@Aa2257436167',
    port: 3306, // 改为数字
    database: 'myblog'
});

connection.connect()

function execSQL(sql,callback) {
connection.query(sql,callback);
}

module.exports = {
    execSQL
};