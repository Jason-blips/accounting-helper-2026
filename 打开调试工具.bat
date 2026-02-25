@echo off
chcp 65001 >nul 2>&1
title 打开管理员权限调试工具
color 0B
cls

echo.
echo ========================================
echo   打开管理员权限调试工具
echo ========================================
echo.
echo 正在打开浏览器...
echo.

start http://localhost:3000/debug-admin.html

echo.
echo ✅ 调试工具已在浏览器中打开
echo.
echo 如果浏览器没有自动打开，请手动访问：
echo    http://localhost:3000/debug-admin.html
echo.
pause
