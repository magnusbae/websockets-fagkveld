var server = require('http').createServer()
    , url = require('url')
    , WebSocketServer = require('ws').Server
    , wss = new WebSocketServer({ server: server })
    , express = require('express')
    , app = express()
    , port = process.env.PORT || 4080;

var uuid = require('node-uuid');

var currentIndex = 0;

var messages = [];

var currentToken = null;
var issued = new Date().getMilliseconds();
var valid = 1000; //ms

app.use(express.static('public'));

wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if(client.webClient){
            client.send(data);
        }
    });
};

wss.forwardCommand = function forwardCommand(data) {
    wss.clients.forEach(function each(client) {
        if(client.legoRobot){
            client.send(data);
        }
    });
};

wss.sendToken = function (client) {
    if(client.tokenRing){
        currentToken = uuid.v4();
        console.log('sending token ' + currentToken);
        client.send(JSON.stringify({
            token: currentToken,
            issued: issued,
            valid: valid
        }));
    }
};


setInterval(function () {
    console.log('token interval');
    if(wss.clients.length > 0){
        console.log('preparing to send token');
        if (currentIndex >= wss.clients.length){
            currentIndex = 0;
        }
        wss.sendToken(wss.clients[currentIndex++]);
    }
}, valid);

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
        try{
            var parsed = JSON.parse(message);
            if(parsed.hasOwnProperty('register')){
                switch (parsed.register){
                    case 'webClient':
                        ws.webClient = true;
                        if(messages.size > 0){
                            ws.send(JSON.stringify({ messages: messages }));
                        }
                        break;
                    case 'legoRobot':
                        ws.legoRobot = true;
                        break;
                }
            }else if(parsed.hasOwnProperty('command')){
                wss.forwardCommand(message);
            } else if(parsed.hasOwnProperty('supportsProtocol')){
                if(parsed.supportsProtocol === "token-ring"){
                    console.log("registered new token ring client");
                    ws.tokenRing = true;
                    ws.send('ok');
                }
            } else if(parsed.hasOwnProperty("token")) {
                var time = new Date().getMilliseconds();
                if(time < issued + valid && currentToken === parsed.token){
                    console.log("token good");
                    messages.push({data: parsed.message});
                    wss.broadcast(JSON.stringify({data: parsed.message}));
                    ws.send('message received');
                }else{
                    console.log("token bad");
                    ws.send(JSON.stringify({error: "token not valid"}));
                }
            }else {
                messages.push(message);
                wss.broadcast(message);
            }
        }catch (e){
            ws.send("stop sending crap! Stringify your JSON")
        }

        ws.keepAlive = setTimeout(function () {
            try{
                ws.send('ping', function (err) {
                    if(err){
                        clearInterval(ws.keepAlive)
                    }
                });
            }catch (e) {
                clearInterval(ws.keepAlive);
            }
        }, 20000);

    });
});

server.on('request', app);

server.listen(port, function () { console.log('Listening on ' + server.address().port) });