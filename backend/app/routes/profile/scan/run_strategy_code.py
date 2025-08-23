from app.services.allowed_globals.allowed_globals import build_allowed_globals

def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    allowed = ["numpy", "pandas", "math", "time"]
    if any(name == mod or name.startswith(mod + ".") for mod in allowed):
        return __import__(name, globals, locals, fromlist, level)
    raise ImportError(f"Modül yükleme izni yok: {name}")

def run_strategy_code(strategy_code,indicator_codes,df,target):
    
    allowed_globals = build_allowed_globals(df, print_outputs=None, indicator_results=None, updated=False, make_empty=True)

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

    if 'position' in result_df.columns and len(result_df) >= 1:
        last_position = result_df['position'].iloc[-target]
    else:
        last_position = None

    return last_position