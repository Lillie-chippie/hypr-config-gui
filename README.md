# 🎨 Hyprland Configuration GUI

A modern, web-based GUI tool to easily manage your Hyprland configuration.

![Hyprland Config GUI](https://img.shields.io/badge/Hyprland-Config-7aa2f7?style=for-the-badge)

my dotfiles : https://github.com/Lillie-chippie/dotfiles

## ✨ Features

### 🎹 Keybinds Manager
- View all keybindings in an organized table
- Edit existing keybindings
- Search and filter keybindings
- Categorized by function

### ⏱️ Hypridle Timeout Manager
- Visual sliders for timeout configuration
- Real-time preview of values
- Preset configurations:
  - 🔋 Power Saver (aggressive timeouts)
  - ⚖️ Balanced (default)
  - ⚡ Performance (relaxed timeouts)
- Automatically restarts hypridle after saving

### 🖼️ Wallpaper Manager
- Grid view of all wallpapers
- Upload new wallpapers (drag & drop)
- Set active wallpaper with one click
- Delete unwanted wallpapers
- Live preview

## 📦 Installation

### Prerequisites

```bash
# Install Python dependencies
cd hypr-config-gui
pip install -r requirements.txt
```

## 🚀 Usage

1. **Start the server:**
   ```bash
   cd hypr-config-gui
   python hypr-config-gui.py
   ```

2. **Open in browser:**
   Navigate to `http://localhost:5000`

3. **Make your changes:**
   - Switch between tabs to manage different aspects
   - Changes are saved to your Hyprland config files
   - Hypridle is automatically restarted when you save timeouts

## 🎯 Quick Start

```bash
# Navigate to the tool directory
cd ~/Downloads/dotfiles-main/hypr-config-gui

# Install dependencies (first time only)
pip install -r requirements.txt

# Run the application
python hypr-config-gui.py
```

Then open `http://localhost:5000` in your browser!

## 📁 Configuration Files

The tool manages these files:
- `~/.config/hypr/keybinds.conf` - Keyboard shortcuts
- `~/.config/hypr/hypridle.conf` - Idle timeouts
- `~/.config/hypr/hyprpaper.conf` - Wallpaper settings
- `~/wallpaper/` - Wallpaper directory

## 🎨 Screenshots

The interface features:
- 🌙 Dark theme matching Hyprland aesthetics
- ✨ Smooth animations and transitions
- 📱 Responsive design
- 🎯 Intuitive controls

## ⚠️ Important Notes

- **Backup your configs** before making changes
- The tool directly modifies your Hyprland configuration files
- Hypridle is automatically restarted when you save timeout changes
- Wallpaper changes require hyprpaper to be running

## 🛠️ Troubleshooting

**Port already in use:**
```bash
# Kill any existing instance
killall python
# Or use a different port
python hypr-config-gui.py --port 5001
```

**Can't connect to server:**
- Make sure the server is running
- Check that port 5000 is not blocked by firewall
- Try accessing via `http://127.0.0.1:5000`

## 📝 License

MIT License - Feel free to modify and distribute!

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

---

Made with ❤️ for the Hyprland community
