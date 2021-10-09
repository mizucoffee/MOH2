window.addEventListener('load', () => {
    let msgbox = document.getElementById('msgs');
    let form = document.getElementById('form');
    let x = document.getElementById('x');
    let y = document.getElementById('y');
    let id = document.getElementById('id');
    let angle = document.getElementById('angle');
    let power = document.getElementById('power');

    let ws = new WebSocket('ws://' + window.location.host + '/websocket/1');

    ws.onopen = () => console.log('connection opened');
    ws.onclose = () => console.log('connection closed');
    ws.onmessage = m => {
      let li = document.createElement('li');
      li.textContent = m.data;
      console.log(m) // MessageEvent
      msgbox.insertBefore(li, msgbox.firstChild);
    }

    // sendMsg.addEventListener('click', () => sendMsg.value = '');

    form.addEventListener('submit', e => {
        e.preventDefault();

        var data = {
            x: x.value,
            y: y.value,
            id: id.value,
            angle: angle.value,
            power: power.value,
        }
        console.log(data)
        ws.send(JSON.stringify(data));
        // sendMsg.value = '';
    });
});