var express = require('express');
var app = express();
var request = require('request');
var pubnub = require('pubnub').init({
  publish_key: process.env.OPEN_DOOR_PUB_KEY,
  subscribe_key: process.env.OPEN_DOOR_SUB_KEY
});

var host = process.env.OPENSHIFT_APP_DNS ? ("https://" + process.env.OPENSHIFT_APP_DNS + ":" + process.env.OPENSHIFT_PORT) : "http://localhost:3000";
var passport = require('passport');
var FacebookStrategy = require('passport-facebook').Strategy;

passport.use(new FacebookStrategy({
    clientID: process.env.OPEN_DOOR_FB_ID,
    clientSecret: process.env.OPEN_DOOR_FB_SECRET,
    callbackURL: host + "/open_door"
  },
  function(accessToken, refreshToken, profile, done) {
    request.get("https://graph.facebook.com/me/groups?access_token=" + accessToken, function(err, response, body) {
      body = typeof(body) === 'object' ? body : JSON.parse(body);
      var test = body.data.filter(function(e) {
        return e.id === process.env.OPEN_DOOR_FB_GROUP_ID;
      })[0];

      if (!test) return done("not allowed");
      return done(null, profile);
    });
  }
));

passport.serializeUser(function(user, done) {
  return done(null, user);
});

passport.deserializeUser(function(user, done) {
  return done(null, user);
});

app.use(passport.initialize());
app.use(passport.session());
// app.get('/auth/facebook', passport.authenticate('facebook', { scope: 'user_groups' }));
// app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/open_door', failureRedirect: '/failure.html' }));

app.use(express.static(__dirname + '/public'));

var ip = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1"
var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || process.env.VCAP_APP_PORT || 3000;
app.listen(port, ip, function() {
  console.log("app listens on " + ip + ":" + port);
});

app.get('/login', function(req, res) {
  res.send("get out.");
});

app.get('/open_door', passport.authenticate('facebook', { scope: 'user_groups' }), function(req, res) {
  return pubnub.publish({
    channel: "open_the_door",
    message: { hello: 'hello' },
    callback: function() {
      return res.redirect('/success.html');
    }
  });
});