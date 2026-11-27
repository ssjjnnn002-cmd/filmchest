#!/bin/zsh
# 웹 '배경 지우기' 인식 모델(ISNet general use, Apache-2.0)을 받아 8비트로 줄이고(176MB → 46MB),
# Cloudflare Pages 한 파일 25MB 한도에 맞게 20MB씩 나눠 web/public/bg-model/ 에 둔다 (깃 제외, 웹 배포로 올라간다).
# 원본: https://github.com/xuebinqin/DIS (Apache-2.0), 파일은 rembg 릴리스의 isnet-general-use.onnx
set -e
cd "$(dirname "$0")/.."
OUT=web/public/bg-model
[[ -f $OUT/model.json ]] && { echo "✓ 이미 있어요 ($OUT)"; exit 0; }
WORK=$(mktemp -d)
python3 -m venv $WORK/v && $WORK/v/bin/pip -q install onnx==1.17.0 onnxruntime==1.19.2
curl -fL -o $WORK/isnet.onnx https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx
$WORK/v/bin/python -c "
from onnxruntime.quantization import quantize_dynamic, QuantType
quantize_dynamic('$WORK/isnet.onnx', '$WORK/isnet-q8.onnx', weight_type=QuantType.QUInt8)"
rm -rf $OUT && mkdir -p $OUT
split -b 20m -a 1 -d $WORK/isnet-q8.onnx $OUT/part
for f in $OUT/part?; do mv "$f" "$f.bin"; done
PARTS=$(ls $OUT/part*.bin | wc -l | tr -d ' ')
SIZE=$(stat -f%z $WORK/isnet-q8.onnx)
printf '{"version": 1, "parts": %s, "size": %s, "input": 1024}\n' "$PARTS" "$SIZE" > $OUT/model.json
rm -rf $WORK
echo "✓ $OUT ($PARTS 조각, $SIZE 바이트)"
