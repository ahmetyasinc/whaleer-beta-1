import numpy as np
import pandas as pd

from app.routes.profile.strategy.input.input import extract_user_inputs
from app.routes.profile.strategy.strategy_library.input_shim import InputShim
from app.routes.profile.strategy.strategy_library.mark_strategy import mark_strategy
from app.routes.profile.strategy.strategy_library.plot_strategy import plot_strategy
from app.routes.profile.strategy.strategy_library.print_strategy import custom_print

from app.services.allowed_globals.allowed_globals_indicator import allowed_globals_indicator

async def run_user_strategy(strategy_name: str, user_code: str, data: list[dict], indicator_codes: list[str]):
    """
    Kullanıcının indikatör kodunu güvenli bir ortamda çalıştırır.
    Kullanıcı, `plot(strategy_name, type, on_graph, data)` fonksiyonunu kullanarak veri çizebilir.
    
    - `user_code`: Kullanıcının yazdığı Python kodu
    - `data`: 5000 mumluk veri (dict listesi)
    """

    try:       

        # Veriyi Pandas DataFrame'e çevir
        df = pd.DataFrame(data)

        # Strateji karlarını saklayacak liste
        strategy_graph = []  

        # Strateji sonuçlarını saklayacak liste
        strategy_results = []

        # Kullanıcının `print()` çıktıları burada saklanacak
        print_outputs = []  

        user_globals = {}

        allowed_globals = allowed_globals_indicator(df, print_outputs, indicator_results=None, updated=False, for_strategy=True)

        for indicator_code in indicator_codes:
            exec(indicator_code, allowed_globals)

        allowed_globals.update(user_globals)
        allowed_globals["mark"] = lambda *args, **kwargs: mark_strategy(strategy_name, strategy_results, *args, **kwargs)
        allowed_globals["plot"] = lambda *args, **kwargs: plot_strategy(strategy_name, strategy_graph,print_outputs, *args, **kwargs)
        allowed_globals["__builtins__"]["print"] = lambda *args, **kwargs: custom_print(print_outputs, *args, **kwargs)
        
        # Kullanıcı kodunu çalıştır
        
        exec(user_code, allowed_globals)

        inputs = extract_user_inputs(user_code)

        # Strateji verisini JSON'a uygun hale getir
        def convert_to_json_compatible(obj):
            """ NumPy tiplerini Python native tiplerine çevirir. """
            if isinstance(obj, (np.int64, np.int32, np.int16, np.int8)):
                return int(obj)
            elif isinstance(obj, (np.float64, np.float32)):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()  # NumPy array'leri listeye çevir
            elif isinstance(obj, list):
                return [convert_to_json_compatible(i) for i in obj]  # Liste içindeki NumPy tiplerini düzelt
            elif isinstance(obj, tuple):
                return tuple(convert_to_json_compatible(i) for i in obj)  # Tuple içindeki NumPy tiplerini düzelt
            elif isinstance(obj, dict):
                return {k: convert_to_json_compatible(v) for k, v in obj.items()}  # Dict içindeki NumPy tiplerini düzelt
            return obj
        
        strategy_results = convert_to_json_compatible(strategy_results)

        return strategy_results, strategy_graph, print_outputs, inputs

    except Exception as e:
        return {"status": "error", "message": str(e)}, {"Error"} ,{"prints": print_outputs}, {"inputs": []}
    
async def run_updated_user_strategy(strategy_name: str, user_code: str, data: list[dict], indicator_codes: list[str], inputs: dict):
    """
    Kullanıcının indikatör kodunu güvenli bir ortamda çalıştırır.
    Kullanıcı, `plot(strategy_name, type, on_graph, data)` fonksiyonunu kullanarak veri çizebilir.
    
    - `user_code`: Kullanıcının yazdığı Python kodu
    - `data`: 5000 mumluk veri (dict listesi)
    """

    try:       

        # Veriyi Pandas DataFrame'e çevir
        df = pd.DataFrame(data)

        # Strateji karlarını saklayacak liste
        strategy_graph = []  

        # Strateji sonuçlarını saklayacak liste
        strategy_results = []

        # Kullanıcının `print()` çıktıları burada saklanacak
        print_outputs = []  

        user_globals = {}

        input_shim = InputShim(inputs)

        # ✅ Sonra allowed_globals sözlüğünü tanımla
        allowed_globals = allowed_globals_indicator(df, print_outputs, indicator_results=None, updated=False, for_strategy=True)

        for indicator_code in indicator_codes:
            exec(indicator_code, allowed_globals)

        allowed_globals.update(user_globals)
        allowed_globals["mark"] = lambda *args, **kwargs: mark_strategy(strategy_name, strategy_results, *args, **kwargs)
        allowed_globals["plot"] = lambda *args, **kwargs: plot_strategy(strategy_name, strategy_graph,print_outputs, *args, **kwargs)
        allowed_globals["input"] = input_shim
        allowed_globals["__builtins__"]["print"] = lambda *args, **kwargs: custom_print(print_outputs, *args, **kwargs)
        
        # Kullanıcı kodunu çalıştır
        
        exec(user_code, allowed_globals)

        # Strateji verisini JSON'a uygun hale getir
        def convert_to_json_compatible(obj):
            """ NumPy tiplerini Python native tiplerine çevirir. """
            if isinstance(obj, (np.int64, np.int32, np.int16, np.int8)):
                return int(obj)
            elif isinstance(obj, (np.float64, np.float32)):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()  # NumPy array'leri listeye çevir
            elif isinstance(obj, list):
                return [convert_to_json_compatible(i) for i in obj]  # Liste içindeki NumPy tiplerini düzelt
            elif isinstance(obj, tuple):
                return tuple(convert_to_json_compatible(i) for i in obj)  # Tuple içindeki NumPy tiplerini düzelt
            elif isinstance(obj, dict):
                return {k: convert_to_json_compatible(v) for k, v in obj.items()}  # Dict içindeki NumPy tiplerini düzelt
            return obj
        
        strategy_results = convert_to_json_compatible(strategy_results)

        return strategy_results, strategy_graph, print_outputs

    except Exception as e:
        return {"status": "error", "message": str(e)}, {"Error"} ,{"prints": print_outputs}