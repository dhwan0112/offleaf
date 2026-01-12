#!/bin/bash
# OffLeaf Essential LaTeX Packages Installer
# This script installs commonly used LaTeX packages for OffLeaf

echo "OffLeaf: Installing essential LaTeX packages..."

# Check if tlmgr is available
if ! command -v tlmgr &> /dev/null; then
    echo "Error: TeX Live Manager (tlmgr) not found."
    echo "Please install TeX Live first: https://www.tug.org/texlive/"
    exit 1
fi

# Essential packages list
PACKAGES=(
    # Korean/CJK support
    "kotex-utf"
    "cjk"
    "xecjk"
    # Math
    "amsmath"
    "amssymb"
    "amsfonts"
    "mathtools"
    # Graphics
    "graphicx"
    "xcolor"
    "pgf"
    # Tables
    "booktabs"
    "array"
    "tabularx"
    "longtable"
    # Fonts
    "fontspec"
    # Layout
    "geometry"
    "fancyhdr"
    "titlesec"
    # References
    "hyperref"
    "biblatex"
    # Code
    "listings"
    # Misc
    "enumitem"
    "caption"
    "float"
)

# Install packages
INSTALLED=0
FAILED=0

for pkg in "${PACKAGES[@]}"; do
    echo "Installing $pkg..."
    if tlmgr install "$pkg" 2>/dev/null; then
        ((INSTALLED++))
    else
        echo "  Warning: Failed to install $pkg (may already be installed)"
        ((FAILED++))
    fi
done

echo ""
echo "Installation complete!"
echo "  Installed: $INSTALLED packages"
echo "  Skipped/Failed: $FAILED packages"
echo ""
echo "You can now use OffLeaf with full LaTeX support."
