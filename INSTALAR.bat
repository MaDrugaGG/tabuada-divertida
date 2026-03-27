@echo off
echo ====================================
echo   Configurando Tabuada Divertida
echo ====================================
echo.

cd /d E:\tabuada-app

echo [1/3] Instalando dependencias...
call npm install
if errorlevel 1 (
    echo ERRO: npm falhou. Verifique se o Node.js esta instalado.
    pause
    exit /b 1
)

echo.
echo [2/3] Adicionando plataforma Android...
call npx cap add android
if errorlevel 1 (
    echo ERRO ao adicionar Android.
    pause
    exit /b 1
)

echo.
echo [3/3] Copiando arquivos...
call npx cap sync android

echo.
echo ====================================
echo   PRONTO! Agora:
echo   1. Abra o Android Studio
echo   2. Clique em "Open" e selecione:
echo      E:\tabuada-app\android
echo   3. Aguarde o Gradle sincronizar
echo   4. Menu Build > Build APK(s)
echo   5. O APK estara em:
echo      android\app\build\outputs\apk\debug\
echo ====================================
echo.
pause
