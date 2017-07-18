var express = require('express');
var app = express();
// load the mysql library
var mysql = require('promise-mysql');
var RedditAPI = require('./reddit');
var path = require('path');
var bodyParser = require('body-parser')

// create a connection to our Cloud9 server
var connection = mysql.createPool({
  host     : 'localhost',
  user     : 'root', // CHANGE THIS :)
  password : '123456',
  database: 'reddit',
  connectionLimit: 10
});
var myReddit = new RedditAPI(connection);

app.set('view engine', 'pug');

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json())

app.use('/files', express.static('static_files'));

app.get('/', function (req, res) {
  res.send('Hello World!');
});
app.get('/hello', function (req, res) {
  var name = req.query.name;
  res.send(`<h1>Hello ${name}!</h1>`);
});
app.get('/calculator/:operation', function (req, res) {

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

app.get('/posts', function (req, res) {

  myReddit.getAllPosts()
    .then( posts => {
      res.render('post-list', {posts: posts});
      // res.send(result);
    })
    .catch( err => {
      res.error(err);
    })

});

app.get('/new-post', function (req, res) {
  res.render('create-content');
  // res.sendFile(path.join(__dirname + '/views/newPost.html'));
});

app.post('/createPost', function (req, res) {

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

/* YOU DON'T HAVE TO CHANGE ANYTHING BELOW THIS LINE :) */

// Boilerplate code to start up the web server
var server = app.listen(process.env.PORT, process.env.IP, function () {
  console.log('Example app listening at http://localhost:3000', process.env.C9_HOSTNAME);
});
