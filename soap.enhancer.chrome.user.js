// ==UserScript==
// @name Soap enhancer
// @author PsychodelEKS
// @description Разные улучшалки soap4.me
// @ujs:category site: enhancements
// @ujs:published 2015-02-01 23:59:00
// @ujs:modified 2017-09-06 18:49:03
// @ujs:documentation n/a
// @ujs:https://github.com/PsychodelEKS/soap4me-userjs/
// @include http://*soap4.me/*
// @include https://*soap4.me/*
// @version 0.2.1
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
// version: 0.2 (2017-09-06 18:46:28)
//  - базовая версия под новый плеер



// js player api documentation
// http://playerjs.com/docs/ru=api



function exists(variable) {
    return typeof(variable) != 'undefined';
}

// var dbgConsole = window.console;
var dbgConsole = false;

var cl = function (data) {
    if (dbgConsole) {
        dbgConsole.log(data);
    }
};

var cd = function (data) {
    if (dbgConsole) {
        dbgConsole.dir(data);
    }
};

var cj = function (data) {
    cl("\n"+JSON.stringify(data, null, 4));
};

var cg = function (name) {
    if (dbgConsole) {
        dbgConsole.group(name);
    }
};

var cgc = function (name, preventInstance) {
    if (dbgConsole) {
        dbgConsole.groupCollapsed(name);
    }
};

var cge = function () {
    if (dbgConsole) {
        dbgConsole.groupEnd();
    }
};

(function (window, undefined) {
    var firstRun = true;
    var nextEpisodeTriggered = false;

    if (firstRun) {
        firstRun = false;
        // дефолтное значение переменной
        cache['html5_player_go_fullscreen'] = false;
        cache['html5_player_autoplay']      = false;
    }

    // для автозакрытия плеера после окончания серии
    window.playerClosed = 0;

    // сохраним оригинал
    var PlayerjsEventsOriginal = PlayerjsEvents;

    // оверрайд для дополнительно обработки событий плеера
    window.PlayerjsEvents = function (event, id, info) {
        if (event != 'time') {
            cl('got event: eid: '+cache['active_eid']+': '+event+(info ? ': '+info : ''));
        }

        if (event == "stop") {
            cache['html5_player_autoplay'] = $('#autoplayNext').is(':checked');

            if (cache['html5_player_autoplay'] && !nextEpisodeTriggered) {
                cl('attempt play next');

                if (cache['html5_player_go_fullscreen']) {
                    // отметим текущий эпизод просмотренным
                    if (cache["active_eid"]) {
                        $("div.watched div[data\\:eid="+cache["active_eid"]+"][data\\:watched=0]").click();
                    }

                    var playerEp = $('#player').closest('.ep');

                    // найдем следующий непросмотреный
                    var nextEpisodeLink = playerEp.is(":has(div.watched div[data\\:eid="+cache["active_eid"]+"])")
                                          // если текущий эпизод был первым из плейлиста
                                          ? playerEp.next().find('div.play.pointer')
                                          // если текущий эпизод был НЕ первым из плейлиста
                                          : playerEp.nextAll(".ep:has(div.watched div[data\\:eid="+cache["active_eid"]+"]):first")
                                                .nextAll('.ep:has(div.watched div[data\\:watched=0]):first')
                                                .find('div.play.pointer');

                    if (nextEpisodeLink) {
                        nextEpisodeTriggered = true;

                        var eid     = nextEpisodeLink.attr("data:eid"),
                            episode = nextEpisodeLink.attr("data:episode"),
                            sid     = nextEpisodeLink.attr("data:sid"),
                            hash    = nextEpisodeLink.attr("data:hash");

                        cl('next eid:'+eid);

                        if (eid) {
                            var hash = $.md5($.token()+eid+sid+hash);
                            var previousEid = cache["active_eid"];
                            cache["active_eid"] = eid;

                            $.ajax({
                                url:      "/api/v2/play/episode/"+eid,
                                type:     "post",
                                headers:  {
                                    "x-api-token":  $.token(),
                                    "x-user-agent": "browser: public v0.1"
                                },
                                data:     {
                                    eid:  eid,
                                    hash: hash
                                },
                                async:    false,
                                dataType: "json",
                                success:  function (json) {
                                    if (!json.ok) {
                                        cl('can not get next episode stream url');
                                        return;
                                    }

                                    cache["html5_player"+cache['active_eid']] = cache["html5_player"+previousEid];
                                    cache["html5_player"+cache['active_eid']].api('play', json.stream);
                                    cache["html5_player"+cache['active_eid']].api('title', json.title);

                                    nextEpisodeTriggered = false;
                                }
                            });

                        }
                    } else {
                        cl('could not find next episode link');
                        cache["html5_player"+cache['active_eid']].api('exitfullscreen');
                    }
                } else {
                    $('#html5video').closest('.ep').next().find('div.play.pointer').click();
                }
            }
        }

        if (event == "init") {
            cl('play on init ('+exists(cache["html5_player"+cache['active_eid']])+')');
            var initPlayInterval = false;

            initPlayInterval = setInterval(function(){
                if (exists(cache["html5_player"+cache['active_eid']])) {
                    clearInterval(initPlayInterval);
                    initPlayInterval = false;
                    cl('   playing');
                    cache["html5_player"+cache['active_eid']].api("play");
                }
            }, 50);
        }

        if (event == "fullscreen") {
            cache['html5_player_go_fullscreen'] = true;
        }

        if (event == "exitfullscreen") {
            cache['html5_player_go_fullscreen'] = false;
        }

        PlayerjsEventsOriginal(event, id, info);
    };

    $("#episodes .player, #episodes .play, #new .play").click(function(){
        if ($('#html5video').closest('.ep').next().find('div.play.pointer').length && !$('#html5video').next().is('#autoplayNextDiv')) {
            $('#html5video').after($(
                "<div id='autoplayNextDiv' class='right link' style='display: flex;align-items: center;'><input type='checkbox' value='1' id='autoplayNext' style='margin-right: 5px;' /><label for='autoplayNext'>автопроигрывание</label></div>"));
            if (cache['html5_player_autoplay']) {
                $('#autoplayNext').attr('checked', 'checked');
            }
        }
    });

    return true;
})(window);