#!/usr/bin/env python3
"""
Resize screenshots to Chrome Web Store standard dimensions (1280x800)
"""

import os
from PIL import Image

def resize_screenshot(input_path, output_path, target_size=(1280, 800)):
    """Resize image to target size while maintaining aspect ratio."""
    try:
        with Image.open(input_path) as img:
            # Resize to exact dimensions (1280x800)
            resized = img.resize(target_size, Image.Resampling.LANCZOS)
            resized.save(output_path, 'PNG', optimize=True)
            print(f"Resized {input_path} -> {output_path} ({target_size[0]}x{target_size[1]})")
            return True
    except Exception as e:
        print(f"Error resizing {input_path}: {e}")
        return False

def main():
    screenshots = [
        'screenshot-1-main-en.png',
        'screenshot-1-main-cn.png', 
        'screenshot-2-settings-en.png',
        'screenshot-2-settings-cn.png'
    ]
    
    success_count = 0
    
    for screenshot in screenshots:
        if os.path.exists(screenshot):
            base_name = os.path.splitext(screenshot)[0]
            output_name = f"{base_name}-1280x800.png"
            
            if resize_screenshot(screenshot, output_name):
                success_count += 1
        else:
            print(f"Warning: {screenshot} not found")
    
    print(f"\nSuccessfully resized {success_count} screenshots")

if __name__ == '__main__':
    # Check if PIL is available
    try:
        from PIL import Image
        main()
    except ImportError:
        print("PIL/Pillow not found. Installing...")
        os.system('pip3 install Pillow')
        from PIL import Image
        main()