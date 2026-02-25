@echo off
chcp 65001 >nul 2>&1
title Counting Helper - 制作发布包
cd /d "%~dp0"

set "OUT=CountingHelper-使用包"
set "JAR=counting-helper-backend-1.0.0.jar"

echo.
echo ========================================
echo   Counting Helper - 制作发布包
echo ========================================
echo   生成后：把 %OUT% 文件夹压缩发给别人，
echo   对方解压后双击「启动.bat」即可使用（需已安装 Java）。
echo ========================================
echo.

REM 1. 构建前端
echo [1/4] 构建前端...
cd frontend
call npm run build
if errorlevel 1 (
    echo [ERROR] 前端构建失败，请先安装 Node.js 并 npm install
    cd ..
    pause
    exit /b 1
)
cd ..

REM 2. 复制前端到后端
echo [2/4] 复制前端到后端...
if not exist "backend-java\src\main\resources\static" mkdir "backend-java\src\main\resources\static"
xcopy /E /Y /Q "frontend\dist\*" "backend-java\src\main\resources\static\"
cd backend-java
call mvn package -DskipTests -q
if errorlevel 1 (
    echo [ERROR] 后端打包失败，请检查 Maven 和 Java
    cd ..
    pause
    exit /b 1
)
cd ..

REM 3. 创建发布目录
echo [3/4] 创建发布目录...
if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%"
mkdir "%OUT%\database"

copy /Y "backend-java\target\%JAR%" "%OUT%\" >nul
xcopy /E /Y /Q "database\*" "%OUT%\database\" >nul 2>&1

REM 4. 写入 启动.bat（解压后用户双击这个即可）
echo [4/4] 写入 启动.bat...
(
echo @echo off
echo chcp 65001 ^>nul 2^>^&1
echo title Counting Helper
echo cd /d "%%~dp0"
echo.
echo where java ^>nul 2^>^&1
echo if errorlevel 1 ^(
echo     echo [ERROR] 未检测到 Java，请安装 Java 17 或更高版本
echo     echo 下载: https://adoptium.net/
echo     pause
echo     exit /b 1
echo ^)
echo.
echo set "DB_PATH=%%~dp0database\accounting.db"
echo if not exist "%%~dp0database" mkdir "%%~dp0database"
echo.
echo echo 正在启动，请稍候...
echo start /min cmd /c "timeout /t 12 /nobreak ^>nul ^&^& start http://localhost:8000"
echo java -jar "%%~dp0%JAR%"
echo pause
) > "%OUT%\启动.bat"

echo.
echo ========================================
echo   [OK] 发布包已生成: %OUT%\
echo ========================================
echo   内含: %JAR%, database\, 启动.bat
echo.
echo   使用方式:
echo   1. 将整个「%OUT%」文件夹压缩成 zip
echo   2. 发给对方，对方解压后双击「启动.bat」
echo   3. 对方电脑需已安装 Java 17+，无需 Node/Maven
echo.
explorer "%OUT%"
pause
