let express = require('express');
let path = require('path');

let _ = require('lodash');
let bodyParser = require('body-parser');
let cookieParser	= require("cookie-parser");

let {connection} = require('./db/mysql');
let RedditAPI = require('./models/reddit');
let User = require('./models/user');
let myReddit = new RedditAPI(connection);
let user = new User(connection);

let app = express();
let port = process.env.PORT || 3000;

let serverFolder = path.normalize(__dirname);


/** Middleware & config **/

// Cookie parser should be above session
app.use(cookieParser());

// Adding the middleware to our express stack. This should be AFTER the cookieParser middleware
app.use(checkLoginToken);

// The middleware
function checkLoginToken(request, response, next) {
  // check if there's a SESSION cookie...
  if (request.cookies.SESSION) {
    RedditAPI.getUserFromSession(request.cookies.SESSION, function(err, user) {
      // if we get back a user object, set it on the request. From now on, this request looks like it was made by this user as far as the rest of the code is concerned
      if (user) {
        request.loggedInUser = user;
      }
      next();
    });
  }
  else {
    // if no SESSION cookie, move forward
    next();
  }
}

app.set('view engine', 'pug');

app.set('views', path.join(serverFolder, '/views'));

app.use(bodyParser.json());

app.use(express["static"](path.join(serverFolder, 'public')));

// Favicon
app.use(favicon(path.join(serverFolder, "public", "favicon.ico")));




/* Routes */

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/calculator/:operation', (req, res) => {

  var resource = req.params.operation;
  var num1 = req.query.num1;
  var num2 = req.query.num2;
  var answer;

  switch(resource){
    case 'add':
      answer = parseInt(num1)+parseInt(num2);
      break;

    case 'multiply':
      answer = num1*num2;
  }

  res.send({
    operation: resource,
    firstOperand: num1,
    secondOperand: num2,
    solution: answer
  });
});

app.get('/posts', (req, res) => {

  myReddit.getAllPosts()
    .then( posts => {
      res.render('post-list', {posts: posts});
      // res.send(result);
    })
    .catch( err => {
      res.error(err);
    })

});

app.get('/new-post', (req, res) => {
  res.render('create-content');
  // res.sendFile(path.join(__dirname + '/views/newPost.html'));
});

app.post('/createPost', bodyParser.urlencoded({ extended: false }), (req, res) => {

  myReddit.createPost({
    title: req.body.title,
    url: req.body.url,
    userId: 1,
    subredditId: 1
  }).then( result => {
    res.redirect('/posts');
  }).catch( err => {
    res.status(500).send(err);
  })

});

app.patch('/posts/:id', (req, res) => {

  var id = req.params.id;
  var body = _.pick(req.body, ['title', 'url']);

});

app.post('/login', function(request, response) {
  user.checkLogin(request.body.username, request.body.password, function(err, user) {
    if (err) {
      response.status(401).send(err.message);
    }
    else {
      // password is OK!
      // we have to create a token and send it to the user in his cookies, then add it to our sessions table!
      user.createSession(user.id, function(err, token) {
        if (err) {
          response.status(500).send('an error occurred. please try again later!');
        }
        else {
          response.cookie('SESSION', token); // the secret token is now in the user's cookies!
          response.redirect('/login');
        }
      });
    }
  });
});

/* YOU DON'T HAVE TO CHANGE ANYTHING BELOW THIS LINE :) */

// Boilerplate code to start up the web server
var server = app.listen(port, () => {
  console.log('serverFolder', serverFolder)
  console.log(`Example app listening at http://localhost:${port}`, process.env.C9_HOSTNAME);
});
