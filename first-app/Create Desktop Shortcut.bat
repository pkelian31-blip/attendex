@echo off
echo Creating AttendX desktop shortcut...

set SCRIPT="%TEMP%\CreateShortcut.vbs"
set TARGET="%~dp0Launch AttendX.bat"
set SHORTCUT="%USERPROFILE%\Desktop\AttendX.lnk"
set ICON="%~dp0public\logo.svg"

echo Set oWS = WScript.CreateObject("WScript.Shell") > %SCRIPT%
echo sLinkFile = %SHORTCUT% >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = %TARGET% >> %SCRIPT%
echo oLink.WorkingDirectory = "%~dp0" >> %SCRIPT%
echo oLink.Description = "AttendX - Smart Attendance Platform" >> %SCRIPT%
echo oLink.WindowStyle = 1 >> %SCRIPT%
echo oLink.Save >> %SCRIPT%

cscript /nologo %SCRIPT%
del %SCRIPT%

echo.
echo  Done! AttendX shortcut created on your Desktop.
echo  Double-click "AttendX" on your desktop to launch the app.
echo.
pause
