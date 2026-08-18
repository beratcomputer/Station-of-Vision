@echo off
title Station of Vision - Server

:: Garanti olarak bu dosyanin bulundugu proje klasorune gec (Yonetici olarak calistirilsa bile)
cd /d "%~dp0"

echo ===================================================
echo   Station of Vision - Yerel Medya Sunucusu
echo ===================================================
echo.

:: Get real Local IP address using Python socket
for /f "tokens=*" %%i in ('python -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('8.8.8.8', 80)); print(s.getsockname()[0]); s.close()" 2^>nul') do set IP=%%i

if "%IP%"=="" (
    set IP=192.168.1.111
)

echo [Bilgi] Sunucu baslatiliyor...
echo.
echo - Kendi bilgisayarinizdan erisim:
echo   Ana Sayfa:    http://localhost:8000
echo   Admin Paneli: http://localhost:8000/admin  (Sifre: admin123)
echo.
echo - Ayni agdaki diger cihazlardan (Telefon / Tablet / TV):
echo   http://%IP%:8000
echo.
echo ===================================================
echo [Durdurmak icin bu pencereyi kapatabilir veya Ctrl+C yapabilirsiniz]
echo.

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
pause
