@echo off
echo ========================================================
echo  Starting StudyMate AI - AI-Powered Study Companion
echo ========================================================
echo Installing requirements...
python -m pip install -r requirements.txt
echo.
echo Launching server at http://127.0.0.1:5000...
start http://127.0.0.1:5000
python app.py
pause

