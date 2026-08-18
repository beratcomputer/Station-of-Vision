"""
Station of Vision – Config Manager
Manages config.json for admin settings and allowed directories.
"""

import json
import os
import sys
from pathlib import Path

if getattr(sys, 'frozen', False):
    ROOT_DIR = Path(sys.executable).parent
else:
    ROOT_DIR = Path(__file__).parent.parent

CONFIG_PATH = ROOT_DIR / "config.json"


DEFAULT_CONFIG = {
    "admin_password": "admin123",
    "allowed_directories": [],
    "thumbnail_quality": 85,
}


def load_config() -> dict:
    """Load config from file, creating default if missing."""
    if not CONFIG_PATH.exists():
        save_config(DEFAULT_CONFIG)
        return DEFAULT_CONFIG.copy()
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        save_config(DEFAULT_CONFIG)
        return DEFAULT_CONFIG.copy()


def save_config(config: dict) -> None:
    """Write config to file."""
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def get_allowed_directories() -> list:
    """Return only enabled directories."""
    config = load_config()
    return [d for d in config.get("allowed_directories", []) if d.get("enabled", True)]


def add_directory(path: str, name: str = None) -> bool:
    """Add a new directory to the allowed list. Returns False if already exists."""
    config = load_config()
    norm = os.path.normpath(path)

    for d in config["allowed_directories"]:
        if os.path.normpath(d["path"]) == norm:
            return False

    if name is None:
        name = os.path.basename(norm) or norm

    config["allowed_directories"].append({
        "path": norm,
        "name": name,
        "enabled": True,
    })
    save_config(config)
    return True


def remove_directory(path: str) -> None:
    """Remove a directory from the allowed list."""
    config = load_config()
    norm = os.path.normpath(path)
    config["allowed_directories"] = [
        d for d in config["allowed_directories"]
        if os.path.normpath(d["path"]) != norm
    ]
    save_config(config)


def toggle_directory(path: str, enabled: bool) -> None:
    """Enable or disable a directory."""
    config = load_config()
    norm = os.path.normpath(path)
    for d in config["allowed_directories"]:
        if os.path.normpath(d["path"]) == norm:
            d["enabled"] = enabled
            break
    save_config(config)


def verify_password(password: str) -> bool:
    """Check admin password."""
    config = load_config()
    return password == config.get("admin_password", "admin123")


def change_password(new_password: str) -> None:
    """Update admin password."""
    config = load_config()
    config["admin_password"] = new_password
    save_config(config)
