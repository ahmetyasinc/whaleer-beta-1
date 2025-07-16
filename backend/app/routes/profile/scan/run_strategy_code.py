from ast import Await
import math
import numpy as np
import pandas as pd
import time
import ta
import asyncio
from decimal import Decimal

from app.routes.profile.scan.library.empty import empty
from app.routes.profile.scan.library.emptyclass import EmptyClass

def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    allowed = ["numpy", "pandas", "math", "time"]
    if any(name == mod or name.startswith(mod + ".") for mod in allowed):
        return __import__(name, globals, locals, fromlist, level)
    raise ImportError(f"Modül yükleme izni yok: {name}")

def run_strategy_code(strategy_code,indicator_codes,df,target):
    
    allowed_globals = {
        "__builtins__": {
            "__import__": safe_import,
            "await": Await,
            # ✅ Temel Python Fonksiyonları
            "range": range,
            "len": len,
            "min": min,
            "max": max,
            "sum": sum,
            "abs": abs,
            "round": round,
            "sorted": sorted,
            "zip": zip,
            "enumerate": enumerate,
            "map": map,
            "filter": filter,
            "all": all,
            "any": any,
            
            # ✅ Veri Tipleri
            "list": list,
            "dict": dict,
            "tuple": tuple,
            "set": set,
            "float": float,
            "str": str,
            "Decimal": Decimal,

            # ✅ Matematiksel Fonksiyonlar
            "pow": pow,
            "divmod": divmod,

            # ✅ `math` Modülü (Trigonometri, Logaritma, Üstel Fonksiyonlar)
            "math": {
                "ceil": math.ceil, "floor": math.floor, "fabs": math.fabs, "factorial": math.factorial,
                "exp": math.exp, "log": math.log, "log10": math.log10, "sqrt": math.sqrt,
                "sin": math.sin, "cos": math.cos, "tan": math.tan, "atan": math.atan,
                "pi": math.pi, "e": math.e
            },

            # ✅ Kullanıcının Print Çıktılarını Kaydetmesi İçin
            "print": lambda *args, **kwargs: empty(*args, **kwargs)
        },

        # ✅ NumPy ve Pandas için İzinler
        "np": np,
        "pd": pd,
        "asyncio": asyncio,
        "math": math,
        "df": df,

        # ✅ Zaman ölçümü için `time`
        "time": time,
        "ta": ta,

        # ✅ Grafik oluşturma fonksiyonu (plot)
        "mark": lambda *args, **kwargs: empty(*args, **kwargs),
        "plot": lambda *args, **kwargs: empty(*args, **kwargs),
        "input": EmptyClass(),
    }

    for indicator in indicator_codes:
        try:
            exec(indicator['code'], allowed_globals)
        except Exception as e:
            print(f"Indicator çalıştırılırken hata: {e}")

    try:
        exec(strategy_code, allowed_globals)
    except Exception as e:
        print(f"Strateji çalıştırılırken hata: {e}")

    result_df = allowed_globals['df']
    print(f"Result DF: {result_df['position']}")
    if 'position' in result_df.columns and len(result_df) >= 1:
        last_position = result_df['position'].iloc[-target]
    else:
        last_position = None

    return last_position