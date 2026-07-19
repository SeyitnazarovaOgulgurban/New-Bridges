@echo off
chcp 65001 >nul
cd /d "%~dp0.."
set "ROOT=%cd%"
set "NODE=%ROOT%\node\node.exe"

if not exist "%NODE%" (
    echo [错误] 未找到内置 node.exe，请确认 node 文件夹完整。
    pause
    exit /b 1
)

if not exist "%ROOT%\dist\index.html" (
    echo [错误] 未找到 dist\index.html。
    pause
    exit /b 1
)

echo 正在启动预览服务器...
"%NODE%" "%ROOT%\scripts\serve.cjs"
pause
