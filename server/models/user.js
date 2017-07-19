var bcrypt = require('bcrypt-as-promised');
var secureRandom = require('secure-random');

var HASH_ROUNDS = 10;

class User {
  constructor(conn) {
    this.conn = conn;
  }

  createUser(user) {
    /*
     first we have to hash the password. we will learn about hashing next week.
     the goal of hashing is to store a digested version of the password from which
     it is infeasible to recover the original password, but which can still be used
     to assess with great confidence whether a provided password is the correct one or not
     */
    return bcrypt.hash(user.password, HASH_ROUNDS)
      .then(hashedPassword => {
        return this.conn.query('INSERT INTO users (username,password, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())', [user.username, hashedPassword]);
      })
      .then(result => {
        return result.insertId;
      })
      .catch(error => {
        // Special error handling for duplicate entry
        if (error.code === 'ER_DUP_ENTRY') {
          throw new Error('A user with this username already exists');
        }
        else {
          throw error;
        }
      });
  }

  checkLogin(user, pass, cb) {
    this.conn.query('SELECT * FROM users WHERE username = ?', [user], function (err, result) {
      // check for errors, then...
      if (result.length === 0) {
        callback(new Error('username or password incorrect')); // in this case the user does not exists
      }
      else {
        var user = result[0];
        var actualHashedPassword = user.password;
        bcrypt.compare(pass, actualHashedPassword, function (err, result) {
          if (result === true) { // let's be extra safe here
            callback(null, user);
          }
          else {
            callback(new Error('username or password incorrect')); // in this case the password is wrong, but we reply with the same error
          }
        });
      }
    })
  }

  createSession(userId, callback) {
    var token = this.createSessionToken();
    this.conn.query('INSERT INTO sessions SET userId = ?, token = ?', [userId, token], function (err, result) {
      if (err) {
        callback(err);
      }
      else {
        callback(null, token); // this is the secret session token :)
      }
    })
  }
  
  createSessionToken() {
    return secureRandom.randomArray(100).map(code => code.toString(36)).join('');
  }
}

module.exports = User;