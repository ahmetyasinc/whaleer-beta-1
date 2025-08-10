from ast import Await
import math
from typing import List
import numpy as np
import pandas as pd
import time
import asyncio
import ta

from app.routes.profile.indicator.indicator_library.empty import empty
from app.routes.profile.indicator.indicator_library.emptyclass import EmptyClass
from app.routes.profile.indicator.indicator_library.input_shim import InputShim
from app.routes.profile.indicator.indicator_library.plot_indicator import plot
from app.routes.profile.indicator.indicator_library.print_indicator import custom_print
from app.routes.profile.indicator.input.input import extract_user_inputs

def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    allowed = ["numpy", "pandas", "math", "time"]
    if any(name == mod or name.startswith(mod + ".") for mod in allowed):
        return __import__(name, globals, locals, fromlist, level)
    raise ImportError(f"Modül yükleme izni yok: {name}")

def allowed_globals_indicator(df,print_outputs,indicator_results,updated,input_shim=None,for_strategy=False, for_backtest=False):
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
                    "float": float,
                    "int": int,
                    "str": str,
                    "int": int,
                    "bool": bool,
                    "list": list,
                    "dict": dict,
                    "tuple": tuple,
                    "set": set,

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
                    "print": lambda *args, **kwargs: custom_print(print_outputs, *args, **kwargs)
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
                "plot": lambda *args, **kwargs: plot(indicator_results, *args, **kwargs),
                "mark": lambda *args, **kwargs: empty(*args, **kwargs),
                "input": EmptyClass(),
            }
    
    if updated:
        allowed_globals["input"] = input_shim

    if for_strategy:
        allowed_globals["print"] = lambda *args, **kwargs: empty(*args, **kwargs)
        allowed_globals["plot"] = lambda *args, **kwargs: empty(*args, **kwargs),

    if for_backtest:
        allowed_globals["print"] = lambda *args, **kwargs: empty(*args, **kwargs)
        allowed_globals["plot"] = lambda *args, **kwargs: empty(*args, **kwargs),

    
    return allowed_globals