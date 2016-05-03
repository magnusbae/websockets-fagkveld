var server = require('http').createServer()
    , url = require('url')
    , WebSocketServer = require('ws').Server
    , wss = new WebSocketServer({ server: server })
    , express = require('express')
    , app = express()
    , port = process.env.PORT || 4080;

var messages = [];

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

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);
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
        } else {
            messages.push(message);
            wss.broadcast(message);
        }
    });
});

server.on('request', app);

server.listen(port, function () { console.log('Listening on ' + server.address().port) });