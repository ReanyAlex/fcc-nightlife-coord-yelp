const LocalStrategy   = require('passport-local'),
      middleware      = require("./middleware")
      bodyParser      = require("body-parser"),
      passport        = require('passport'),
      mongoose        = require("mongoose"),
      express         = require('express'),
      fetch           = require('node-fetch'),
      yelp            = require('yelp-fusion');
      app             = express();

if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage('./scratch');
}

const CLIENTID = "6mjwmuUZ48CUAUV4bmQXPA";
const CLIENTSECRET = "y3236RN06HgBYmjIUzGYTVH8cZGxLHv7lGxAUt1f7m1yQ78kpaDHkO5h0yBTGXub"

const User = require("./models/user")
const Venues = require("./models/venues")



//======================
//PASSPORT
app.use(require("express-session")({
  secret: "I have fun with this",
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
//=========================
//MONGOOSE DB
var url = process.env.DATABASEURLTD || "mongodb://localhost/nightlife-coord"
mongoose.connect(url);
//===============
//Set up
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs")
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(function(req, res, next){
  res.locals.currentUser = req.user;
  next();
});
//========================
//Routes

//Index
app.get("/", function(res,req){
  let venues = []

  Venues.find({},function(err,allVenues){
    venues = allVenues
  })


  searchData = {
    term:'bars',
    location: localStorage.getItem('location')? localStorage.getItem('location') : 'san francisco, ca'
  }

  if (res.query.location !== undefined)  {

    localStorage.setItem('location', JSON.stringify(res.query.location))

    searchData = {
      term:'bars',
      location: res.query.location
    }
  }

  yelp.accessToken(CLIENTID, CLIENTSECRET).then(response => {
    const client = yelp.client(response.jsonBody.access_token);

    client.search(searchData)
    .then(response => {
      yelpResults = response.jsonBody.businesses;
      req.render('index', {yelpResults: yelpResults, venues: venues})
    });
  })
  .catch(e => {
    console.log(e);
  });
})

//Add venue
app.post('/going', middleware.isLoggedIn, function(req,res) {

  let going = {
    id: req.user._id,
    username: req.user.username
  }

  venueData={
    name: req.body.venue,
    going: going
  }

  Venues.find({name: req.body.venue},function(err, venue){
    if (venue.length === 0) {
      Venues.create(venueData)
    } else {
      let userArray = []

      venue[0].going.forEach(function(user) {
        userArray.push(user.username);
      })
      if (!userArray.includes(req.user.username)) {
        updateGoing = [...venue[0].going, going]

        Venues.findOneAndUpdate({name: req.body.venue}, {going: updateGoing}, function(err, updateVenue) {
          if (err) {  console.log(err)}
        })
      }

    }
  })
  res.redirect("/")
})


//Remove venue
app.post('/cancel', middleware.isLoggedIn, function(req,res) {

  Venues.find({name: req.body.venue},function(err, venue){
    if (venue.length !== 0) {
      let userArray = []

      venue[0].going.forEach(function(user) {
        userArray.push(user.username);
      })

      let arrayIndex = userArray.indexOf(req.user.username)
      if (arrayIndex !== -1) {
        venue[0].going.splice(arrayIndex,1);
        Venues.findOneAndUpdate({name: req.body.venue}, {going: venue[0].going}, function(err, updateVenue) {
          if (err) {  console.log(err)}
        })
      }
    }
  })
  res.redirect("/")
})

//Auth Routes
app.get('/register', function(req, res) {
  res.render("register");
});
//sign up logic
app.post("/register", function(req, res) {
  var newUser = new User({username: req.body.username});
  User.register(newUser, req.body.password, function(err, user) {
    if (err) {
      return res.redirect("/")
    }
    passport.authenticate("local")(req, res, function() {
      res.redirect("/");
    })
  })
});

//login routes
app.get('/login', function(req, res) {
  res.render("login");
});
//using passport middleware
app.post("/login", passport.authenticate("local",
  {
    successRedirect: "/",
    failureRedirect: "/login"
  }), function(req, res) {
});

//logout route
app.get("/logout", function(req, res) {
  req.logout()
  res.redirect("/");
})

app.listen(process.env.PORT || 3000, process.env.IP, function() {
  console.log('Night Life app!')
});
