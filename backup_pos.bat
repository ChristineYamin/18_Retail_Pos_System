@echo off

cd /d C:\Projects\18_Retail_POS_System

if not exist "backups" mkdir "backups"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set TIMESTAMP=%%i

for /f "tokens=1,* delims==" %%A in ('findstr /B "DB_PASSWORD=" .env') do set PGPASSWORD=%%B

echo ========================================
echo       Wa Wa POS Database Backup
echo ========================================
echo.
echo Creating backup...
echo.

"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" ^
-h localhost ^
-p 5432 ^
-U postgres ^
-F c ^
-f "backups\pos_backup_%TIMESTAMP%.backup" ^
reatail_pos_db

if errorlevel 1 goto FAILED

set PGPASSWORD=

echo.
echo ========================================
echo Backup completed successfully.
echo ========================================
echo.
echo Saved in:
echo C:\Projects\18_Retail_POS_System\backups
echo.

pause
exit /b


:FAILED

set PGPASSWORD=

echo.
echo ========================================
echo BACKUP FAILED
echo ========================================
echo.
echo Please do not ignore this error.
echo.

pause