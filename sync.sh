#!/bin/bash
# 블로그 공개용 동기화(맥용): 초안이 아닌 노트만 vault 폴더로 복사하고 GitHub 로 올립니다.
# 사용: 터미널에서  ./sync.sh        (올리지 않고 확인만: ./sync.sh --dry-run)
set -e
SITE="$(cd "$(dirname "$0")" && pwd)"
VAULT="$(dirname "$SITE")"
SRC="$VAULT/블로그"
DST="$SITE/vault"
DRY=0; [ "$1" = "--dry-run" ] && DRY=1
[ -d "$SRC" ] || { echo "블로그 폴더를 찾지 못했습니다: $SRC"; exit 1; }

# vault 비우기 (원본은 건드리지 않음)
rm -rf "$DST"; mkdir -p "$DST"; touch "$DST/.gitkeep"

is_draft() { # 머리말(--- ... ---)에 draft: true|yes 가 있으면 초안
  awk 'NR==1&&$0!~/^---/{exit 1} NR>1&&/^---/{exit 1} /^[[:space:]]*draft:[[:space:]]*(true|yes)[[:space:]]*$/{f=1} END{exit f?0:1}' "$1"
}
resize() { # 긴 변 1600px, JPEG 품질 82 (sips 는 맥 기본 도구, EXIF 방향 반영)
  sips -s format jpeg -s formatOptions 82 -Z 1600 "$1" --out "$2" >/dev/null 2>&1 || cp "$1" "$2"
}

COPIED=0; SKIPPED=0
while IFS= read -r -d '' f; do
  rel="${f#$SRC/}"
  name="$(basename "$f")"
  [ "$name" = "블로그 홈.md" ] && continue
  [ "$name" = ".DS_Store" ] && continue
  lower="$(echo "${name##*.}" | tr 'A-Z' 'a-z')"
  case "$rel" in
    서재/*|사진/*)
      case "$lower" in jpg|jpeg|png|webp|bmp)
        if [[ "$rel" == 사진/* ]]; then
          n=$(echo "$rel" | awk -F/ '{print NF}'); [ "$n" -eq 3 ] || continue   # 사진/앨범 이름/파일 형태만
        fi
        t="$DST/$(dirname "$rel")/${name%.*}.jpg"; mkdir -p "$(dirname "$t")"; resize "$f" "$t"; COPIED=$((COPIED+1)); continue;;
      esac;;
  esac
  if [ "$lower" = "md" ] && is_draft "$f"; then SKIPPED=$((SKIPPED+1)); continue; fi
  t="$DST/$rel"; mkdir -p "$(dirname "$t")"; cp "$f" "$t"; COPIED=$((COPIED+1))
done < <(find "$SRC" -type f -print0)
echo "복사 $COPIED 개, 초안 제외 $SKIPPED 개"

# 안전 점검: 직원 정보 흔적이 있으면 중단
if grep -rlE "면허번호|연락처:|EMR:|미래병원/명단" --include=*.md "$DST" >/dev/null 2>&1; then
  echo "공개 폴더에서 직원 정보로 보이는 내용이 발견되어 중단합니다:"; grep -rlE "면허번호|연락처:|EMR:|미래병원/명단" --include=*.md "$DST"; exit 1
fi
[ "$DRY" -eq 1 ] && { echo "확인만 했습니다. 올리지 않았습니다."; exit 0; }

cd "$SITE"
[ -d .git ] || { echo "아직 GitHub 저장소와 연결되지 않았습니다."; exit 1; }
git add -A
if ! git diff --cached --quiet; then git commit -m "update $(date '+%Y-%m-%d %H:%M')" >/dev/null; fi
git fetch origin 2>/dev/null || true
AHEAD="$(git rev-list --count origin/main..HEAD 2>/dev/null || echo 0)"
[ "${AHEAD:-0}" -eq 0 ] && { echo "변경된 글이 없습니다. 이미 모두 올라가 있습니다."; exit 0; }
git pull --rebase origin main
git push origin main
echo "올렸습니다. 잠시 뒤 사이트가 갱신됩니다."
