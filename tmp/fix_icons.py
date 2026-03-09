import os
from PIL import Image

icondir = "/Users/davy/merry-moments/merry360x_mobile/ios-app/Merry360xMobile/Assets.xcassets/AppIcon.appiconset"

for fname in os.listdir(icondir):
    if not fname.endswith(".png"):
        continue
    path = os.path.join(icondir, fname)
    img = Image.open(path)
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        if img.mode == "RGBA":
            background.paste(img, mask=img.split()[3])
        else:
            background.paste(img)
        background.save(path, "PNG")
        print(f"Fixed: {fname}")
    else:
        print(f"Skipped (no alpha): {fname}")
