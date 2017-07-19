var mysql = require('promise-mysql');

var connection = mysql.createPool({
  host     : 'localhost',
  user     : 'root',
  password : '123456',
  database: 'reddit',
  connectionLimit: 10
});

module.exports = {connection};