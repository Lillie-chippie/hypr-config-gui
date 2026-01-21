#!/usr/bin/env python3
"""
Hyprland Configuration GUI - Backend Server
Manages keybinds, hypridle timeouts, and wallpapers
"""

from flask import Flask, jsonify, request, send_from_directory
import os
import re
import shutil
from pathlib import Path
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='.')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Paths
HOME = Path.home()
HYPR_CONFIG = HOME / '.config' / 'hypr'
KEYBINDS_FILE = HYPR_CONFIG / 'keybinds.conf'
HYPRIDLE_FILE = HYPR_CONFIG / 'hypridle.conf'
HYPRPAPER_FILE = HYPR_CONFIG / 'hyprpaper.conf'
WALLPAPER_DIR = HOME / 'wallpaper'

# Ensure directories exist
WALLPAPER_DIR.mkdir(exist_ok=True)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# ============================================================================
# KEYBINDS API
# ============================================================================

@app.route('/api/keybinds', methods=['GET'])
def get_keybinds():
    """Get all keybindings from keybinds.conf"""
    try:
        keybinds = []
        with open(KEYBINDS_FILE, 'r') as f:
            lines = f.readlines()
        
        current_category = "General"
        for i, line in enumerate(lines):
            line = line.strip()
            
            # Detect category comments
            if line.startswith('#') and not line.startswith('##'):
                current_category = line.strip('# ').strip()
                continue
            
            # Parse bind lines
            if line.startswith('bind') and '=' in line:
                parts = line.split('=', 1)
                if len(parts) == 2:
                    bind_type = parts[0].strip()
                    bind_content = parts[1].strip()
                    
                    # Parse: modifier, key, action, command
                    bind_parts = [p.strip() for p in bind_content.split(',')]
                    if len(bind_parts) >= 3:
                        keybinds.append({
                            'id': i,
                            'category': current_category,
                            'type': bind_type,
                            'modifier': bind_parts[0],
                            'key': bind_parts[1],
                            'action': bind_parts[2],
                            'command': ','.join(bind_parts[3:]) if len(bind_parts) > 3 else '',
                            'original': line
                        })
        
        return jsonify(keybinds)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/keybinds', methods=['POST'])
def save_keybinds():
    """Save keybindings to keybinds.conf"""
    try:
        data = request.json
        keybinds = data.get('keybinds', [])
        deleted_ids = set(data.get('deleted_ids', []))
        new_keybinds = data.get('new_keybinds', [])
        
        # Read original file to preserve structure
        with open(KEYBINDS_FILE, 'r') as f:
            lines = f.readlines()
        
        # Create a map of line numbers to new keybinds
        updates = {kb['id']: kb for kb in keybinds if 'id' in kb}
        
        # Update lines
        new_lines = []
        for i, line in enumerate(lines):
            # Skip deleted lines
            if i in deleted_ids:
                continue
                
            if i in updates:
                kb = updates[i]
                # Reconstruct the bind line
                if kb.get('command'):
                    new_line = f"{kb.get('type', 'bind')} = {kb['modifier']}, {kb['key']}, {kb['action']}, {kb['command']}\n"
                else:
                    new_line = f"{kb.get('type', 'bind')} = {kb['modifier']}, {kb['key']}, {kb['action']}\n"
                new_lines.append(new_line)
            else:
                new_lines.append(line)
        
        # Append new keybinds
        if new_keybinds:
            new_lines.append("\n# New Keybinds\n")
            for kb in new_keybinds:
                if kb.get('command'):
                    new_line = f"{kb.get('type', 'bind')} = {kb['modifier']}, {kb['key']}, {kb['action']}, {kb['command']}\n"
                else:
                    new_line = f"{kb.get('type', 'bind')} = {kb['modifier']}, {kb['key']}, {kb['action']}\n"
                new_lines.append(new_line)

        # Write back
        with open(KEYBINDS_FILE, 'w') as f:
            f.writelines(new_lines)
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# HYPRIDLE API
# ============================================================================

@app.route('/api/hypridle', methods=['GET'])
def get_hypridle():
    """Get hypridle timeout configuration"""
    try:
        with open(HYPRIDLE_FILE, 'r') as f:
            content = f.read()
        
        # Parse listeners
        listeners = []
        listener_pattern = r'listener\s*\{([^}]+)\}'
        
        for match in re.finditer(listener_pattern, content, re.DOTALL):
            listener_content = match.group(1)
            
            # Extract timeout
            timeout_match = re.search(r'timeout\s*=\s*(\d+)', listener_content)
            timeout = int(timeout_match.group(1)) if timeout_match else 0
            
            # Extract on-timeout action
            on_timeout_match = re.search(r'on-timeout\s*=\s*(.+?)(?:\n|$)', listener_content)
            on_timeout = on_timeout_match.group(1).strip() if on_timeout_match else ''
            
            # Determine listener type
            listener_type = 'unknown'
            if 'brightnessctl' in on_timeout and 'kbd_backlight' not in on_timeout:
                listener_type = 'screen_dim'
            elif 'kbd_backlight' in on_timeout:
                listener_type = 'keyboard_backlight'
            elif 'lock-session' in on_timeout:
                listener_type = 'lock'
            elif 'dpms off' in on_timeout:
                listener_type = 'screen_off'
            elif 'suspend' in on_timeout:
                listener_type = 'suspend'
            
            listeners.append({
                'type': listener_type,
                'timeout': timeout,
                'action': on_timeout
            })
        
        return jsonify(listeners)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/hypridle', methods=['POST'])
def save_hypridle():
    """Save hypridle timeout configuration"""
    try:
        data = request.json
        listeners = data.get('listeners', [])
        
        # Read template
        with open(HYPRIDLE_FILE, 'r') as f:
            content = f.read()
        
        # Update timeouts
        listener_map = {l['type']: l['timeout'] for l in listeners}
        
        # Replace timeouts in content
        def replace_timeout(match):
            listener_content = match.group(1)
            
            # Determine type
            listener_type = None
            if 'brightnessctl' in listener_content and 'kbd_backlight' not in listener_content:
                listener_type = 'screen_dim'
            elif 'kbd_backlight' in listener_content:
                listener_type = 'keyboard_backlight'
            elif 'lock-session' in listener_content:
                listener_type = 'lock'
            elif 'dpms off' in listener_content:
                listener_type = 'screen_off'
            elif 'suspend' in listener_content:
                listener_type = 'suspend'
            
            if listener_type and listener_type in listener_map:
                new_timeout = listener_map[listener_type]
                listener_content = re.sub(r'timeout\s*=\s*\d+', f'timeout = {new_timeout}', listener_content)
            
            return f'listener {{{listener_content}}}'
        
        new_content = re.sub(r'listener\s*\{([^}]+)\}', replace_timeout, content, flags=re.DOTALL)
        
        # Write back
        with open(HYPRIDLE_FILE, 'w') as f:
            f.write(new_content)
        
        # Restart hypridle if running
        os.system('killall hypridle 2>/dev/null; hypridle &')
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# WALLPAPER API
# ============================================================================

@app.route('/api/wallpapers', methods=['GET'])
def get_wallpapers():
    """Get list of available wallpapers"""
    try:
        wallpapers = []
        for file in WALLPAPER_DIR.glob('*'):
            if file.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp']:
                wallpapers.append({
                    'name': file.name,
                    'path': str(file),
                    'size': file.stat().st_size
                })
        
        # Get current wallpaper
        current = None
        if HYPRPAPER_FILE.exists():
            with open(HYPRPAPER_FILE, 'r') as f:
                content = f.read()
                match = re.search(r'wallpaper\s*=\s*,(.+)', content)
                if match:
                    current = Path(match.group(1).strip()).name
        
        return jsonify({
            'wallpapers': wallpapers,
            'current': current
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/wallpapers/upload', methods=['POST'])
def upload_wallpaper():
    """Upload a new wallpaper"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        filename = secure_filename(file.filename)
        filepath = WALLPAPER_DIR / filename
        file.save(filepath)
        
        return jsonify({'success': True, 'filename': filename})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/wallpapers/set', methods=['POST'])
def set_wallpaper():
    """Set active wallpaper"""
    try:
        data = request.json
        wallpaper_name = data.get('name')
        
        if not wallpaper_name:
            return jsonify({'error': 'No wallpaper name provided'}), 400
        
        wallpaper_path = WALLPAPER_DIR / wallpaper_name
        if not wallpaper_path.exists():
            return jsonify({'error': 'Wallpaper not found'}), 404
        
        # Update hyprpaper.conf
        if HYPRPAPER_FILE.exists():
            with open(HYPRPAPER_FILE, 'r') as f:
                content = f.read()
            
            # Update preload and wallpaper lines
            content = re.sub(r'preload\s*=\s*.+', f'preload = {wallpaper_path}', content)
            content = re.sub(r'wallpaper\s*=\s*,.+', f'wallpaper = ,{wallpaper_path}', content)
            
            with open(HYPRPAPER_FILE, 'w') as f:
                f.write(content)
            
            # Reload hyprpaper
            os.system('killall hyprpaper 2>/dev/null; hyprpaper &')
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/wallpapers/delete', methods=['POST'])
def delete_wallpaper():
    """Delete a wallpaper"""
    try:
        data = request.json
        wallpaper_name = data.get('name')
        
        if not wallpaper_name:
            return jsonify({'error': 'No wallpaper name provided'}), 400
        
        wallpaper_path = WALLPAPER_DIR / wallpaper_name
        if wallpaper_path.exists():
            wallpaper_path.unlink()
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Wallpaper not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/wallpapers/preview/<filename>')
def preview_wallpaper(filename):
    """Serve wallpaper preview"""
    return send_from_directory(WALLPAPER_DIR, filename)

if __name__ == '__main__':
    print("🚀 Hyprland Configuration GUI")
    print(f"📂 Config: {HYPR_CONFIG}")
    print(f"🖼️  Wallpapers: {WALLPAPER_DIR}")
    print("🌐 Open http://localhost:5000 in your browser")
    app.run(host='0.0.0.0', port=5000, debug=True)
