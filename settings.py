import torch

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DEEPL_API_KEY = ""  # DeepL API key
TRANSLATION_TARGET_LANGUAGE = "JA"  # 翻訳先の言語コード（例：'en', 'ja', 'es'）
TRANSLATION_SOURCE_LANGUAGE = "EN"  # 翻訳元の言語コード（例：'en', 'ja', 'es'）

PORT_NO = 9090

# SSL証明書の設定
USE_SSL = True
SSL_CERT = "/path/to/cert.pem"
SSL_KEY = "/path/to/privkey.pem"
