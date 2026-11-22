# Erzeugt die Bitmap-Schrift (BMFont-Textformat + PNG) für das Zifferblatt aus Share Tech Mono.
# Aufruf: python3 make_font.py ShareTechMono-Regular.ttf <Pixelgröße> <Ausgabeordner> <Name>
# Ziffern gleich breit, damit die Geisterziffern "8" genau hinter den Werten liegen.
# Abstand zwischen Zeichen wie im Konzept (+10 % der Schriftgröße).
import sys, os
from PIL import Image, ImageDraw, ImageFont

ttf, size, out, name = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
CHARS = " 0123456789:%°.,+-–/?ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ"
font = ImageFont.truetype(ttf, size)
asc, desc = font.getmetrics()
cap = font.getbbox("8")  # Ziffernhöhe als Bezug
cap_top, cap_bottom = cap[1], cap[3]
pad = max(1, round(size * 0.12))
line = (cap_bottom - cap_top) + 2 * pad          # Zeilenhöhe = Ziffernhöhe + Rand, damit VCENTER die Ziffern mittig setzt
spacing = round(size * 0.1)
adv = round(font.getlength("8")) + spacing

glyphs = []
for ch in CHARS:
    bb = font.getbbox(ch)
    w = max(1, bb[2] - bb[0]); h = max(1, bb[3] - bb[1])
    glyphs.append((ch, bb, w, h))

W = 512
x = y = 1; rowh = 0; pos = {}
for ch, bb, w, h in glyphs:
    if x + w + 1 > W:
        x = 1; y += rowh + 1; rowh = 0
    pos[ch] = (x, y); x += w + 1; rowh = max(rowh, h)
H = 1
while H < y + rowh + 2: H *= 2
img = Image.new("RGBA", (W, H), (255, 255, 255, 0))
mask = Image.new("L", (W, H), 0)
d = ImageDraw.Draw(mask)
lines = []
for ch, bb, w, h in glyphs:
    px, py = pos[ch]
    d.text((px - bb[0], py - bb[1]), ch, font=font, fill=255)
    lines.append(f'char id={ord(ch)} x={px} y={py} width={w} height={h} xoffset={bb[0]} yoffset={bb[1] - cap_top + pad} xadvance={adv} page=0 chnl=15')
img.putalpha(mask)
os.makedirs(out, exist_ok=True)
img.save(os.path.join(out, f"{name}.png"))
with open(os.path.join(out, f"{name}.fnt"), "w") as f:
    f.write(f'info face="ShareTechMono" size={size} bold=0 italic=0 charset="" unicode=1 stretchH=100 smooth=1 aa=1 padding=0,0,0,0 spacing=1,1\n')
    f.write(f'common lineHeight={line} base={cap_bottom - cap_top + pad} scaleW={W} scaleH={H} pages=1 packed=0\n')
    f.write(f'page id=0 file="{name}.png"\n')
    f.write(f'chars count={len(lines)}\n')
    f.write("\n".join(lines) + "\n")
print(name, "Zeilenhöhe", line, "Zeichenbreite", adv)
