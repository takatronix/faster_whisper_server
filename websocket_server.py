import datetime
import os
from aiohttp import web
import settings
from speech_recognizer import SpeechRecognizer
from translator import Translator
import ssl

recognizer = SpeechRecognizer(settings.TRANSLATION_TARGET_LANGUAGE, settings.DEVICE)
translator = Translator(settings.DEEPL_API_KEY)


async def websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    print("websocket connection open")
    await ws.send_str("connected")
    async for msg in ws:
        if msg.type == web.WSMsgType.BINARY:
            print("Received audio data")
            received_time = datetime.datetime.now()
            filename = received_time.strftime("%Y%m%d%H%M%S") + ".wav"
            filepath = os.path.join("audio", filename)
            with open(filepath, "wb") as f:
                f.write(msg.data)

            print("Processing audio data")
            # await ws.send_str("Processing audio data" + filename)
            result, lang = recognizer.recognize(filepath)

            if result == "":
                continue

            # deeplで翻訳
            translated = ""
            if lang == "ja":
                translated = translator.translate(result, settings.TRANSLATION_SOURCE_LANGUAGE, "")
            else:
                translated = translator.translate(result, settings.TRANSLATION_TARGET_LANGUAGE, "")

            ret = "(" + lang + ")" + result + "(" + translated + ")"
            ret = f"{received_time.strftime('%Y/%m/%d %H:%M:%S')} {ret}"

            print(ret)
            await ws.send_str(ret)

            # ファイルを削除(例外発生時はログ)
            try:
                os.remove(filepath)
            except:
                print("Failed to delete file: " + filepath)

    return ws


# audioフォルダの中身を削除、フォルダがなければ作成
audio_dir = os.path.join("audio")
for file in os.listdir(audio_dir):
    os.remove(os.path.join(audio_dir, file))
os.makedirs(audio_dir, exist_ok=True)

app = web.Application()
app.router.add_get('/translate', websocket_handler)

if settings.USE_SSL:
    ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    ssl_context.load_cert_chain(settings.SSL_CERT, settings.SSL_KEY)
    web.run_app(app, host='0.0.0.0', port=settings.PORT_NO, ssl_context=ssl_context)
else:
    web.run_app(app, host='0.0.0.0', port=settings.PORT_NO)

