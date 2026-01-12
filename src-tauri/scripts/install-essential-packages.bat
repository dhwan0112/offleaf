@echo off
REM OffLeaf Essential LaTeX Packages Installer
REM This script installs commonly used LaTeX packages for OffLeaf

echo OffLeaf: Installing essential LaTeX packages...

REM Check if tlmgr is available
where tlmgr >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: TeX Live Manager (tlmgr) not found.
    echo Please install TeX Live first: https://www.tug.org/texlive/
    exit /b 1
)

REM Essential packages list
set PACKAGES=kotex-utf cjk xecjk amsmath amssymb amsfonts mathtools graphicx xcolor pgf booktabs array tabularx longtable fontspec geometry fancyhdr titlesec hyperref biblatex listings enumitem caption float

REM Install packages
set INSTALLED=0
set FAILED=0

for %%p in (%PACKAGES%) do (
    echo Installing %%p...
    tlmgr install %%p 2>nul
    if %ERRORLEVEL% equ 0 (
        set /a INSTALLED+=1
    ) else (
        echo   Warning: Failed to install %%p (may already be installed)
        set /a FAILED+=1
    )
)

echo.
echo Installation complete!
echo   Installed: %INSTALLED% packages
echo   Skipped/Failed: %FAILED% packages
echo.
echo You can now use OffLeaf with full LaTeX support.
pause
