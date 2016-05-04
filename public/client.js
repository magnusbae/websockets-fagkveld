var body = document.body;
var ws = new WebSocket("ws://" + location.host);


function appendHtml(el, str) {
    var div = document.createElement('div');
    div.innerHTML = str;
    while (div.children.length > 0) {
        el.appendChild(div.children[0]);
    }
}


ws.onmessage = function (event) {
    if(event.data !== "ping"){
        console.log(event);
        var message = JSON.parse(event.data);

        appendHtml(body, '<span>' + message.data + '<br/></span>');    
    }
};

ws.onopen = function () {
  ws.send(JSON.stringify({
      register: 'webClient'
  }));
};

