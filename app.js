var express = require('express');
var path = require('path');
var route = __dirname + '/public/';
//var promise = require('promise')
var flash = require('connect-flash');
var app = express();
var bodyParser = require('body-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var cookieParser = require('cookie-parser')
var ensureLoggedIn = require('connect-ensure-login')
var mysql = require('mysql');
var session = require('express-session');
var bcrypt = require('bcrypt');
var salt = bcrypt.genSaltSync();
var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1GxWRtJb89',
  database: 'kamra_db'
});
connection.connect()
app.use(express.static('public'));

passport.use(
  'local-login',
  new LocalStrategy({
      // by default, local strategy uses username and password, we will override with email
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) { // callback with email and password from our form
      console.log('local-login is called');
      connection.query("SELECT * FROM user WHERE username = ?", [username], function(err, rows) {
        if (err) {
          console.log('local-login is error');
          return done(err);
        }

        if (!rows.length) {
          console.log('local-login: No user found');
          return done(null, false, req.flash('loginMessage', 'No user found.')); // req.flash is the way to set flashdata using connect-flash
        }

        // if the user is found but the password is wrong
        //!bcrypt.compareSync(password, rows[0].password)
        if (!bcrypt.compareSync(password, rows[0].password)) {
          console.log('local-login: Wrong password');
          return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.')); // create the loginMessage and save it to session as flashdata
        }

        // all is well, return successful user
        console.log('local-login: successful');
        return done(null, rows[0]);
      });
    })
);

passport.use(
  'local-signup',
  new LocalStrategy({
      // by default, local strategy uses username and password, we will override with email
      passReqToCallback: true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) {
      console.log('signup is called');
      console.log(req.body.email);
      // find a user whose email is the same as the forms email
      // we are checking to see if the user trying to login already exists
      connection.query("SELECT * FROM user WHERE username = ?", [username], function(err, rows) {
        if (err) {
          console.log('signup is error');
          return done(err);
        }

        if (rows.length) {
          console.log('signup: user is taken');
          return done(null, false, req.flash('signupMessage', 'That username is already taken.'));
        } else {
          // if there is no user with that username
          // create the user
          var newUserMysql = {
            username: username,
            password: bcrypt.hashSync(password, salt), // use the generateHash function in our user model
          };

          var insertQuery = "INSERT INTO user ( username, password, firstname, lastname, email, address, phone) values (?,?,?,?,?,?,?)";

          connection.query(insertQuery, [newUserMysql.username, newUserMysql.password, req.body.first_name, req.body.last_name, req.body.email, req.body.address, req.body.phone], function(err, rows) {
            newUserMysql.id = rows.insertId;

            return done(null, newUserMysql);
          });
        }
      });
    })
);

passport.serializeUser(function(user, done) {
  done(null, JSON.stringify(user));
});

passport.deserializeUser(function(string, done) {
  done(null, JSON.parse(string));
});

app.use(cookieParser());
app.use(bodyParser());
app.use(session({
  secret: '1L0ve@y@mP3ny3t'
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());



app.post('/login',
  passport.authenticate('local-login', {
    failureRedirect: '/login',
    successRedirect: '/'
  }),
  function(req, res) {

  }
);

app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/login', // redirect to the secure profile section
    failureRedirect: '/signup' // redirect back to the signup page if there is an error
  }),
  function(req, res) {

  }
);

app.get('/dbtest', function(req, res) {
  var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1GxWRtJb89',
    database: 'kamra_db'
  })
  console.log('Connection initiating...')
  connection.query('SELECT * FROM  item', function(err, rows, fields) {
    if (err) throw err
    res.send(rows)
    console.log('Data sent')
  })
  connection.end()
  console.log('Connection ended')
})

app.get('/login', function(req, res) {
  res.sendFile(path.join(route + '/login.html'));
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/signup', function(req, res) {
  res.sendFile(path.join(route + '/signup.html'));
});

// app.get('/browse', function(req, res) {
//   res.sendFile(path.join(route + '/signup.html'));
// });

app.get('/secret', ensureLoggedIn.ensureLoggedIn('/login'), function(req, res) {
  res.send('Hello ' + req.user.username + '!')
})

app.get('/current_user', function(req, res) {
  res.send(req.user.username)
});

app.get('/browse*', function(req, res) {
  res.sendFile(path.join(route + '/browse.html'));
});

app.get('/search*', function(req, res) {
  res.sendFile(path.join(route + '/search.html'));
});

app.post('/search*', function(req, res) {
  //var q = "'" + req.body.q + "'";
  //console.log(req.body.q[0]);
  var sql_first = `
    SELECT i.item_name, i.description, GROUP_CONCAT(t.tag_name SEPARATOR ', ') AS tags
    FROM item i 
    INNER JOIN tagmap tm ON i.item_id = tm.item_id 
    INNER JOIN tag t ON tm.tag_id = t.tag_id
    INNER JOIN (`;
  
    var sql_mid = `
    SELECT item_id
    FROM tag tt
    INNER JOIN tagmap tmm ON tt.tag_id = tmm.tag_id
    WHERE tag_name LIKE `;
  
  var sql_end = `
    )tm2 ON i.item_id = tm2.item_id
    GROUP BY i.item_id`;
  //var query = [];
  for (var h in req.body.q){
    if(h >= 1){
      sql_mid = sql_mid + ` OR tag_name LIKE ` +mysql.escape(req.body.q[h]);
    }
    else{
      sql_mid = sql_mid+mysql.escape(req.body.q[h]);
    }
    
  }
  console.log(sql_mid);
  
  //console.log(query);
//   var sql_query = `
//     SELECT * 
//     FROM item i 
//     INNER JOIN tagmap tm ON i.item_id = tm.item_id 
//     INNER JOIN tag t ON tm.tag_id = t.tag_id 
//     WHERE t.tag_name LIKE 'film' OR t.tag_name LIKE 'nikon'`;
  var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1GxWRtJb89',
    database: 'kamra_db'
  });
  //console.log('Connection initiating...');
  connection.query(sql_first+sql_mid+sql_end, function(err, rows, fields) {
    if (err) throw err;
    console.log(rows);
    res.json(rows);
  })
  connection.end()

});

app.listen(8080, function() {
  console.log('Kamra app listening on port 8080!');
})