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
        response = model.generate_content(data.message)
        full_text = response.text

        # ✅ Tüm kod bloklarını yakala
        code_blocks = re.findall(r"```(?:\w+)?\n(.*?)```", full_text, re.DOTALL)
        code_blocks = [block.strip() for block in code_blocks]

        # ✅ Kod blokları hariç açıklama metnini al
        explanation = re.sub(r"```(?:\w+)?\n.*?```", "", full_text, flags=re.DOTALL).strip()

        return {
            "explanation": explanation,
            "code": code_blocks
        }

    except Exception as e:
        return {"error": str(e)}
    