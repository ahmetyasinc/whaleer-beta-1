import pandas as pd

from app.routes.profile.indicator.indicator_library.input_shim import InputShim
from app.routes.profile.indicator.input.input import extract_user_inputs

from app.services.allowed_globals.allowed_globals import build_allowed_globals

async def run_user_indicator(user_code: str, data: list[dict]):
    """
    Kullanıcının indikatör kodunu güvenli bir ortamda çalıştırır.
    Kullanıcı, `plot(indicator_name, type, on_graph, data)` fonksiyonunu kullanarak veri çizebilir.
    
    - `user_code`: Kullanıcının yazdığı Python kodu
    - `data`: 5000 mumluk veri (dict listesi)
    """

    try:
        # Veriyi Pandas DataFrame'e çevir
        df = pd.DataFrame(data)

        # İndikatör sonuçlarını saklayacak liste
        indicator_results = []

        # Kullanıcının `print()` çıktıları burada saklanacak
        print_outputs = []  

        sandbox = build_allowed_globals(df, print_outputs, indicator_results,
                          updated=False, for_indicator=True)

        # Kullanıcı kodunu çalıştır
        exec(user_code, sandbox, sandbox)

        inputs = extract_user_inputs(user_code)

        # JSON formatına uygun hale getir
        return indicator_results, print_outputs, inputs

    except Exception as e:
        return {"status": "error", "message": str(e)}, {"prints": print_outputs}, {"inputs": []}

async def run_updated_user_indicator(user_code: str, data: list[dict], inputs: dict):
    """
    Kullanıcının indikatör kodunu güvenli bir ortamda çalıştırır.
    Kullanıcı, `plot(indicator_name, type, on_graph, data)` fonksiyonunu kullanarak veri çizebilir.
    
    - `user_code`: Kullanıcının yazdığı Python kodu
    - `data`: 5000 mumluk veri (dict listesi)
    """

    try:
        # Veriyi Pandas DataFrame'e çevir
        df = pd.DataFrame(data)

        # İndikatör sonuçlarını saklayacak liste
        indicator_results = []

        # Kullanıcının `print()` çıktıları burada saklanacak
        print_outputs = []  

        input_shim = InputShim(inputs)

        sandbox = build_allowed_globals(df, print_outputs, indicator_results, input_shim=input_shim,
                          updated=True, for_indicator=True)

        # Kullanıcı kodunu çalıştır
        exec(user_code, sandbox, sandbox)

        # JSON formatına uygun hale getir
        return indicator_results, print_outputs

    except Exception as e:
        return {"status": "error", "message": str(e)}, {"prints": print_outputs}