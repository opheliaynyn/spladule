'use strict';
const functions = require('firebase-functions');
const { dialogflow } = require('actions-on-google');

const app = dialogflow({
    // 認証用ヘッダ
    verification: { 'Authorization': 'Bearer secret' },
});

var request = require('request');
var async = require('asyncawait/async');
var await = require('asyncawait/await');

app.intent('Default Welcome Intent', conv => {
    // メッセージを言って、ユーザの応答を待機
    conv.ask('スプラジュールです。スケジュールを確認したい、' +
    'マッチ名かルール名を教えてください。');
})

var teach = async(function teach(conv, params, input) {
    // スケジュールを教えて終了
    var ret;
    switch (params.TimePeriod) {
        case '今':
            ret = await(getNowSchedule(params.MatchName));
            break;
        case '次':
            ret = await(getNextSchedule(params.MatchName));
            break;
        default:
            // undefinedはここにくる
            switch (params.MatchName) {
                case 'ガチエリア':
                case 'ガチホコバトル':
                case 'ガチヤグラ':
                case 'ガチアサリ':
                    ret = await(getNextSchedule(params.MatchName));
                    break;
                default:
                    ret = await(getNowSchedule(params.MatchName));
                    break;
            }
            break;
    }
    ret += '他にもスケジュールを確認したい場合は、マッチ名かルール名を教えてください。'
    conv.ask(ret);
});

app.intent('Teach Schedule', teach);

function doRequest(options) {
    return new Promise(function (resolve, reject) {
        request(options, function (error, res, body) {
            if (!error && res.statusCode === 200) {
                resolve(body);
            } else {
                reject(error);
            }
        });
    });
}

var getNowSchedule = async(function (match) {
    var urlMatch;
    var retSchedule;
    var date = new Date();
    var now = await(formatDate(date, 'YYYY-MM-DDTHH:mm:ss'));
    switch (match) {
        case 'フェス':
        case 'ナワバリバトル':
            urlMatch = 'regular/now';
            break;
        case 'ガチマッチ':
            urlMatch = 'gachi/now';
            break;
        case 'リーグマッチ':
            urlMatch = 'league/now';
            break;
        case 'サーモンラン':
            urlMatch = 'coop/schedule';
            break;
        default:
    }
    var options = {
        url: 'https://spla2.yuu26.com/' + urlMatch,
        method: 'GET',
    };

    try{
        let ret = JSON.parse(await(doRequest(options)));
        switch (match) {
            case 'フェス':
                if (await(duringFest(ret.result[0].start))) {
                    retSchedule = '現在のフェスのステージは、'
                    + ret.result[0].maps_ex[0].name + 'と'
                    + ret.result[0].maps_ex[1].name + 'とミステリーゾーン'
                    + 'です。終了は、' + zeroSuppress(ret.result[0].end.slice(11, 13))
                    + '時です。';
                } else {
                    retSchedule = '現在は、フェス期間中ではありません。次のフェスは、'
                    + await(nextFestSchedule(now)); 
                }
                break;
            case 'ナワバリバトル':
                if (await(duringFest(ret.result[0].start))) {
                    retSchedule = '現在のフェスのステージは、'
                    + ret.result[0].maps_ex[0].name + 'と'
                    + ret.result[0].maps_ex[1].name + 'とミステリーゾーン'
                    + 'です。終了は、' + zeroSuppress(ret.result[0].end.slice(11, 13))
                    + '時です。';
                } else {
                    retSchedule = '現在のナワバリバトルのステージは、'
                    + ret.result[0].maps_ex[0].name + 'と'
                    + ret.result[0].maps_ex[1].name
                    + 'です。終了は、' + zeroSuppress(ret.result[0].end.slice(11, 13))
                    + '時です。';
                }
                break;
            case 'ガチマッチ':
            case 'リーグマッチ':
                if (await(duringFest(ret.result[0].start))) {
                    retSchedule = '現在はフェス期間中のため、' + match + 'は開かれていません。';
                } else {
                    retSchedule = '現在の' + match + 'のルールは'
                    + ret.result[0].rule + 'で、ステージは、'
                    + ret.result[0].maps_ex[0].name + 'と'
                    + ret.result[0].maps_ex[1].name
                    + 'です。終了は、' + zeroSuppress(ret.result[0].end.slice(11, 13))
                    + '時です。';
                }
                break;
            case 'サーモンラン':
                var start = ret.result[0].start;
                var end = ret.result[0].end;
                if (!(start <= now && now <= end)) {
                    retSchedule = '現在、サーモンランは行われていません。';
                    break;
                }

                retSchedule = '現在のサーモンランのステージは、'
                + ret.result[0].stage.name + 'です。終了は、'
                + zeroSuppress(ret.result[0].end.slice(5, 7)) + '月'
                + zeroSuppress(ret.result[0].end.slice(8, 10)) + '日'
                + zeroSuppress(ret.result[0].end.slice(11, 13))
                + '時です。支給ブキは、';
                for (var i = 0; i < 4; i++) {
                    retSchedule += ret.result[0].weapons[i].name + '、';
                }
                retSchedule += 'です。';
                retSchedule = bukiConversion(retSchedule);
                break;
            default:
        }
    }
    catch (e){
        retSchedule = 'スケジュールを取得できませんでした。';
    }

    return retSchedule;
})

function getNextSchedule(match){
    var urlMatch;
    var retSchedule;
    var date = new Date();
    var now = formatDate(date, 'YYYY-MM-DDTHH:mm:ss');
    var i;
    switch (match) {
        case 'フェス':
            urlMatch = 'regular/next_all';
            break;
        case 'ナワバリバトル':
            urlMatch = 'regular/next';
            break;
        case 'ガチマッチ':
            urlMatch = 'gachi/next_all';
            break;
        case 'ガチエリア':
        case 'ガチホコバトル':
        case 'ガチヤグラ':
        case 'ガチアサリ':
            urlMatch = 'gachi/next_all';
            break;
        case 'リーグマッチ':
            urlMatch = 'league/next_all';
            break;
        case 'サーモンラン':
            urlMatch = 'coop/schedule';
            break;
        default:
    }
    var options = {
        url: 'https://spla2.yuu26.com/' + urlMatch,
        method: 'GET',
    };

    try{
        let ret = JSON.parse(await(doRequest(options)));
        switch (match) {
            case 'フェス':
                for (i = 0; i < ret.result.length; i++) {
                    if (!await(duringFest(ret.result[i].start))) {
                        continue;
                    }
                    retSchedule = '次のフェスのステージは、'
                    + ret.result[i].maps_ex[0].name + 'と'
                    + ret.result[i].maps_ex[1].name + 'とミステリーゾーン'
                    + 'です。開始は、';
                    if (i != 0) {
                        retSchedule += 
                        zeroSuppress(ret.result[i].start.slice(5, 7)) + '月'
                        + zeroSuppress(ret.result[i].start.slice(8, 10)) + '日';
                    }
                    retSchedule += 
                    zeroSuppress(ret.result[i].start.slice(11, 13)) + '時です。';
                    break;
                }
                if (retSchedule == null) {
                    retSchedule = '次のフェスは、' + await(nextFestSchedule(now));
                }
                break;
            case 'ナワバリバトル':
                if (await(duringFest(ret.result[0].start))) {
                    retSchedule = '次のフェスのステージは、'
                    + ret.result[0].maps_ex[0].name + 'と'
                    + ret.result[0].maps_ex[1].name + 'とミステリーゾーン'
                    + 'です。開始は、' + zeroSuppress(ret.result[0].start.slice(11, 13))
                    + '時です。';
                } else {
                    retSchedule = '次のナワバリバトルのステージは、'
                    + ret.result[0].maps_ex[0].name + 'と'
                    + ret.result[0].maps_ex[1].name
                    + 'です。開始は、'
                    + zeroSuppress(ret.result[0].start.slice(11, 13)) + '時です。';
                }
                break;
            case 'ガチマッチ':
            case 'リーグマッチ':
                for (i = 0; i < ret.result.length; i++) {
                    if (await(duringFest(ret.result[i].start))) {
                        continue;
                    }
                    retSchedule = '次の' + match + 'のルールは'
                    + ret.result[i].rule + 'で、ステージは、'
                    + ret.result[i].maps_ex[0].name + 'と'
                    + ret.result[i].maps_ex[1].name
                    + 'です。開始は、';
                    if (i != 0) {
                        retSchedule += 
                        zeroSuppress(ret.result[i].start.slice(5, 7)) + '月'
                        + zeroSuppress(ret.result[i].start.slice(8, 10)) + '日';
                    }
                    retSchedule += 
                    zeroSuppress(ret.result[i].start.slice(11, 13)) + '時です。';
                    break;
                }
                if (retSchedule == null) {
                    retSchedule = '次の' + match + 'のスケジュールを取得できませんでした。';
                }
                break;
            case 'ガチエリア':
            case 'ガチホコバトル':
            case 'ガチヤグラ':
            case 'ガチアサリ':
                for (i = 0; i < ret.result.length; i++) {
                    if (await(duringFest(ret.result[i].start))) {
                        continue;
                    }
                    if (ret.result[i].rule === match) {
                        retSchedule = '次の' + match + 'のステージは、'
                        + ret.result[i].maps_ex[0].name + 'と'
                        + ret.result[i].maps_ex[1].name
                        + 'です。開始は、'
                        + zeroSuppress(ret.result[i].start.slice(5, 7)) + '月'
                        + zeroSuppress(ret.result[i].start.slice(8, 10)) + '日'
                        + zeroSuppress(ret.result[i].start.slice(11, 13))
                        + '時です。';
                        break;
                    }
                }
                if (retSchedule == null) {
                    retSchedule = '次の' + match + 'のスケジュールを取得できませんでした。';
                }
                break;
            case 'サーモンラン':
                var start = ret.result[0].start;
                var end = ret.result[0].end;
                var index;
                if (start <= now && now <= end) {
                    index = 1;
                }
                else {
                    index = 0;
                }

                retSchedule = '次のサーモンランのステージは、'
                + ret.result[index].stage.name + 'です。開始は、'
                + zeroSuppress(ret.result[index].start.slice(5, 7)) + '月'
                + zeroSuppress(ret.result[index].start.slice(8, 10)) + '日'
                + zeroSuppress(ret.result[index].start.slice(11, 13))
                + '時です。支給ブキは、';
                for (i = 0; i < 4; i++) {
                    retSchedule += ret.result[index].weapons[i].name + '、';
                }
                retSchedule += 'です。';
                retSchedule = bukiConversion(retSchedule);
                break;
            default:
        }
    }
    catch (e){
        retSchedule = 'スケジュールを取得できませんでした。';
    }

    return retSchedule;
}

var formatDate = function (date, format) {
    format = format.replace(/YYYY/g, date.getFullYear());
    format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
    format = format.replace(/DD/g, ('0' + date.getDate()).slice(-2));
    format = format.replace(/HH/g, ('0' + date.getHours()).slice(-2));
    format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
    format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
    format = format.replace(/SSS/g, ('00' + date.getMilliseconds()).slice(-3));
    return format;
};

function zeroSuppress(val) {
    return val.replace( /^0+([0-9]+)/, "$1" );
}

function bukiConversion(val) {
    var buki = {
        'はてな': /？/g,
        'ゴーニー': /\.52/g,
        'キュウロク': /\.96/g,
        'Nザップ': /N-ZAP/g,
        'ゴーニーゴ': /525/g,
    }
    for (var key in buki) {
        val = val.replace(buki[key], key);
    }
    return val;
}

var duringFest = function (start_time) {
    var fest_start  = await(formatDate(new Date('2018-09-23T15:00:00'), 'YYYY-MM-DDTHH:mm:ss'));
    var fest_end = await(formatDate(new Date('2018-09-24T15:00:00'), 'YYYY-MM-DDTHH:mm:ss'));

    if (fest_start <= start_time && start_time < fest_end) {
        return true;
    } else {
        return false;
    }
};

var nextFestSchedule = function (now) {
    var fest_start  = await(formatDate(new Date('2018-09-23T15:00:00'), 'YYYY-MM-DDTHH:mm:ss'));
    if (now < fest_start) {
        return zeroSuppress(fest_start.slice(5, 7)) + '月'
            + zeroSuppress(fest_start.slice(8, 10)) + '日'
            + zeroSuppress(fest_start.slice(11, 13)) + '時からスタートします。';
    } else {
        return '未定です。';
    }
};

exports.teach = functions.https.onRequest(app);
