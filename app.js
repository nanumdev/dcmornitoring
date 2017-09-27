// import modules
var express = require('express');
var app = express();
var path = require('path');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var realtime = require('./realtime'); //**** realtime realtime.js 파일로 연결하여 라우팅 ****/
var WebSocketServer = require('websocket').server;
var http = require('http');
//var endpoint=null;

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
app.listen(3000, function(){
  console.log('Server On!');
});

var server = http.createServer(function (req, res) {
  console.log('Received request for ' + req.url);
  res.writeHead(404);
  res.end();
});

server.listen(3001, function () {
  console.log('Server is listening on port 3001');
});


wsServer = new WebSocketServer({
  httpServer: server,

  autoAcceptConnections: false
});

var connections = {};
var connectionIDCounter = 0;
var numOfConnections = 0;
wsServer.on('request', function (request) {
  var connection = request.accept(null, request.origin);
  // Store a reference to the connection using an incrementing ID
     connection.id = connectionIDCounter ++;
     connections[connection.id] = connection;
  // Now you can access the connection with connections[id] and find out
  // the id for a connection with connection.id
  console.log((new Date()) + ' Connection ID ' + connection.id + ' accepted.');

/*
  if(endpoint===null){
    endpoint=connection;
  }
*/

  console.log('connection : ' + connection  + request.origin + request.url + request.id);
  connection.on('message', function (message) {
    if (message.type === 'utf8') {
      console.log('Received message: ' + message.utf8Data);
      //endpoint.sendUTF(message.utf8Data);
      broadcast(message.utf8Data);
    }
    else if (message.type === 'binary') {
      //endpoint.sendBytes(message.binaryData);
    }

    connection.on('close', function (reasonCode, description) {
      console.log('Peer ' + connection.remoteAddress + ' disconnected.'+"The connection ID: " + connection.id+"/"+numOfConnections);
      delete connections[connection.id];
    });
  });
});

function broadcast(data) {
    numOfConnections = 0;
    Object.keys(connections).forEach(function(key) {
        var connection = connections[key];
        if (connection.connected) {
            connection.send(data);
            numOfConnections++;
        }
    });
}

// Send a message to a connection by its connectionID
function sendToConnectionId(connectionID, data) {
    var connection = connections[connectionID];
    if (connection && connection.connected) {
        connection.send(data);
    }
}
