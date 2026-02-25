@echo off
chcp 65001 >nul 2>&1
title 压力测试 - 测试最大并发用户数
color 0E
cls

echo.
echo ========================================
echo   压力测试工具
echo ========================================
echo.
echo 此工具将测试服务器能同时处理多少用户
echo.

cd /d "%~dp0\server"

echo [检查] 确保服务器正在运行...
netstat -ano | findstr ":8000" >nul 2>&1
if errorlevel 1 (
    echo [X] 服务器未运行，请先启动服务器
    echo.
    pause
    exit /b 1
)

echo [OK] 服务器正在运行
echo.

echo [提示] 测试配置：
echo   - 并发用户数: 10
echo   - 每用户请求数: 20
echo   - 总请求数: 200
echo.

echo 开始压力测试...
echo.

node load_test.js

echo.
pause
