// 変数
var dropSound;
var mgr;

var threshold = 10.0;

var eraserState;
var erasers = [];
var myEraser;
var enemies;

// 配列
var motions = [];

// 1度
const degtorad = Math.PI / 180;
// axios.defaults.baseURL = "";

let myfont;
let ws; // WebSocket
let keshigomuId;
let initialKeshigoms;
let backImage;

// データのロード
function preload() {
  // しずくのサウンド
  backImage = loadImage('/img/desk.jpg');
  // dropSound = loadSound('droplet.mp3');
  // myfont = loadFont("https://fonts.gstatic.com/ea/notosansjapanese/v6/NotoSansJP-Thin.otf");  
}

// 全体の初期化（最初に一回だけ呼ばれる）
function setup() {
  // キャンバスをつくる
  createCanvas(windowWidth, windowHeight);

  mgr = new SceneManager();

  mgr.state = 'IDLE'
  mgr.wire();
  mgr.showScene(Start);
}

// 計算と表示
function draw() {
  mgr.draw();
}

function mousePressed() {
  mgr.handleEvent("mousePressed");
}

function keyPressed() {
  mgr.handleEvent("keyPressed");
}

function keshigomu(x, y, size, color) {
  w = size * 0.75;
  h = size;
  sleeveRatio = 0.65
  push();
  rectMode(CENTER);
  stroke(20);
  fill('white');
  rect(x, y, w, h, w / 4, w / 4, 0, 0);
  // rect(x, y, w, h);
  fill('gray');
  rect(x - w / 3, y + h * (1 - sleeveRatio) / 2, w / 3, h * sleeveRatio);
  fill('white');
  rect(x, y + h * (1 - sleeveRatio) / 2, w / 3, h * sleeveRatio);
  fill(color);
  rect(x + w / 3, y + h * (1 - sleeveRatio) / 2, w / 3, h * sleeveRatio);
  pop();
}

// =============================================================
// =                         BEGIN SCENES                      = 
// =============================================================

function Start() {
  var startButton;

  this.setup = function () {
    // ボタン
    startButton = new Clickable();
    startButton.locate(width / 2 - 100, height - 120);
    startButton.resize(200, 60);
    startButton.textSize = 40;
    startButton.onHover = function () {
      this.color = "#888888";
      this.textColor = "#FFFFFF";
    }
    startButton.onOutside = function () {
      this.color = "#EEEEEE";
      this.text = "Start";
      this.textColor = "#000000";
    }
    // startButton.onRelease = function (){
    //   try {
    //     if (!checkPermission()) requestPermission();
    //   } catch (e) {}
    //   mgr.showScene(Main);
    // }
    document.body.onclick = () => {
      try {
        if (!checkPermission()) requestPermission();
      } catch (e) {}
      this.sceneManager.showScene(Main);
      document.body.onclick = null
    }

    axios.post("https://keshigo.lit-kansai-mentors.com/start", getParams({
        x: random(-200, 200),
        y: random(-200, 200)
      }))
      .then(res => {
        keshigomuId = res.data.id
        initialKeshigoms = res.data.erasers
        console.log(keshigomuId)
        connectWebSocket()
      })
  }

  this.draw = function () {
    camera.position.x = 0;
    camera.position.y = 0;

    // textFont(myfont);
    background(backImage);
    textSize(70);
    textAlign(CENTER);
    fill('black');
    text("KESHI GO!", 0, 0);

    // translate(width / 2 -50, height / 2);
    // startButton.translate(width / 2 - 50, height / 2);
    camera.off();
    startButton.draw();
  }
}

function Main() {
  let center;
  let flick;

  let maxVelocity = 90;
  var deltaX = 0;
  var deltaY = 0;

  var reserveButton;

  this.setup = function () {


    // ボタン
    reserveButton = new Clickable();
    reserveButton.locate(width / 2 - 100, height - 120);
    reserveButton.resize(200, 60);
    reserveButton.textSize = 40;
    reserveButton.onHover = function () {
      this.color = "#888888";
      this.textColor = "#FFFFFF";
    }
    reserveButton.onOutside = function () {
      this.color = "#EEEEEE";
      this.text = "Reserve";
      this.textColor = "#000000";
    }
    reserveButton.onRelease = function () {
      // 予約ボタン押したときの処理
      snapReserve()
      eraserState = 'onReserved'
    }
  }

  this.enter = function () {
    // 敵キャラ読み込み
    initialKeshigoms; // 初期位置の配列
    console.log(initialKeshigoms);
    initialKeshigoms.forEach(element => {
      if (element.id != keshigomuId) {
        erasers.push(new Eraser(element.id, element.x, element.y));
      } else if (element.id == keshigomuId) {
        // 自キャラ生成
        myEraser = createSprite(parseInt(element.x), parseInt(element.y), 100, 100);
        myEraser.draw = function () {
          keshigomu(0, 0, 100, 'blue');
        }
        myEraser.hp = 3;
        myEraser.friction = 0.1;
      }
    });
    // for (let index = 0; index < 10; index++) {
    //   erasers.push(new Eraser(index, random(-width / 2, width / 2), random(-height / 2, height / 2)));
    // }

    // 敵キャラ生成
    enemies = new Group();
    erasers.forEach(element => {
      addEnemy(element);
    });

    center = createVector(0, 0);
    flick = createVector(0, 0);

    eraserState = 'onIdle';

    camera.position.x = myEraser.position.x;
    camera.position.y = myEraser.position.y;

    frameCount = 0;
  }

  this.draw = function () {
    // translate()
    // rotate(degtorad * window.degree)
    // 背景をぬりつぶす
    background(backImage);

    //   消しゴム状態管理
    switch (eraserState) {
      // 弾き待ち
      case 'onFlickReady':
        camera.position.x = myEraser.position.x;
        camera.position.y = myEraser.position.y;
        camera.on();
        drawSprites(enemies);
        drawSprite(myEraser);
        camera.off();
        textAlign(CENTER);
        textSize(70);
        text('FLICK!', width / 2, height/2 - 120);
        break;
        // 弾いた
      case 'onFlicked':
        enemies.displace(myEraser, enemyHit);
        camera.on();
        drawSprites(enemies);
        drawSprite(myEraser);
        // 方向の矢印表示
        push();
        strokeWeight(8);
        drawArrow(center, flick, 'black');
        pop();
        // 移動完了で状態移動
        if (myEraser.getSpeed() < 1) {
          eraserState = 'onMoved'
        }
        break;
        // 動き終わり カメラ移動
      case 'onMoved':
        console.log('onMoved', myEraser.position);
        camera.position.x = myEraser.position.x;
        camera.position.y = myEraser.position.y;
        camera.on();
        drawSprites(enemies);
        drawSprite(myEraser);
        eraserPosition(myEraser.position.x, myEraser.position.y)
        eraserState = 'onIdle';
        break;
        // 待機中
      case 'onIdle':
        myEraser.displace(enemies, getHit);
        camera.on();
        drawSprites(enemies);
        drawSprite(myEraser);
        camera.off();
        reserveButton.draw();
        break;
        // 予約中
      case 'onReserved':
        myEraser.displace(enemies, getHit);
        camera.on();
        drawSprites(enemies);
        drawSprite(myEraser);
        camera.off();
        textAlign(CENTER);
        textSize(30);
        text('相手のターン終了待ち', width / 2, height - 120);
        break;
      default:
        break;
    }

    camera.off();
    push();
    fill('red');
    for (let i = 0; i < myEraser.hp; i++) {
      let x = width / 2 - 60 + 60 * i;
      circle(x, 40, 40);
    }
    pop();

    console.log(accelerationX, accelerationY)
    if (frameCount < 60) {
      camera.off();
      push();
      textSize(70);
      textAlign(CENTER);
      text('Game Start', width / 2, height / 2);
      pop();
    }
  }

  function setFlick(x, y) {
    center.set(myEraser.position.x, myEraser.position.y);
    flick.set(x, y);
    eraserSnap(x, y);
    eraserState = 'onFlicked'
    myEraser.velocity.x = x;
    myEraser.velocity.y = y;
  }

  // 衝突判定 送信
  // WS /connect
  function enemyHit(enemy, myEraser) {
    let speed = myEraser.getSpeed();
    let angle = myEraser.getDirection();
    enemy.setSpeed(speed, enemy.getDirection());
    camera.position.x = myEraser.position.x;
        camera.position.y = myEraser.position.y;
    enemy.hp -= 1;
    if (enemy.hp <= 0) {
      enemy.remove();
    }
  }

  function getHit(myEraser, enemy) {
    let speed = enemy.getSpeed();
    let degree = enemy.getDirection();
    myEraser.setSpeed(speed, myEraser.getDirection());
    myEraser.hp -= 1;
    if (myEraser.hp <= 0) {
      myEraser.remove();

      mgr.showScene(Main);
    }
  }

  // デバッグ用
  // マウスクリックでベクトル決定
  this.mousePressed = function () {
    switch (eraserState) {
      case 'onFlickReady':
        setFlick(random(-maxVelocity / 2, maxVelocity / 2), random(-maxVelocity, maxVelocity));
        break;
        // case 'onMoved':
      case 'onReserved':
        // let vec = createVector(-enemies[i].position.x + myEraser.position.x, -enemies[i].position.y + myEraser.position.y);
        // detectEnemyMove(1, random(maxVelocity), degrees(vec.heading()).toFixed(2));
        // myEraser.hp -= 1;
        // if (myEraser.hp <= 0) {
        //   myEraser.remove();
        //   mgr.showScene(Main);
        // }
        // detectEnemyMove(1, random(maxVelocity), random(360));
        break;
      default:
        break;
    }
  }

  // 加速度からベクトル決定
  this.deviceMoved = function () {
    // deviceStopped
    let thres = 10.0;
    if (abs(accelerationX) < thres & abs(accelerationY) < thres) {
      // text('deviceStopped'+x+', '+y, 0, 200);
      if (eraserState == 'onFlickReady') {
        setFlick(x, y);
      }
    } else if (abs(pAccelerationX) < abs(accelerationX) & abs(pAccelerationY) < abs(accelerationY)) {
      x = map(accelerationX, -90, 90, -maxVelocity, maxVelocity);
      y = map(accelerationY, -90, 90, maxVelocity, -maxVelocity);
    }
  }

  this.keyPressed = function () {
    requestId = floor(random(0, erasers.length));
    angle = random(0, 360);
    power = random(300);

    let index = erasers.findIndex(eraser => eraser.id == requestId);
    if (index != -1) {
      erasers[index].move(angle, power);
    }
  }

  // draw an arrow for a vector at a given base position
  function drawArrow(base, vec, myColor) {
    push();
    stroke(myColor);
    strokeWeight(3);
    fill(myColor);
    translate(base.x, base.y);
    line(0, 0, vec.x, vec.y);
    rotate(vec.heading());
    let arrowSize = 7;
    translate(vec.mag() - arrowSize, 0);
    triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
    pop();
  }
}

class Eraser {
  // 初期化
  constructor(id, x, y) {
    this.id = id;
    // 位置
    this.positionX = x;
    this.positionY = y;
    // 大きさ
    this.size = 80;
    // 色
    this.color = color(random(255), random(255), 20, 200);
    // ライフ
    this.hp = 3;
  }

  // 表示
  // draw() {
  //   keshigomu(this.positionX, this.positionY, this.size, this.color);
  // }

  // move(angle, power) {
  //   this.positionX += power * cos(angle);
  //   this.positionY += power * sin(angle);
  // }
}

// 衝突判定 受信
function detectEnemyMove(id, x, y) {
  console.log('detectEnemyMove');
  enemies.forEach(enemy => {
    if (enemy.id == id) {
      enemy.velocity.x = x;
      enemy.velocity.y = y;
    }
  });
}

// 予約が回ってきたとき
function setFlickReady() {
  console.log('setFlickReady');
  eraserState = 'onFlickReady';
}

function addEnemy(newEraser) {
  console.log('addEnemy');
  var enemy = createSprite(newEraser.positionX, newEraser.positionY, newEraser.size * 0.75, newEraser.size);
  enemy.id = newEraser.id;
  enemy.draw = function () {
    keshigomu(0, 0, newEraser.size, newEraser.color);
    textAlign(CENTER);
    // text(this.hp, 0, 0);
  }
  enemy.friction = 0.1;
  enemies.add(enemy);
}

function removeEnemy(id) {
  console.log('removeEnemy');
  enemies.forEach(enemy => {
    if (enemy.id == id) {
      enemy.remove();
    }
  });
}

// 以下API定義

function getParams(json) {
  const params = new URLSearchParams();
  for (const property in json) {
    params.append(property, json[property]);
  }
  return params;
}

async function eraserSnap(x, y) {
  const result = await axios.post(
    "https://keshigo.lit-kansai-mentors.com/eraser/snap",
    getParams({
      id: keshigomuId,
      x,
      y
    })
  );
  return result.data;
}

async function snapReserve() {
  const result = await axios.post(
    "https://keshigo.lit-kansai-mentors.com/snap/reserve",
    getParams({
      id: keshigomuId
    })
  );
  return result.data;
}

async function eraserPosition(x, y) {
  const result = await axios.post(
    "https://keshigo.lit-kansai-mentors.com/eraser/position",
    getParams({
      id: keshigomuId,
      x,
      y
    })
  );
  return result.data;
}

function connectWebSocket() {
  ws = new WebSocket(`wss://keshigo.lit-kansai-mentors.com/websocket/${keshigomuId}`);

  ws.onopen = () => console.log("connection opened");
  ws.onclose = () => console.log("connection closed");
  ws.onmessage = (m) => {
    console.log("[SOCKET] " + m.data)
    const data = JSON.parse(m.data)
    switch (data.event) {
      case "snap":
        if (data.id == keshigomuId) break;
        // 他プレイヤーが弾いた
        detectEnemyMove(data.id, data.x, data.y);
        break;
      case "turn":
        // 自ターンが来た
        if (data.id == keshigomuId) {
          setFlickReady();
        }
        break;
      case "new":
        // 新しい消しゴムが増えた
        // enemy追加
        let newEraser = new Eraser(data.id, data.x, data.y);
        erasers.push(newEraser);
        addEnemy(newEraser);
        break;
      case "remove":
        // 消しゴムが消えた
        // enemy追加
        removeEnemy(data.id);
        break;
    }
  };
}