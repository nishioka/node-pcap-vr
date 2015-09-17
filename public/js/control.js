//(function() {
    'use strict';

    var $window;
    var stageW;
    var stageH;

    var isMotion;

    var socket = io.connect('http://' + location.hostname + ':3000');

    /**
     * @param event
     */
    function deviceorientationHandler(event) {
        //ジャイロセンサー情報取得
        var html = '';
        html += 'X回転 : ' + event.beta + '<br>';
        html += 'Y回転 : ' + event.gamma + '<br>';
        html += 'Z回転 : ' + event.alpha;
        $('#gyro').html(html);
        socket.emit('sensor', {
            gyro: {
                x: event.beta,
                y: event.gamma,
                z: event.alpha
            }
        });
    }

    // 加速度が変化
    function devicemotionHandler(event) {
        if(isMotion) return;
        // 加速度
        var html = '';
        html += 'X方向 : ' + event.acceleration.x + '<br>';
        html += 'Y方向 : ' + event.acceleration.y + '<br>';
        html += 'Z方向 : ' + event.acceleration.z;
        $('#acceleration').html(html);
        socket.emit('sensor', {
            acceleration: {
                x: event.acceleration.x,
                y: event.acceleration.y,
                z: event.acceleration.z
            }
        });
    }

    function resizeHandler(event) {
        stageW = $window.width();
        stageH = $window.height();
    }

    socket.on('connect', function() {
        window.addEventListener('deviceorientation', deviceorientationHandler);


        $window = $(window);

        isMotion = false;

        $(window).on('resize', resizeHandler);
        resizeHandler();

        // DeviceMotion Event
        window.addEventListener('devicemotion', devicemotionHandler);
    });
//})();