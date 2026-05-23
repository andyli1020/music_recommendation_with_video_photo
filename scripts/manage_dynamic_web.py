import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
TASK_NAME = "MusicRecoDynamicWeb"
SCHEDULE_TIME = "23:59"
PID_FILE = ROOT / "tmp_flask.pid"
STDOUT_LOG = ROOT / "tmp_flask_stdout.log"
STDERR_LOG = ROOT / "tmp_flask_stderr.log"
RUNNER_CMD = ROOT / "scripts" / "run_dynamic_web.cmd"
SCHTASKS_EXE = Path(os.environ.get("WINDIR", r"C:\Windows")) / "System32" / "schtasks.exe"
HEALTH_URL = "http://127.0.0.1:5000/health"


def run_command(args: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        check=check,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=ROOT,
    )


def read_pid() -> int | None:
    if not PID_FILE.exists():
        return None
    raw = PID_FILE.read_text(encoding="utf-8").strip()
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def is_pid_running(pid: int | None) -> bool:
    if pid is None:
        return False
    try:
        result = run_command(
            ["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"],
            check=False,
        )
    except OSError:
        return False
    combined_output = "\n".join(filter(None, [result.stdout, result.stderr]))
    if "Access denied" in combined_output or "拒绝访问" in combined_output:
        return True
    return str(pid) in result.stdout and "No tasks are running" not in result.stdout


def find_listener_pid(port: int = 5000) -> int | None:
    try:
        result = run_command(["netstat", "-ano", "-p", "tcp"], check=False)
    except OSError:
        return None

    for line in result.stdout.splitlines():
        parts = line.split()
        if len(parts) < 5:
            continue
        local_address = parts[1]
        state = parts[3]
        pid_text = parts[4]
        if not local_address.endswith(f":{port}") or state != "LISTENING":
            continue
        try:
            return int(pid_text)
        except ValueError:
            continue
    return None


def is_healthy(timeout: float = 2.0) -> bool:
    try:
        with urllib.request.urlopen(HEALTH_URL, timeout=timeout) as response:
            return response.status == 200
    except (urllib.error.URLError, TimeoutError):
        return False


def cleanup_stale_state() -> None:
    pid = read_pid()
    if pid is not None and not is_pid_running(pid):
        PID_FILE.unlink(missing_ok=True)


def resolve_running_pid() -> int | None:
    pid = read_pid()
    if pid is not None and is_pid_running(pid):
        return pid

    listener_pid = find_listener_pid()
    if listener_pid is not None and is_pid_running(listener_pid):
        PID_FILE.write_text(str(listener_pid), encoding="utf-8")
        return listener_pid

    return None


def clear_logs() -> None:
    for log_path in (STDOUT_LOG, STDERR_LOG):
        log_path.unlink(missing_ok=True)


def ensure_task() -> None:
    create_args = [
        str(SCHTASKS_EXE),
        "/Create",
        "/SC",
        "ONCE",
        "/TN",
        TASK_NAME,
        "/TR",
        str(RUNNER_CMD),
        "/ST",
        SCHEDULE_TIME,
        "/F",
    ]
    result = run_command(create_args, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "Failed to create scheduled task.")


def run_task() -> None:
    result = run_command([str(SCHTASKS_EXE), "/Run", "/TN", TASK_NAME], check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "Failed to run scheduled task.")


def wait_until_started(timeout_seconds: int = 20) -> int | None:
    deadline = time.time() + timeout_seconds
    seen_pid: int | None = None

    while time.time() < deadline:
        pid = resolve_running_pid()
        if pid is not None:
            seen_pid = pid
        if seen_pid is not None and is_pid_running(seen_pid) and is_healthy():
            return seen_pid
        time.sleep(1)

    return seen_pid


def start() -> int:
    cleanup_stale_state()
    existing_pid = resolve_running_pid()
    if existing_pid is not None and is_healthy():
        print(f"Dynamic web already running at http://127.0.0.1:5000/ (PID {existing_pid})")
        return 0

    clear_logs()
    PID_FILE.unlink(missing_ok=True)
    ensure_task()
    run_task()

    started_pid = wait_until_started()
    if started_pid is None or not is_pid_running(started_pid):
        raise RuntimeError(f"Dynamic web did not start successfully. Check {STDERR_LOG}")
    if not is_healthy():
        raise RuntimeError(f"Dynamic web process started but health check failed. Check {STDERR_LOG}")

    print(f"Dynamic web started at http://127.0.0.1:5000/ (PID {started_pid})")
    return 0


def stop() -> int:
    pid = resolve_running_pid()
    if pid is not None and is_pid_running(pid):
        result = run_command(["taskkill", "/PID", str(pid), "/F"], check=False)
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or result.stdout.strip() or f"Failed to stop PID {pid}")
        print(f"Stopped dynamic web process {pid}")
    else:
        print("Dynamic web process was not running.")

    PID_FILE.unlink(missing_ok=True)
    run_command([str(SCHTASKS_EXE), "/End", "/TN", TASK_NAME], check=False)
    return 0


def status() -> int:
    cleanup_stale_state()
    pid = resolve_running_pid()
    healthy = is_healthy()
    if pid is not None and is_pid_running(pid):
        state = "healthy" if healthy else "running-unhealthy"
        print(f"Dynamic web status: {state} (PID {pid})")
        return 0 if healthy else 1

    if healthy:
        print("Dynamic web status: healthy (PID file missing)")
        return 0

    print("Dynamic web status: stopped")
    return 1


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] not in {"start", "stop", "status"}:
        print("Usage: python scripts/manage_dynamic_web.py [start|stop|status]")
        return 2

    command = sys.argv[1]
    if command == "start":
        return start()
    if command == "stop":
        return stop()
    return status()


if __name__ == "__main__":
    raise SystemExit(main())
