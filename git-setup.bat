@echo off
echo ==========================================
echo    THE BRIDGE - Git Setup Script
echo ==========================================
echo.

echo 1. Checking Git status...
git status
echo.

echo 2. Adding all files...
git add .
echo.

echo 3. Making first commit...
git commit -m "Initial commit: The Bridge application with CSV functionality"
echo.

echo 4. Setting main branch...
git branch -M main
echo.

echo ==========================================
echo    NEXT STEPS:
echo ==========================================
echo.
echo 1. Go to GitHub.com and create a new repository
echo 2. Name it: "the-bridge-app" or similar
echo 3. Copy the repository URL
echo 4. Run: git remote add origin [YOUR_REPO_URL]
echo 5. Run: git push -u origin main
echo.
echo Example:
echo git remote add origin https://github.com/yourusername/the-bridge-app.git
echo git push -u origin main
echo.

pause 