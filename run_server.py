"""
Station of Vision - Standalone Server Runner
Entrypoint for PyInstaller EXE build and direct execution.
"""

import sys
import os
import uvicorn
import socket

# Ensure working directory is the script / executable directory
if getattr(sys, 'frozen', False):
    # Running in a PyInstaller bundle
    BASE_DIR = os.path.dirname(sys.executable)
else:
    # Running in normal Python environment
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

os.chdir(BASE_DIR)
sys.path.insert(0, BASE_DIR)

from app.main import app

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

if __name__ == '__main__':
    local_ip = get_local_ip()
    print("=" * 60)
    print("  🎬 STATION OF VISION - STANDALONE SERVER")
    print("=" * 60)
    print(f"  📌 Bu Bilgisayardan:    http://localhost:8000")
    print(f"  📱 Yerel Ağdan:         http://{local_ip}:8000")
    print(f"  🔐 Yönetici Paneli:      http://localhost:8000/admin")
    print("=" * 60)
    print("  [Durdurmak icin pencereyi kapatabilir veya Ctrl+C yapabilirsiniz]\n")

    # Start Uvicorn programmatically
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
