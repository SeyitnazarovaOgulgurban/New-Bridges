@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set "ROOT=%cd%"
set "NODE=%ROOT%\node\node.exe"
set "VITE=%ROOT%\node_modules\vite\bin\vite.js"

if not exist "%NODE%" (
    echo [错误] 未找到内置 node.exe，请确认 node 文件夹完整。
    pause
    exit /b 1
)

echo 正在构建项目...
"%NODE%" "%VITE%" build --config config/vite.config.ts
if errorlevel 1 (
    echo [错误] 构建失败。
) else (
    echo 构建完成！
)
pause
