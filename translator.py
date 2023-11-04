import requests


class Translator:
    def __init__(self, api_key):
        self.api_key = api_key

    def translate(self, text, target_lang, source_lang):
        result = self.translate_with_deepl(text, target_lang, source_lang)
        return result

    def translate_with_deepl(self,text, target_lang, source_lang):
        translated_text = ""
        try:
            # APIから翻訳情報を取得
            result = requests.get(
                # 無料版のURL
                "https://api-free.deepl.com/v2/translate",
                params={
                    "auth_key": self.api_key,
                    "target_lang": target_lang,
                    "source_lang": source_lang,
                    "text": text,
                },
            )
            translated_text = result.json()["translations"][0]["text"]

        except:
            return "deepL api error"

        return translated_text
