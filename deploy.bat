@echo off
REM Quick deployment script for Resonance Body Map (Windows)

echo.
echo 🎵 Resonance Body Map - Deployment Script
echo ==========================================
echo.

REM Check if git is initialized
if not exist .git (
    echo 📦 Initializing git repository...
    git init
    echo.
)

REM Check if remote exists
git remote | findstr "origin" >nul
if errorlevel 1 (
    echo ⚠️  No git remote found.
    echo Please enter your GitHub repository URL:
    echo Example: https://github.com/username/resonance-body-map.git
    set /p repo_url="Repository URL: "
    
    if not "!repo_url!"=="" (
        git remote add origin "!repo_url!"
        echo ✅ Remote added: !repo_url!
    ) else (
        echo ❌ No URL provided. Exiting.
        exit /b 1
    )
    echo.
)

REM Stage all changes
echo 📝 Staging changes...
git add .
echo.

REM Commit
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Update Resonance Body Map

git commit -m "%commit_msg%"
echo.

REM Push
echo 🚀 Pushing to GitHub...
git branch -M main
git push -u origin main

echo.
echo ✅ Deployment complete!
echo.
echo 📱 Next steps:
echo 1. Go to your GitHub repository
echo 2. Click Settings → Pages
echo 3. Select 'main' branch as source
echo 4. Wait 1-2 minutes for deployment
echo 5. Your app will be live at: https://YOUR-USERNAME.github.io/REPO-NAME/
echo.
echo 🎉 Done!
echo.
pause
