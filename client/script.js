
let mediaRecorder;
let audioChunks = [];
let socket;
let mediaStream; // グローバルスコープに追加


let url = 'ws://localhost:9090/translate';
let useSSL = true;
let urlSSL = 'wss://localhost:9090/translate';

var startThreshold = 5; // 録音を開始するボリュームレベル
var stopThreshold = 35; //　録音を停止するボリュームレベル
let silenceTime = 200; // 静けさが続くべきミリ秒数
let recording = false;
let stopStartTime = null;
let recordStartTime = null;
// 最低録音時間
const MIN_RECORDING_TIME = 3000;

function startRecording() {

    if (mediaStream) {
        // 既に mediaStream がある場合、新たに getUserMedia を呼び出さずに録音を開始
        initializeMediaRecorder(mediaStream);
    } else {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaStream = stream; // mediaStream を保存
                initializeMediaRecorder(stream);
            })
            .catch(error => {
                console.error("Error accessing the microphone:", error);
                error_message("Error accessing the microphone: " + error);
            });
    }

}
function on_start_recording(){
    document.getElementById('start').disabled = true;
    document.getElementById('stop').disabled = false;
}
function on_stop_recording(){
    document.getElementById('start').disabled = false;
    document.getElementById('stop').disabled = true;
}
function log_message(message){
    console.log(message);
    addMessage(message);
    // 最下行にスクロール
    var obj = document.getElementById("messages");
    obj.scrollTop = obj.scrollHeight;
}

function error_message(message){
    console.error(message);
    addMessageWithColor(message,"red");
}

function stopRecording() {
    if (mediaRecorder) {
        mediaRecorder.stop();
    }
    //log_message("Recording stopped.")
}

function setupWebSocket() {
    if(useSSL)
        socket = new WebSocket(urlSSL);
    else
        socket = new WebSocket(url);

    socket.onopen = function(event) {
        addMessage("WebSocket is open now.");
    };

    socket.onmessage = function(event) {
        console.log("Message from server:", event.data);
        addMessage(event.data);
    };

    socket.onclose = function(event) {
        addMessage("WebSocket is closed now.");
    };

    socket.onerror = function(event) {
        addMessage("WebSocket error observed:", event);
    };
}

function addMessage(message) {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML += `<div>${message}</div>`;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
function addMessageWithColor(message,color){
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML += `<div style="color:${color}">${message}</div>`;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function sendData(data) {

    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(data);
    } else {
        console.error("WebSocket is not open. Data not sent.");
    }

}

// Event listeners for buttons
document.addEventListener('DOMContentLoaded', (event) => {
    document.getElementById('start').addEventListener('click', startRecording);
    document.getElementById('stop').addEventListener('click', stopRecording);
    document.getElementById('clear').addEventListener('click', clear_messages);
    document.getElementById('save').addEventListener('click', save_messages);

    setupWebSocket();
});

let audioContext, analyser, microphone, javascriptNode;

function updateVolume(stream) {
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);
    javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 1024;

    microphone.connect(analyser);
    analyser.connect(javascriptNode);
    javascriptNode.connect(audioContext.destination);
    javascriptNode.onaudioprocess = function() {
        var array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        var values = 0;

        var length = array.length;
        for (var i = 0; i < length; i++) {
            values += (array[i]);
        }

        var average = values / length;

        // Update the volume progress bar
        document.getElementById('volume').value = average;

        // volume-level-valueタグにボリュームレベルを小数点以下2桁まで表示
        var text = average.toFixed(2);
        document.getElementById('volume-level-value').innerHTML = text;

        checkVolumeLevel();
    }
}
function getVolumeLevel() {
    return document.getElementById('volume').value;
}
// ボリュームレベルをチェックする関数
function checkVolumeLevel() {
    // ボリュームレベルを取得
    let volumeLevel = getVolumeLevel();

    // ボリュームレベルに応じてステータスを設定
    let status = '';
    // ボリュームレベルを表示


    // ボリュームが閾値を下回っているかチェック
    if (volumeLevel < stopThreshold) {
        status += "↓"
        // 初めて静けさが検出されたら、タイマーを開始
        if (!stopStartTime) {
            stopStartTime = Date.now();
        }

        // 一定時間静けさが続いているかチェック
        var laps = Date.now() - stopStartTime;
        if (laps > silenceTime) {
            //log_message("Silence detected.")
            if (recording) {

                // recordStartTimeからの経過時間を取得
                const recordTime = Date.now() - recordStartTime;
                // 最低録音時間より短い場合は録音を破棄
                if (recordTime < MIN_RECORDING_TIME) {
                    return;
                }

                // 録音を停止し、データをサーバーに送信
                stopRecording();
                recording = false;
            }
        }else{
            if(laps > 0)
            status = status + "silenceTime:" + laps + "ms";
        }
    }else{
        // 静けさのタイマーをリセット
        stopStartTime = null;
    }

    if(volumeLevel > startThreshold)
    {

        status += "↑"
        // ボリュームが閾値を超えている場合
        if (!recording) {
            // 録音を開始
            startRecording();
            recording = true;
            recordStartTime = Date.now();
        }
    }

    setStatusText(status);
}

// 定期的にボリュームレベルをチェック
//setInterval(checkVolumeLevel, 10);
document.addEventListener('DOMContentLoaded', function () {
    const slider = document.getElementById('recording-level-slider');
    slider.addEventListener('input', function() {
        const level = slider.value;
        document.getElementById('recording-level-value').textContent = level;
        startThreshold = level;
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const slider = document.getElementById('stop-level-slider');
    slider.addEventListener('input', function() {
        const level = slider.value;
        document.getElementById('stop-level-value').textContent = level;
        stopThreshold = level;
    });
});
function setSliderValue(value) {
    document.getElementById('recording-level-slider').value = value;
    document.getElementById('recording-level-value').textContent = value;
    startThreshold = value;
}
function setStatusText(text) {
    document.getElementById('status-text').textContent = text;
}

// 静寂時間の値を取得して設定する
function loadSilenceTime() {
    // ローカルストレージから値を取得する
    const savedSilenceTime = localStorage.getItem('silenceTime');
    if (savedSilenceTime) {
        silenceTime = parseInt(savedSilenceTime, 10);
        document.getElementById('silence-time-input').value = silenceTime;
    }
}
function loadSilenceThreshold(){
    // ローカルストレージから値を取得する
    const savedSilenceThreshold = localStorage.getItem('silenceThreshold');
    if (savedSilenceThreshold) {
        startThreshold = parseInt(savedSilenceThreshold, 10);
        setSliderValue(startThreshold);
    }
}

// 保存ボタンがクリックされたときに静寂時間を保存する
document.getElementById('save-silence-time').addEventListener('click', function() {
    const inputVal = document.getElementById('silence-time-input').value;
    silenceTime = parseInt(inputVal, 10);
    // ローカルストレージに値を保存する
    localStorage.setItem('silenceTime', silenceTime);
    log_message('静寂時間が保存されました: ' + silenceTime + 'ミリ秒');

    // silenceThresholdの保存
    const inputVal2 = document.getElementById('recording-level-slider').value;
    startThreshold = parseInt(inputVal2, 10);
    // ローカルストレージに値を保存する
    localStorage.setItem('silenceThreshold', startThreshold);
    log_message('静寂閾値が保存されました: ' + startThreshold);

});

function clear_messages(){
    document.getElementById('messages').innerHTML = '';
}


// Save messages to a text file
function save_messages(){
    var htmlContent = document.getElementById('messages').innerHTML;
    // HTMLのブロック要素を改行に置換
    var textContent = htmlContent.replace(/<\/div>|<\/p>|<br>/gi, '\n').replace(/<[^>]+>/g, '');
    var blob = new Blob([textContent], {type: 'text/plain'});
    var anchor = document.createElement('a');
    anchor.download = 'messages.txt';
    anchor.href = window.URL.createObjectURL(blob);
    anchor.click();
    window.URL.revokeObjectURL(anchor.href);
}

window.onload = function() {
    log_message("onload")
    // ここにロード時に実行したいコードを書く
    loadSilenceTime();
    loadSilenceThreshold();
};

function initializeMediaRecorder(stream) {
    updateVolume(stream);

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
        let audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        sendData(audioBlob);
        audioChunks = [];
        on_stop_recording();
    };
    mediaRecorder.start();
    on_start_recording();
}

// ページを離れるときにストリームを停止する
window.onbeforeunload = () => {
    log_message("onbeforeunload")
    if (mediaStream) {
        const tracks = mediaStream.getTracks();
        tracks.forEach(track => track.stop());
    }
};