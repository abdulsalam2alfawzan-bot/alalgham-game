@echo off
cd /d C:\Projects\alalgham-game

echo Building project...
call npm.cmd run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo Deploying to Firebase...
call firebase.cmd deploy --only hosting
if errorlevel 1 (
  echo Firebase deploy failed.
  pause
  exit /b 1
)

echo Saving to GitHub...
git add .
git commit -m "Update Alalgham game"
git push

echo Done.
pause