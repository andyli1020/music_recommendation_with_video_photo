import os
import runpy
import sys
import traceback
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PID_FILE = ROOT / "tmp_flask.pid"
STDOUT_LOG = ROOT / "tmp_flask_stdout.log"
STDERR_LOG = ROOT / "tmp_flask_stderr.log"


def main() -> None:
    os.chdir(ROOT)
    sys.path.insert(0, str(ROOT / "src"))
    PID_FILE.write_text(str(os.getpid()), encoding="utf-8")

    stdout_handle = open(STDOUT_LOG, "a", encoding="utf-8", buffering=1)
    stderr_handle = open(STDERR_LOG, "a", encoding="utf-8", buffering=1)
    sys.stdout = stdout_handle
    sys.stderr = stderr_handle

    try:
        runpy.run_path(str(ROOT / "src" / "api.py"), run_name="__main__")
    except SystemExit:
        raise
    except Exception:
        traceback.print_exc(file=stderr_handle)
        stderr_handle.flush()
        raise


if __name__ == "__main__":
    main()
