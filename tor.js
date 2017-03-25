var express = require('express');
var app = express();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var cookieParser = require('cookie-parser')
var bodyParser = require('body-parser')
var session = require('express-session')
var ensureLoggedIn = require('connect-ensure-login')

for(var x in ensureLoggedIn)
console.log(ensureLoggedIn[x]+'');



var USERNAME = 'tor';
var PASSWORD = 'tor';

passport.use(new LocalStrategy(
  function(username, password, done) {
    if(username===USERNAME && password===PASSWORD)
      return done(null,username);
    else if(username===USERNAME)
      return done(null,false,{ message: 'Incorrect password.' });
    else  
      return done(null, false, { message: 'Incorrect username.' });
  }
));

passport.serializeUser(function(user, done) {
  done(null, JSON.stringify(user));
});

passport.deserializeUser(function(string, done) {
  done(null,JSON.parse(string));
});

app.use(cookieParser());
app.use(bodyParser());
app.use(session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());



app.post('/login',
  passport.authenticate('local', { successRedirect: '/', failureRedirect: '/login'})
);

app.get('/login',function(req, res){
  res.send('<html><body><form method="post" action="/login"><input name="username"><input name="password"><input type="submit"></form></body></html>')
});
app.get('/logout',
  function(req, res){
    req.logout();
    res.redirect('/login');
  });

app.get('/',ensureLoggedIn.ensureLoggedIn('/login'), function (req, res) {
  res.send('Hello World!')
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})