#!/bin/sh
set -e

# Change to the directory where the script is located
cd "$(dirname "$0")"

# Virtual environment directory
VENV_DIR="venv"

# Check if python3 is available
if ! command -v python3 >/dev/null 2>&1; then
    echo "❌ Error: python3 is not installed."
    exit 1
fi

# Check if venv exists but is broken
if [ -d "$VENV_DIR" ] && [ ! -f "$VENV_DIR/bin/activate" ]; then
    echo "⚠️  Broken virtual environment detected. Recreating..."
    rm -rf "$VENV_DIR"
fi

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating virtual environment..."
    # Try standard creation
    if ! python3 -m venv "$VENV_DIR" >/dev/null 2>&1; then
        echo "⚠️  Standard venv creation failed (likely missing ensurepip)."
        echo "🔄 Retrying without pip..."
        
        # Retry without pip
        if ! python3 -m venv --without-pip "$VENV_DIR"; then
             echo "❌ Error: Failed to create virtual environment."
             echo "💡 System seems to lack python3-venv. Please run:"
             echo "   sudo apt install python3-venv"
             exit 1
        fi
        
        echo "⚠️  Virtual environment created WITHOUT pip."
        echo "   You will need to manually install dependencies or install 'python3-venv' and 'python3-pip' on your system."
        
        echo "❌ Cannot automatically install dependencies."
        echo "💡 Recommended fix: sudo apt install python3-full"
        exit 1
    fi
fi

# Activate virtual environment
if [ -f "$VENV_DIR/bin/activate" ]; then
    . "$VENV_DIR/bin/activate"
else
    echo "❌ Error: Virtual environment activation script not found."
    exit 1
fi

# Check for pip in the venv
if ! command -v pip >/dev/null 2>&1; then
    echo "❌ Error: 'pip' is not installed in the virtual environment."
    echo "   This usually means your system Python is missing 'ensurepip' or 'venv' support."
    
    # Try to auto-fix on Debian/Ubuntu
    if command -v apt-get >/dev/null 2>&1; then
        echo ""
        echo "🤔 It looks like you are on a Debian/Ubuntu-based system."
        echo "   Do you want to attempt to install 'python3-venv' and 'python3-pip'? (sudo required)"
        printf "   [y/N] "
        read -r answer
        if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
            echo "🔑 Please enter your password if prompted:"
            if sudo apt-get update && sudo apt-get install -y python3-venv python3-pip; then
                echo "✅ System packages installed. Recreating venv..."
                rm -rf "$VENV_DIR"
                python3 -m venv "$VENV_DIR"
                . "$VENV_DIR/bin/activate"
                
                # Re-check pip
                if command -v pip >/dev/null 2>&1; then
                     echo "🎉 Virtual environment fixed!"
                else
                     echo "❌ Still failed to find pip. Please install manually."
                     exit 1
                fi
            else
                echo "❌ Failed to install packages."
                exit 1
            fi
        else
            echo "❌ Aborting. Please install 'python3-venv' and 'python3-pip' manually."
            exit 1
        fi
    else
        echo "💡 Please install the equivalent of 'python3-venv' and 'python3-pip' for your distro."
        echo "   Then delete the 'venv' folder and run this script again."
        exit 1
    fi
fi

# Update pip
pip install --upgrade pip >/dev/null 2>&1

# Install dependencies
if [ -f "requirements.txt" ]; then
    echo "⬇️  Installing dependencies..."
    if ! pip install -r requirements.txt; then
        echo "❌ Error: Failed to install dependencies."
        exit 1
    fi
else
    echo "⚠️  Warning: requirements.txt not found."
fi

# Run the application
echo "🚀 Starting Hyprland Config GUI..."
python hypr-config-gui.py
