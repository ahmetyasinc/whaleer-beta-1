from ast import Await
import math
from typing import List
import numpy as np
import pandas as pd
import time
import asyncio
import ta
from datetime import timedelta

from app.routes.profile.indicator.indicator_library.empty import empty
from app.routes.profile.indicator.indicator_library.emptyclass import EmptyClass
from app.routes.profile.indicator.indicator_library.input_shim import InputShim
from app.routes.profile.indicator.indicator_library.plot_indicator import plot
from app.routes.profile.indicator.indicator_library.print_indicator import custom_print
from app.routes.profile.indicator.indicator_library.runner import _noop_run, make_runner
from app.routes.profile.indicator.input.input import extract_user_inputs

def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    allowed = ["numpy", "pandas", "math", "time"]
    if any(name == mod or name.startswith(mod + ".") for mod in allowed):
        return __import__(name, globals, locals, fromlist, level)
    raise ImportError(f"Modül yükleme izni yok: {name}")

def build_allowed_globals(df, print_outputs, indicator_results, updated,
                    input_shim=None, for_indicator=False, make_empty=False) -> dict:
    # Step 1 — create the namespace dict
    ns = {
        "__builtins__": {
            "__import__": safe_import,
            "isinstance": isinstance,
            "abs": abs, "all": all, "any": any, "bin": bin, "bool": bool,
            "timedelta": timedelta, "complex": complex, "dict": dict,
            "await": Await,
            "range": range, "len": len, "min": min, "max": max, "sum": sum, "abs": abs,
            "round": round, "sorted": sorted, "zip": zip, "enumerate": enumerate,
            "map": map, "filter": filter, "all": all, "any": any,
            "float": float, "int": int, "str": str, "bool": bool,
            "list": list, "dict": dict, "tuple": tuple, "set": set,
            "pow": pow, "divmod": divmod,
            "math": {
                "ceil": math.ceil, "floor": math.floor, "fabs": math.fabs, "factorial": math.factorial,
                "exp": math.exp, "log": math.log, "log10": math.log10, "sqrt": math.sqrt,
                "sin": math.sin, "cos": math.cos, "tan": math.tan, "atan": math.atan,
                "pi": math.pi, "e": math.e
            },
            "print": lambda *args, **kwargs: custom_print(print_outputs, *args, **kwargs),
        },
        "np": np, "pd": pd, "asyncio": asyncio, "math": math, "df": df, "time": time, "ta": ta,
        "plot_indicator": lambda *args, **kwargs: plot(indicator_results, *args, **kwargs),
        "mark": lambda *args, **kwargs: empty(*args, **kwargs),
        "run": _noop_run,
        "input": EmptyClass(),
    }

    # Step 2 — apply modifications
    if updated:
        ns["input"] = input_shim

    if make_empty:
        ns["__builtins__"]["print"] = lambda *args, **kwargs: empty(*args, **kwargs)
        ns["plot_indicator"]  = lambda *args, **kwargs: empty(*args, **kwargs)
        ns["plot"]  = lambda *args, **kwargs: empty(*args, **kwargs)

    if make_empty == False:
        ns["run"] = make_runner(ns) if for_indicator else _noop_run

    return ns
