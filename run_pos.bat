@echo off

cd /d C:\Projects\18_Retail_POS_System

start "Wa Wa POS Server" cmd /k ".venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

start "" "http://127.0.0.1:8000/pos/"

exit