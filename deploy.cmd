@echo off
setlocal
cd /d "%~dp0"

echo Building project...
call npm.cmd run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

if not exist "out\index.html" (
  echo Static export failed: out\index.html was not generated.
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

echo.
set /p SAVE_GIT=Save these changes to GitHub now? (y/N): 
if /i "%SAVE_GIT%"=="Y" (
  echo Saving to GitHub...
  git status --short
  git add -- next.config.ts firebase.json deploy.cmd public src package.json package-lock.json
  if exist ".firebaserc" git add -- .firebaserc
  git diff --cached --quiet
  if errorlevel 1 (
    git commit -m "Update Alalgham game"
    if errorlevel 1 (
      echo Git commit failed.
      pause
      exit /b 1
    )

    git push
    if errorlevel 1 (
      echo Git push failed.
      pause
      exit /b 1
    )
  ) else (
    echo No Git changes to commit.
  )
) else (
  echo Skipping GitHub save.
)

echo Done.
pause
