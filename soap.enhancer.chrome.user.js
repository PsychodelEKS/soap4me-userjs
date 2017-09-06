// ==UserScript==
// @name Soap enhancer
// @author PsychodelEKS
// @description Разные улучшалки soap4.me
// @ujs:category site: enhancements
// @ujs:published 2015-02-01 23:59:00
// @ujs:modified 2017-09-06 13:31:15
// @ujs:documentation n/a
// @ujs:https://github.com/PsychodelEKS/soap4me-userjs/
// @include http://*soap4.me/*
// @include https://*soap4.me/*
// @version 0.1.3
// @updateURL https://github.com/PsychodelEKS/soap4me-userjs/raw/master/soap.enhancer.chrome.user.js
// @run-at document-end
// ==/UserScript==

// version: 0.0.28 (2015-02-05 02:44:17)
//  - отмечаем эпизод просмотренным после проигрывания 90%
// version: 0.0.29 (2015-02-05 02:54:23)
//  - отмечаем эпизод просмотренным после проигрывания 95%
// version: 0.0.32 (2015-02-18 06:28:10)
//  - фикс бага с пропаданием скролла
// version: 0.0.33 (2015-02-19 03:31:39)
//  - оптимизация автозакрытия
// version: 0.0.36 (2015-03-02 18:46:00)
//  - фикс работы вкладок в сериале (расписание/рецензии и т.д.)
// version: 0.1.0 (2015-05-16 00:35:19)
//  - автопроигрывание следующей серии
// version: 0.1.1 (2015-05-18 01:49:58)
//  - показываем галку автоплея только если есть чего играть
// version: 0.1.2 (2017-09-06 12:37:58)
//  - переезд на гитхаб

(function (window, undefined) {
    var firstRun = true;

    // для открытия html5 плеера по-умолчанию
    // window.matchProto = String.prototype.match;
    // String.prototype.match = function (param) {
    //     if (param == 'inettvbrowser') {
    //         return true;
    //     }
    //     return window.matchProto.apply(this, arguments);
    // };

    // для автозакрытия плеера после окончания серии
    window.addEventProto = HTMLDivElement.prototype.addEventListener;
    window.playerClosed = 0;
    window.customEventsInProgress = false;

    console.log(typeof PlayerjsEvents);

    return true;

    HTMLDivElement.prototype.addEventListener = function(event, callback, useCapture) {
        if (!window.customEventsInProgress && typeof Uppod != 'undefined' && event == 'exitfullscreen') {
            // чтобы изнутри устанавливать обработчики событий exitfullscreen
            window.customEventsInProgress = true;

            // дефолтное значение переменной
            cache['html5_player_fullscreen'] = false;

            if (firstRun) {
                firstRun = false;
                // дефолтное значение переменной
                cache['html5_player_go_fullscreen'] = false;
                cache['html5_player_autoplay']      = false;
            }

            if ($('#html5').closest('.ep').next().find('div.play.pointer').length) {
                $('#html5video').after($("<div class='right link'><input type='checkbox' value='1' id='autoplayNext' style='margin-right: 5px;' /><label for='aputoPlayNext'>автопроигрывание</label></div>"));
                if (cache['html5_player_autoplay']) {
                    $('#autoplayNext').attr('checked', 'checked');
                }
            }

            // автоматическое проигрывание после открытия окна
            setTimeout(function(){ cache['html5_player'].Play(); }, 250);

            // проверяем каждые 5 секунд, если просмотрено от 90% эпизода - отмечаем просмотренным
            cache['html5_player_check_interval'] = setInterval(function(){
                if (cache['html5_player'].Played() >= 95) {
                    clearInterval(cache['html5_player_check_interval']);

                    // отмечаем просмотренным эпизод
                    $('#html5').closest('.ep').find('.watched div[data\\:watched="0"]').trigger('click');
                }
            }, 5000);

            // проверяем каждые 500 мс секунд, что плеер загрузил видео и проигрывает его
            cache['html5_player_fullscreen_check_interval'] = setInterval(function(){
                if (cache['html5_player'].CurrentTime() > 0) {
                    // если нужно - включим фуллскрин
                    if (cache['html5_player_go_fullscreen']) {
                        cache['html5_player_go_fullscreen'] = false;

                        cache['html5_player'].Full();
                    }

                    clearInterval(cache['html5_player_fullscreen_check_interval']);
                }
            }, 500);

            // автоматическое закрытие после окончания проигрывания
            this.addEventListener('end', function(){
                // ended вызывается 2 раза почему-то
                if (window.playerClosed == 0) {
                    var nextPlayButton     = $('#html5').closest('.ep').next().find('div.play.pointer');
                    var nextPlayFullscreen = false;

                    if (cache['html5_player_fullscreen']) {
                        // выходим из полноэкранного
                        cache['html5_player'].Full();

                        // запоминаем, что надо вернуться в полный экран
                        nextPlayFullscreen = true;
                    }

                    // закрываем плеер
                    setTimeout(function () {
                        // проверяем настройку автопроигрывания
                        cache['html5_player_autoplay'] = $('#autoplayNext').is(':checked');

                        $('#player .close').trigger('click');

                        // запускаем следующую серию
                        if (nextPlayButton && cache['html5_player_autoplay']) {
                            if (nextPlayFullscreen) {
                                cache['html5_player_go_fullscreen'] = true;
                            }
                            setTimeout(function () {
                                nextPlayButton.trigger('click');
                            }, 250);
                        }
                    }, 250);

                    window.playerClosed++;
                } else {
                    window.playerClosed = 0;
                }
            }, false);

            // для корректной работы автозакрытия
            this.addEventListener('fullscreen', function(){
                cache['html5_player_fullscreen'] = true;
            }, false);

            this.addEventListener('exitfullscreen', function(){
                cache['html5_player_fullscreen'] = false;
            }, false);

            window.customEventsInProgress = false;
        }

        return window.addEventProto.apply(this, arguments);
    };
})(window);