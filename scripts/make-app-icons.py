"""필름함 앱 아이콘 생성기 (라운드 · 검정 배경 · 오렌지 라인).

docs/icon/ 의 원본 SVG를 만들고, 아이폰·웹·갤럭시(Expo)·안드로이드(TWA) 아이콘 PNG/WebP를 다시 뽑습니다.
필요: pip install cairosvg pillow
실행: python3 scripts/make-app-icons.py
"""
import io, os
import cairosvg
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG, INK = "#141414", "#F0701E"

def glyph(ink, scale):
    holes = "".join(
        f'<rect x="{x}" y="{y}" width="30" height="30" rx="7" fill="{ink}"/>'
        for x, y in [(563, 463), (613, 463), (663, 463), (563, 577)]
    )
    return f'''<g transform="translate(512,512) scale({scale}) translate(-499,-508)">
  <g fill="none" stroke="{ink}" stroke-width="33" stroke-linejoin="round" stroke-linecap="round">
    <rect x="292" y="356" width="232" height="360" rx="40"/>
    <path d="M364 356V316Q364 292 388 292H428Q452 292 452 316V356"/>
    <path d="M524 420H708Q732 420 732 444V548Q732 572 708 572H676Q652 572 652 596V628Q652 652 628 652H524"/>
  </g>{holes}</g>'''

def svg(body, bg=None):
    b = f'<rect width="1024" height="1024" fill="{bg}"/>' if bg else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">{b}{body}</svg>'

FULL = svg(glyph(INK, 1.18), BG)                 # 정사각 꽉 찬 아이콘 (아이폰·웹·스토어)
FOREGROUND = svg(glyph(INK, 0.92))               # 안드로이드 적응형 전경 (안전 영역 66/108 안쪽)
MONO = svg(glyph("#FFFFFF", 0.92))               # 안드로이드 13+ 테마 아이콘

def render(src, size):
    png = cairosvg.svg2png(bytestring=src.encode(), output_width=size, output_height=size)
    return Image.open(io.BytesIO(png)).convert("RGBA")

def save(img, rel, mode=None):
    p = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    if mode: img = img.convert(mode)
    img.save(p, **({"lossless": True} if p.endswith(".webp") else {}))
    print("  ", rel, img.size)

def circle(img):
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).ellipse((0, 0, img.size[0] - 1, img.size[1] - 1), fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0)); out.paste(img, mask=m); return out

for name, s in [("filmchest-icon.svg", FULL), ("filmchest-icon-foreground.svg", FOREGROUND), ("filmchest-icon-monochrome.svg", MONO)]:
    open(os.path.join(ROOT, "docs/icon", name), "w").write(s); print("  docs/icon/" + name)

# 아이폰 (불투명 RGB 필수)
save(render(FULL, 1024), "App/FilmScan/Assets.xcassets/AppIcon.appiconset/icon-1024.png", "RGB")
# 웹
save(render(FULL, 180), "web/public/apple-touch-icon.png", "RGB")
save(render(FULL, 192), "web/public/icon-192.png", "RGB")
save(render(FULL, 512), "web/public/icon-512.png", "RGB")
# 갤럭시 (Expo 원본)
save(render(FULL, 1024), "galaxy/assets/icon.png", "RGB")
save(render(FOREGROUND, 512), "galaxy/assets/android-icon-foreground.png")
save(Image.new("RGBA", (512, 512), BG), "galaxy/assets/android-icon-background.png")
save(render(MONO, 432), "galaxy/assets/android-icon-monochrome.png")
save(render(FULL, 48), "galaxy/assets/favicon.png")
# 안드로이드 TWA
save(render(FULL, 512), "android/store_icon.png")
dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for d, k in dens.items():
    save(render(FULL, int(48 * k)), f"android/app/src/main/res/mipmap-{d}/ic_launcher.png")
# 갤럭시 네이티브 폴더(prebuild 결과물, git 제외)가 있으면 같이 갱신
if os.path.isdir(os.path.join(ROOT, "galaxy/android/app/src/main/res")):
    for d, k in dens.items():
        base = f"galaxy/android/app/src/main/res/mipmap-{d}/"
        full = render(FULL, int(48 * k))
        save(full, base + "ic_launcher.webp")
        save(circle(full), base + "ic_launcher_round.webp")
        save(render(FOREGROUND, int(108 * k)), base + "ic_launcher_foreground.webp")
