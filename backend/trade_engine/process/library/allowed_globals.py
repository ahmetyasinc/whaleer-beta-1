from ast import Await
import math
from typing import List
import numpy as np
import pandas as pd
import time
import asyncio
import ta
from backend.trade_engine.process.library.get_percentage import get_percentage


def empty(*args, **kwargs):
    pass
    

class EmptyClass:
    def int(self, default=0, **kwargs):
        return default

    def float(self, default=0.0, **kwargs):
        return default

    def bool(self, default=False, **kwargs):
        return default

    def string(self, default="", **kwargs):
        return default
    
    def color(self, default="", **kwargs):
        return default


def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    allowed = ["numpy", "pandas", "math", "time"]
    if any(name == mod or name.startswith(mod + ".") for mod in allowed):
        return __import__(name, globals, locals, fromlist, level)
    raise ImportError(f"Modül yükleme izni yok: {name}")

def allowed_globals_(df, bot_id):

    python_keywords = {
        "nonlocal": None,
        "global": None,
        "yield": None,
        "async": None,
        "await": Await,
        "lambda": lambda: None,  # lambda desteği
    }

    allowed_globals_ = {
                "__builtins__": {
                    "__import__": safe_import,
                    "isinstance": isinstance,
                    "getattr": getattr,
                    "hasattr": hasattr,
                    **python_keywords,
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
                "get_percentage": (lambda: get_percentage(bot_id)),
                "plot": lambda *args, **kwargs: empty(*args, **kwargs),
                "mark": lambda *args, **kwargs: empty(*args, **kwargs),
                "input": EmptyClass(),
            }
    
    return allowed_globals_