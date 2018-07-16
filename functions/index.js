'use strict';
const functions = require('firebase-functions');
const { dialogflow } = require('actions-on-google');

const app = dialogflow({
    // 認証用ヘッダ
    verification: { 'Authorization': 'Bearer secret' },
});

var request = require('request');

app.intent('Default Welcome Intent', conv => {
    // メッセージを言って、ユーザの応答を待機
    conv.ask('スプラジュールです。スケジュールを確認したい、' +
    'マッチ名かルール名を教えてください');
});

app.intent('Teach Schedule', (conv, params, input) => {
    // スケジュールを教えて終了
    var ret;
    switch (params.TimePeriod) {
        case '今':
            ret = getNowSchedule(params.MatchName);
            break;
        case '次':
            ret = getNextSchedule(params.MatchName);
            break;
        default:
            // undefinedはここにくる
            ret = getNowSchedule(params.MatchName);
            break;
    }
    conv.close(ret);
});

// format: 書式フォーマット
function formatDate (date, format) {
  format = format.replace(/yyyy/g, date.getFullYear());
  format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
  format = format.replace(/dd/g, ('0' + date.getDate()).slice(-2));
  format = format.replace(/HH/g, ('0' + date.getHours()).slice(-2));
  format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
  format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
  format = format.replace(/SSS/g, ('00' + date.getMilliseconds()).slice(-3));
  return format;
};

function getNowSchedule(match) {
    var urlMatch;
    var retSchedule;
    var date = new Date();
    var now = formatDate(date, 'YYYY-MM-DDTHH:mm:ss');
    switch (match) {
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

    function callback(error, response, body){
        if (!error && response.statusCode == 200){
            var ret = JSON.parse(body);
            console.log(ret);

            switch (match) {
                case 'ナワバリバトル':
                    retSchedule = '現在のナワバリバトルのステージは、'
                    + ret.result[0].maps_ex[0].name + 'と'
                    + ret.result[0].maps_ex[1].name
                    + 'です。終了は、' + zeroSuppress(ret.result[0].end.slice(11, 13))
                    + '時です。';
                    break;
                case 'ガチマッチ':
                    retSchedule = '現在のガチマッチのルールは'
                    + ret.result[0].rule + 'で、ステージは、'
                    + ret.result[0].maps_ex[0].name + 'と'
                    + ret.result[0].maps_ex[1].name
                    + 'です。終了は、' + zeroSuppress(ret.result[0].end.slice(11, 13))
                    + '時です。';
                    break;
                case 'リーグマッチ':
                    retSchedule = '現在のリーグマッチのルールは'
                    + ret.result[0].rule + 'で、ステージは、'
                    + ret.result[0].maps_ex[0].name + 'と'
                    + ret.result[0].maps_ex[1].name
                    + 'です。終了は、' + zeroSuppress(ret.result[0].end.slice(11, 13))
                    + '時です。';
                    break;
                case 'サーモンラン':
                    console.log(now);
                    retSchedule = 'サーモンランは未実装です。';
                    break;
                default:
            }
            console.log(retSchedule);
        }
    }
    request(options, callback);
}

function getNextSchedule(match){
    var urlMatch;
    var retSchedule;
    var date = new Date();
    var now = formatDate(date, 'YYYY-MM-DDTHH:mm:ss');
    switch (match) {
        case 'ナワバリバトル':
            urlMatch = 'regular/next';
            break;
        case 'ガチマッチ':
            urlMatch = 'gachi/next';
            break;
        case 'ガチエリア':
        case 'ガチホコ':
        case 'ガチヤグラ':
        case 'ガチアサリ':
            urlMatch = 'gachi/next_all';
            break;
        case 'リーグマッチ':
            urlMatch = 'league/next';
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

    function callback(error, response, body){
        if (!error && response.statusCode == 200){
            var ret = JSON.parse(body);

            switch (match) {
                case 'ナワバリバトル':
                    retSchedule = '次のナワバリバトルのステージは、'
                    + ret.result[0].maps_ex[0].name + 'と'
                    + ret.result[0].maps_ex[1].name
                    + 'です。開始は、' + ret.result[0].start(11, 13) + '時からです。';
                    break;
                case 'ガチマッチ':
                    retSchedule = '次のガチマッチのルールは'
                    + ret.result[0].rule + 'で、ステージは、'
                    + ret.result[0].maps_ex[0].name + 'と'
                    + ret.result[0].maps_ex[1].name
                    + 'です。開始は、' + ret.result[0].start(11, 13) + '時からです。';
                    break;
                case 'リーグマッチ':
                    retSchedule = '次のリーグマッチのルールは'
                     + ret.result[0].rule + 'で、ステージは、'
                    + ret.result[0].maps_ex[0].name + 'と'
                     + ret.result[0].maps_ex[1].name
                    + 'です。開始は、' + ret.result[0].start(11, 13) + '時からです。';
                    break;
                case 'ガチエリア':
                case 'ガチホコ':
                case 'ガチヤグラ':
                case 'ガチアサリ':
                    //console.log(ret[0].length);
                    console.log(ret.result[0]);
                    console.log(ret.result.length);
                    for (var i=0;i<ret.result.length;i++) {
                        console.log(ret.result[i].rule);
                        if (ret.result[i].rule == match) {
                            retSchedule = '次の' + match + 'のステージは、'
                            + ret.result[i].maps_ex[0].name + 'と'
                            + ret.result[i].maps_ex[1].name
                            + 'です。開始は、' + ret.result[i].start.slice(0, 4) + '年'
                            + zeroSuppress(ret.result[i].start.slice(5, 7)) + '月'
                            + zeroSuppress(ret.result[i].start.slice(8, 10)) + '日'
                            + zeroSuppress(ret.result[i].start.slice(11, 13))
                            + '時からです。';
                            console.log(retSchedule);
                            break;
                        }
                    }
                    console.log(retSchedule);
                    return retSchedule;
                    break;
                case 'サーモンラン':
                    console.log(now);
                    retSchedule = 'サーモンランは未実装です。';
                    break;
                default:
            }
        }
    }
    request(options, callback);
}

//ゼロサプレス
function zeroSuppress( val ) {
    return val.replace( /^0+([0-9]+)/, "$1" );
}

exports.teach = functions.https.onRequest(app);
