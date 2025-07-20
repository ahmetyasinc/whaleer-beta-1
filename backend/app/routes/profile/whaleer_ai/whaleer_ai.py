from fastapi import APIRouter, Depends, HTTPException
from fastapi import FastAPI
from pydantic import BaseModel
import re
import google.generativeai as genai

protected_router = APIRouter()

model = genai.GenerativeModel("gemini-1.5-flash")
genai.configure(api_key="AIzaSyC-RoDgkf2lpcQlCbeoQKFK39LVhBO7Oi0")

class ChatInput(BaseModel):
    message: str

@protected_router.post("/chat2")
def chat_with_gemini(data: ChatInput):
    try:
        # 📌 Sistem ön prompt'u
        system_instruction = """
Whaleer adında bir algoritmik al-sat platformunda çalışan bir yapay zeka strateji danışmanısın.
Whaleer kullanıcıları strateji geliştirmek için Python tabanlı veri analizi yapar (Frontend için next.js yapısını kullanır).
Kodlar genellikle Pandas dataframe'i üzerinden çalışır ve `df` adında bir veri seti kullanılır.

Aşağıdaki kurallara göre kullanıcıya yardımcı ol:

- Stratejiler `position` (pozisyon sinyali: 1 ve -1 değerleri arsında değişebilir) ve `percentage` (risk yüzdesi) sütunlarını üretmelidir.
- Teknik analiz göstergeleri kullanılabilir.
- Strateji sonunda görsel sonuç oluşturmak için `mark(df)` ve `plot(df.tail(250), commission)` gibi fonksiyonlar olabilir.
- Kodda temiz veri işlemleri yapılmalı, `fillna`, `rolling`, `ewm` gibi yöntemler kullanılabilir.
- Strateji mantığı hem açıklanmalı hem de kodla desteklenmelidir.
"""

        # Kullanıcının mesajını sistem prompt'una ekle
        full_prompt = f"{system_instruction.strip()}\n\nKullanıcı sorusu:\n{data.message.strip()}"

        # AI modelinden yanıt al
        response = model.generate_content(full_prompt)
        full_text = response.text

        # Kod ve başlık eşleştirme regex
        pattern = r"(?:\*\*(.*?)\*\*\s*)?```(?:\w+)?\n(.*?)```"
        matches = re.findall(pattern, full_text, re.DOTALL)

        # Kod blokları listesi
        codes = []
        for idx, match in enumerate(matches):
            title, code = match
            codes.append({
                "title": title.strip() if title else f"Kod {idx + 1}",
                "code": str(code).strip()
            })

        # Açıklamayı kodlardan ayır
        explanation = re.sub(pattern, "", full_text, flags=re.DOTALL).strip()

        return {
            "explanation": explanation,
            "codes": codes
        }

    except Exception as e:
        return {"error": str(e)}



    