@echo off
title MindVault - Second Brain & Knowledge Graph Server
echo ======================================================
echo Starting MindVault Full-Stack Server on port 4321...
echo Open your browser at: http://localhost:4321
echo ======================================================
if exist "C:\Users\Admin\AppData\Roaming\Antigravity\bin\agy-node.cmd" (
    call "C:\Users\Admin\AppData\Roaming\Antigravity\bin\agy-node.cmd" "%~dp0server\index.js"
) else (
    node "%~dp0server\index.js"
)
pause
