from app.routes.profile.indicator.indicator_library.input_collector import InputCollector

def extract_user_inputs(user_code: str):
    collector = InputCollector()

    # Only allow `input` in this execution environment
    allowed_globals = {
        "__builtins__": {},
        "input": collector
    }

    try:
        # Only keep lines containing "input." and strip leading/trailing spaces
        lines = user_code.splitlines()
        input_lines = [line.lstrip() for line in lines if "input." in line]
        input_code = "\n".join(input_lines)

        exec(input_code, allowed_globals)
        return {"status": "ok", "inputs": collector.inputs}

    except Exception as e:
        return {"status": "error", "message": str(e)}
