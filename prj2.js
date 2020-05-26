const express = require("express");
const app = express();
const PORT = 6000;
app.use('/prj2', express.static('public'));
const server = require('http').Server(app);
const io = require('socket.io')(server, { path: '/prj2/socket.io'});
const fs = require('fs');
const lg = '/home/choompol/prj2/prj2.log';

var users = [];

function join(id, nm) {
  fs.appendFileSync(lg, 'join '+nm+'\n');
  var x = -1;
  for(var i=0; i<users.length; i++) if(id===users[i].id) x = i;
  if(x>=0) users[x].name = nm;
  else users.push({"id":id, "name":nm, lead:false});
  //fs.appendFileSync(lg, 'users '+JSON.stringify(users)+'\n');
  sendall();
}
function leave(id) {
  fs.appendFileSync(lg, 'leave '+id+'\n');
  var x = -1;
  for(var i=0; i<users.length; i++) if(id===users[i].id) x = i;
  if(x>=0) users = users.filter((v)=>v.id===id? false : true);
  //fs.appendFileSync(lg, 'after 3 '+JSON.stringify(users)+'\n');
  sendall();
}
function sendall() {
  for(var i=0; i<users.length; i++) {
     io.to(users[i].id).emit('users', users);
  }
  //fs.appendFileSync(lg, 'users 2'+JSON.stringify(users)+'\n');
}
function request(id, key, val) {
  for(var i=0; i<users.length; i++) {
    if(users[i].id==id) execute(users[i], key, val);
  }
}

function execute(user, key, val) {
  if(user.lead) {
    if(key==='clear' && val==='all') {
       for(var i=0; i<users.length; i++) {
         users[i]['a'] = '';
         users[i]['q'] = '';
         users[i]['g'] = '';
       }
    } else {
       user[key] = val;
    }
  } else {
    user[key] = val;
  }
  sendall();
}

io.on('connection', function(sk) {
  fs.appendFileSync(lg, 'connect '+sk.id+'\n');
  sk.emit('chalenge', {cnt:0,skp:5,cur:0,nxt:0});
  sk.on('disconnect', function() {
      leave(sk.id);
  });
  sk.on('request', function(dt) {
    if(dt.startsWith('join ')) {
      join(sk.id, dt.substring(5));
    } else {
      var wds = dt.split(" ");
      if(wds.length>=2) request(sk.id, wds[0], wds[1]);
      fs.appendFileSync(lg, 'request '+wds.length+'\n');
    }
  });
  sk.on('chalenge', function(dt) {
    fs.appendFileSync(lg, 'chalenge '+JSON.stringify(dt)+'\n');
    if((dt.cur+dt.skp)===dt.nxt) {
      dt.cnt++;
      dt.cur = dt.nxt;
      if(dt.cnt>=3) {
        fs.appendFileSync(lg, 'success head: '+sk.id+'\n');
	for(var i=0; i<users.length; i++) 
	  if(users[i].id==sk.id) {
	    users[i].lead = true;
	    fs.appendFileSync(lg, "found lead: "+sk.id+'\n');
	  } else {
	    users[i].lead = false;
	  }
	sendall();
	dt.cnt = 0; dt.cur = 0; dt.nxt = 0;
      }
    } else {
      dt.cnt = 0; dt.cur = 0; dt.nxt = 0;
    }
    sk.emit('chalenge',dt);
  });
});

server.listen(PORT);

