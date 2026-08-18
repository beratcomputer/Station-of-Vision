@echo off
title Station of Vision - EXE Builder
cd /d "%~dp0"

echo ===================================================
echo   Station of Vision - EXE Olusturucu (PyInstaller)
echo ===================================================
echo.
echo [Bilgi] Bagimsiz .EXE paketi olusturuluyor, lutfen bekleyin...
echo.

pyinstaller --noconfirm --onedir --name "StationOfVision" ^
    --add-data "templates;templates" ^
    --add-data "static;static" ^
    --hidden-import "uvicorn.logging" ^
    --hidden-import "uvicorn.loops" ^
    --hidden-import "uvicorn.loops.auto" ^
    --hidden-import "uvicorn.protocols" ^
    --hidden-import "uvicorn.protocols.http" ^
    --hidden-import "uvicorn.protocols.http.auto" ^
    --hidden-import "uvicorn.protocols.websockets" ^
    --hidden-import "uvicorn.protocols.websockets.auto" ^
    --hidden-import "uvicorn.lifespans" ^
    --hidden-import "uvicorn.lifespans.auto" ^
    --hidden-import "cv2" ^
    run_server.py

if exist "dist\StationOfVision" (
    echo.
    echo ===================================================
    echo [BASARILI] EXE paketi dist\StationOfVision klasorunde olusturuldu!
    echo Bu klasoru Python olmayan herhangi bir bilgisayara tasiyabilirsiniz.
    echo ===================================================
) else (
    echo.
    echo [HATA] Derleme sirasinda bir hata olustu.
)

pause
