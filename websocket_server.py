import datetime
import os
from aiohttp import web
import settings
from speech_recognizer import SpeechRecognizer
from translator import Translator

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


app = web.Application()
app.router.add_get('/translate', websocket_handler)

web.run_app(app, port=9090)
