"""
Station of Vision – FastAPI Main Server
Netflix-style local network video streaming platform.
"""

from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os
import sys
import base64
import secrets
import string

from app.config_manager import (
    load_config, save_config, get_allowed_directories,
    add_directory, remove_directory, toggle_directory,
    verify_password, change_password,
)
from app.thumbnail import generate_thumbnail


# Setup Base Path (Supports PyInstaller bundle and direct run)
if getattr(sys, 'frozen', False):
    BASE_DIR = Path(getattr(sys, '_MEIPASS', sys.executable))
    # If static is alongside the EXE, prefer it
    EXE_DIR = Path(sys.executable).parent
    if (EXE_DIR / "static").exists():
        STATIC_DIR = EXE_DIR / "static"
        TEMPLATES_DIR = EXE_DIR / "templates"
    else:
        STATIC_DIR = BASE_DIR / "static"
        TEMPLATES_DIR = BASE_DIR / "templates"
else:
    BASE_DIR = Path(__file__).parent.parent
    STATIC_DIR = BASE_DIR / "static"
    TEMPLATES_DIR = BASE_DIR / "templates"


app = FastAPI(title="Station of Vision")

@app.on_event("startup")
async def startup_event():
    import socket
    local_ip = "localhost"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass
    
    print("\n" + "="*55)
    print("  🎬 STATION OF VISION SUNUCUSU HAZIR!")
    print("="*55)
    print(f"  📌 Bu Bilgisayardan:    http://localhost:8000")
    print(f"  📱 Yerel Ağdaki Cihazlar: http://{local_ip}:8000")
    print(f"  🔐 Yönetici Paneli:      http://localhost:8000/admin")
    print("="*55 + "\n")

# Allow cross-origin for local network access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Serve static assets (CSS, JS, images)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Simple in-memory admin session tokens
_admin_tokens: set[str] = set()


# ─── Constants ───────────────────────────────────────────────────────────────

SUPPORTED_VIDEO_EXTS = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".m4v"}

MIME_MAP = {
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
}

# Windows system directories to hide from the file browser
HIDDEN_DIRS = {
    "$Recycle.Bin", "$WinREAgent", "System Volume Information",
    "Recovery", "PerfLogs", "Config.Msi",
}

# ─── Helpers ─────────────────────────────────────────────────────────────────


def _encode_id(path: str) -> str:
    """Encode a filesystem path to a URL-safe base64 string."""
    return base64.urlsafe_b64encode(path.encode("utf-8")).decode("utf-8").rstrip("=")


def _decode_id(encoded: str) -> str:
    """Decode a URL-safe base64 string back to a filesystem path."""
    pad = 4 - len(encoded) % 4
    if pad != 4:
        encoded += "=" * pad
    return base64.urlsafe_b64decode(encoded.encode("utf-8")).decode("utf-8")


def _is_allowed(file_path: str) -> bool:
    """Check whether a file lives under an allowed directory."""
    norm = os.path.normpath(file_path).lower()
    for d in get_allowed_directories():
        if norm.startswith(os.path.normpath(d["path"]).lower()):
            return True
    return False


def _video_mime(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    return MIME_MAP.get(ext, "video/mp4")


def _scan_videos(directory: str) -> list[dict]:
    """List all supported video files in a directory (non-recursive)."""
    videos = []
    if not os.path.isdir(directory):
        return videos
    try:
        for entry in sorted(os.scandir(directory), key=lambda e: e.name.lower()):
            if entry.is_file():
                ext = os.path.splitext(entry.name)[1].lower()
                if ext in SUPPORTED_VIDEO_EXTS:
                    videos.append({
                        "id": _encode_id(entry.path),
                        "name": os.path.splitext(entry.name)[0],
                        "filename": entry.name,
                        "size": entry.stat().st_size,
                    })
    except PermissionError:
        pass
    return videos


def _verify_admin(request: Request) -> None:
    """Raise 401 if the request doesn't carry a valid admin token."""
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip()
    if token not in _admin_tokens:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ─── Page Routes ─────────────────────────────────────────────────────────────


@app.get("/", response_class=HTMLResponse)
async def page_home():
    """Serve the main Netflix-style UI."""
    return (TEMPLATES_DIR / "index.html").read_text(encoding="utf-8")


@app.get("/admin", response_class=HTMLResponse)
async def page_admin():
    """Serve the admin panel."""
    return (TEMPLATES_DIR / "admin.html").read_text(encoding="utf-8")



# ─── Public API ──────────────────────────────────────────────────────────────


@app.get("/api/categories")
async def api_categories():
    """Return enabled directories with their video listings."""
    result = []
    for d in get_allowed_directories():
        videos = _scan_videos(d["path"])
        if videos:
            result.append({
                "name": d["name"],
                "count": len(videos),
                "videos": videos,
            })
    return result


@app.get("/api/video/{video_id}")
async def api_stream_video(video_id: str, request: Request):
    """
    Stream a video with HTTP Range support for seek / scrub.
    Returns 206 Partial Content for range requests, 200 for full file.
    """
    try:
        video_path = _decode_id(video_id)
    except Exception:
        raise HTTPException(400, "Invalid video ID")

    if not os.path.isfile(video_path):
        raise HTTPException(404, "Video not found")
    if not _is_allowed(video_path):
        raise HTTPException(403, "Access denied")

    file_size = os.path.getsize(video_path)
    mime = _video_mime(video_path)
    range_header = request.headers.get("range")

    if range_header:
        # Parse "bytes=START-END"
        try:
            spec = range_header.strip().removeprefix("bytes=")
            parts = spec.split("-", 1)
            start = int(parts[0]) if parts[0] else 0
            end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1
        except (ValueError, IndexError):
            start, end = 0, file_size - 1

        start = max(0, start)
        end = min(end, file_size - 1)

        if start >= file_size:
            raise HTTPException(416, "Range not satisfiable")

        length = end - start + 1
        CHUNK = 1024 * 1024  # 1 MB read chunks

        def _iter():
            with open(video_path, "rb") as f:
                f.seek(start)
                remaining = length
                while remaining > 0:
                    data = f.read(min(CHUNK, remaining))
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        return StreamingResponse(
            _iter(),
            status_code=206,
            media_type=mime,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(length),
            },
        )
    else:
        # No Range → serve the full file via FileResponse (efficient)
        return FileResponse(
            video_path,
            media_type=mime,
            headers={"Accept-Ranges": "bytes"},
        )


@app.get("/api/thumbnail/{video_id}")
async def api_thumbnail(video_id: str):
    """Return (or lazily generate) a JPEG thumbnail for a video."""
    try:
        video_path = _decode_id(video_id)
    except Exception:
        raise HTTPException(400, "Invalid video ID")

    if not os.path.isfile(video_path):
        raise HTTPException(404, "Video not found")
    if not _is_allowed(video_path):
        raise HTTPException(403, "Access denied")

    thumb = generate_thumbnail(video_path)
    if thumb and os.path.isfile(thumb):
        return FileResponse(thumb, media_type="image/jpeg")

    raise HTTPException(404, "Thumbnail not available")


# ─── Admin API ───────────────────────────────────────────────────────────────


@app.post("/api/admin/login")
async def api_admin_login(request: Request):
    """Authenticate admin and return a session token."""
    body = await request.json()
    if verify_password(body.get("password", "")):
        token = secrets.token_hex(32)
        _admin_tokens.add(token)
        return {"success": True, "token": token}
    raise HTTPException(401, "Invalid password")


@app.get("/api/admin/config")
async def api_admin_get_config(request: Request):
    """Return current config (without the password)."""
    _verify_admin(request)
    config = load_config()
    return {
        "allowed_directories": config.get("allowed_directories", []),
        "thumbnail_quality": config.get("thumbnail_quality", 85),
    }


@app.post("/api/admin/config")
async def api_admin_update_config(request: Request):
    """Handle config mutations (add/remove/toggle dirs, change password)."""
    _verify_admin(request)
    body = await request.json()
    action = body.get("action")

    if action == "add_directory":
        path = body.get("path", "")
        name = body.get("name", "")
        if not path or not os.path.isdir(path):
            raise HTTPException(400, "Invalid directory path")
        ok = add_directory(path, name or None)
        return {"success": ok}

    elif action == "remove_directory":
        remove_directory(body.get("path", ""))
        return {"success": True}

    elif action == "toggle_directory":
        toggle_directory(body.get("path", ""), body.get("enabled", True))
        return {"success": True}

    elif action == "rename_directory":
        config = load_config()
        target = os.path.normpath(body.get("path", ""))
        for d in config["allowed_directories"]:
            if os.path.normpath(d["path"]) == target:
                d["name"] = body.get("name", d["name"])
                break
        save_config(config)
        return {"success": True}

    elif action == "change_password":
        new_pw = body.get("new_password", "")
        if len(new_pw) < 4:
            raise HTTPException(400, "Password must be at least 4 characters")
        change_password(new_pw)
        return {"success": True}

    raise HTTPException(400, "Unknown action")


@app.get("/api/admin/browse")
async def api_admin_browse(request: Request, path: str = Query(default="")):
    """Browse the server filesystem to pick directories."""
    _verify_admin(request)

    if not path:
        # Windows: list drive letters; Unix: start at /
        if os.name == "nt":
            drives = []
            for letter in string.ascii_uppercase:
                drive = f"{letter}:\\"
                if os.path.exists(drive):
                    drives.append({"name": f"{letter}:", "path": drive})
            return {"items": drives, "current": "", "parent": None}
        else:
            path = "/"

    if not os.path.isdir(path):
        raise HTTPException(400, "Not a valid directory")

    items = []
    try:
        for entry in sorted(os.scandir(path), key=lambda e: e.name.lower()):
            if (
                entry.is_dir()
                and not entry.name.startswith(".")
                and entry.name not in HIDDEN_DIRS
            ):
                items.append({"name": entry.name, "path": entry.path})
    except PermissionError:
        raise HTTPException(403, "Permission denied")

    parent = os.path.dirname(path.rstrip(os.sep + "/"))
    if parent == path.rstrip(os.sep + "/"):
        parent = None

    return {"items": items, "current": path, "parent": parent}
