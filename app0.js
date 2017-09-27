// import modules
var express = require('express');
var app = express();
var path = require('path');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var realtime = require('./realtime'); //**** realtime realtime.js 파일로 연결하여 라우팅 ****/
var WebSocketServer = require('websocket').server;


// connect database
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/mongodb_tutorial',{ useMongoClient: true });
var db = mongoose.connection;
db.once("open",function () {
  console.log("DB connected!");
});
db.on("error",function (err) {
  console.log("DB ERROR :", err);
});

// model setting
var postSchema = mongoose.Schema({
  title: {type:String, required:true},
  body: {type:String, required:true},
  createdAt: {type:Date, default:Date.now},
  updatedAt: Date
});
var Post = mongoose.model('post',postSchema);
// view setting
app.set("view engine", 'ejs');

// set middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.use('/realtime', realtime);
// set routes
app.get('/posts', function(req,res){
  Post.find({}).sort('-createdAt').exec(function (err,posts) {
    if(err) return res.json({success:false, message:err});
    res.render("posts/index", {data:posts});
  });
}); // index
app.get('/posts/new', function(req,res){
  res.render("posts/new");
}); // new
app.post('/posts', function(req,res){
  console.log(req.body);
  Post.create(req.body.post,function (err,post) {
    if(err) return res.json({success:false, message:err});
    res.redirect('/posts');
  });
}); // create
app.get('/posts/:id', function(req,res){
  Post.findById(req.params.id, function (err,post) {
    if(err) return res.json({success:false, message:err});
    res.render("posts/show", {data:post});
  });
}); // show
app.get('/posts/:id/edit', function(req,res){
  Post.findById(req.params.id, function (err,post) {
    if(err) return res.json({success:false, message:err});
    res.render("posts/edit", {data:post});
  });
}); // edit
app.put('/posts/:id', function(req,res){
  req.body.post.updatedAt=Date.now();
  Post.findByIdAndUpdate(req.params.id, req.body.post, function (err,post) {
    if(err) return res.json({success:false, message:err});
    res.redirect('/posts/'+req.params.id);
  });
}); //update
app.delete('/posts/:id', function(req,res){
  Post.findByIdAndRemove(req.params.id, function (err,post) {
    if(err) return res.json({success:false, message:err});
    res.redirect('/posts');
  });
}); //destroy

// start server
app.listen(3001, function(){
  console.log('Server On!');
});

wsServer = new WebSocketServer({
    httpServer: app,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    var connection = request.accept(null, request.origin);
    console.log((new Date()) + ' Connection accepted.');
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            connection.sendUTF(message.utf8Data);
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});
