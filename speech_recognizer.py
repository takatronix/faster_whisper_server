import time
import whisper
from faster_whisper import WhisperModel

class SpeechRecognizer:
    def __init__(self, target_language, device):
        self.target_language = target_language
        self.device = device

        self.model_whisper = whisper.load_model("large", device=device)
        self.model_fast_whisper = WhisperModel("large-v2", device=device, compute_type="float16")

    def recognize(self, wav_file):
        result,lang = self.recognize_fast_whisper(wav_file)
        return result,lang
    def recognize_whisper(self, wav_file):
        print("recognize_whisper"+wav_file)
        #  開始時刻
        start_time = time.time()

        # 言語オプション
        options = {}
        if self.target_language != "auto":
            options["language"] = self.target_language

        result = self.model_whisper.transcribe(wav_file, **options)
        text = result["text"]
        lang = result["language"]

        # 経過時間
        lapse_time = time.time() - start_time
        print(f"whisper({lang}):({lapse_time:.2f}秒) : {text}")
        return text

    def recognize_fast_whisper(self, wav_file):

        segments, info = self.model_fast_whisper.transcribe(wav_file, beam_size=5)

        text = ""
        for segment in segments:
            text += segment.text
            # print(f"[%.2fs -> %.2fs] %s {text}" % (segment.start, segment.end, segment.text))

        # 最初の空白をトリム
        text = text.strip()

        # よくまちがえるyouは無視
        if text == "You":
            text = ""
        if text == "you":
            text = ""
        # "MBC뉴스"がふくまれていたら無効
        if "MBC뉴스" in text:
            text = ""
        if "MBC 뉴스" in text:
            text = ""

        if info.language == "nn":
            text = ""

        # 同じ内容の文字が繰り返される場合は無視
        if len(text) > 0:
            if text[0] == text[-1]:
                text = ""

        return text, info.language
