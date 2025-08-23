# --- helpers that live OUTSIDE the sandbox ---
def _noop_run(*args, **kwargs):
    """No-op. Keeps 'run(...)' valid but does nothing."""
    return None

def make_runner(ns: dict):
    """
    Returns a run(...) that supports:
      • run(func, *args, **kwargs)
      • run("func_name", *args, **kwargs)
      • run(func(*args, **kwargs))   # passthrough

    Only executes callables defined in this exec namespace.
    """
    def _is_user_defined_callable(obj):
        if not callable(obj):
            return False
        name = getattr(obj, "__name__", None)
        if not name or name.startswith("__"):
            return False
        # Same object bound under its name in ns?
        if ns.get(name) is not obj:
            return False
        # Prefer functions created in this exec (filename "<string>")
        code = getattr(obj, "__code__", None)
        if code and getattr(code, "co_filename", "") == "<string>":
            return True
        # Fallback: same globals mapping
        return getattr(obj, "__globals__", None) is ns

    def _runner(fn_or_result, *args, **kwargs):
        # run("func_name", ...)
        if isinstance(fn_or_result, str):
            cand = ns.get(fn_or_result)
            if not _is_user_defined_callable(cand):
                raise PermissionError(f"'{fn_or_result}' is not an allowed user-defined function.")
            return cand(*args, **kwargs)

        # run(func, ...)
        if callable(fn_or_result):
            if not _is_user_defined_callable(fn_or_result):
                raise PermissionError(f"Function '{getattr(fn_or_result,'__name__',type(fn_or_result))}' is not allowed.")
            return fn_or_result(*args, **kwargs)

        # run(func(...))  -> passthrough
        return fn_or_result

    return _runner
