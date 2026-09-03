#!/bin/bash
# Fetches remote headshots/logos and converts local app assets, emitting
# downscaled PNGs into ./assets ready for base64 embedding.
set -uo pipefail
cd "$(dirname "$0")"
mkdir -p assets
APP=/Users/eyalcohen/Projects/propgpt/frontend/src/assets

fetch() { # key url resampleHeight(optional)
  local key="$1" url="$2" rh="${3:-}"
  local out="assets/$key.png"
  if [ ! -s "$out" ]; then
    curl -sfL --max-time 20 "$url" -o "$out" || { echo "FAIL $key $url"; rm -f "$out"; return; }
  fi
  if [ -n "$rh" ]; then sips --resampleHeight "$rh" "$out" >/dev/null 2>&1; fi
  echo "ok $key $(du -h "$out" | cut -f1)"
}

# ---- marquee headshots (key = m<abs(id)>) ----
node -e "
const d = require('./bets.json');
for (const b of d.marquee) console.log('m' + Math.abs(b.id), b.headshot);
for (const b of d.demo) console.log('demo_' + b.key.toLowerCase(), b.headshot);
" | while read -r key url; do
  case "$url" in
    *cdn.nba.com*1040x760*) fetch "$key" "$url" 240 ;;
    *cdn.nba.com*) fetch "$key" "$url" 120 ;;
    *mlbstatic*) fetch "$key" "$url" 150 ;;
    *) fetch "$key" "$url" ;;
  esac
done

# ---- WNBA team logos (remote), NFL team logos (local png) ----
fetch team_WNBA_NY "https://a.espncdn.com/i/teamlogos/wnba/500/ny.png" 128
for t in KC MIN BUF CIN; do
  cp "$APP/nfl-team-logos/$t.png" "assets/team_NFL_$t.png"
  sips --resampleHeight 128 "assets/team_NFL_$t.png" >/dev/null 2>&1
done
cp "$APP/fallback.png" assets/team_fallback.png
sips --resampleHeight 128 assets/team_fallback.png >/dev/null 2>&1

# ---- league marks ----
for lg in nfl nba mlb wnba; do
  cp "$APP/images/leagues/$lg.png" "assets/league_$lg.png"
  sips --resampleHeight 96 "assets/league_$lg.png" >/dev/null 2>&1
done

# ---- wordmark + arrow bg ----
cp "$APP/images/logo.png" assets/wordmark.png
sips --resampleWidth 480 assets/wordmark.png >/dev/null 2>&1
cp "$APP/images/arrow-backgrounds/90_up_arrows.png" assets/arrows90.png
sips --resampleWidth 900 assets/arrows90.png >/dev/null 2>&1

# ---- team SVGs (NBA + MLB), copied verbatim ----
for t in DEN OKC MIL LAL SA MIN IND CHA GS SAC HOU PHO NY; do
  cp "$APP/nba-team-logos/$t.svg" "assets/team_NBA_$t.svg" 2>/dev/null || echo "MISSING NBA $t"
done
for t in LAD NYY PHI SD KC; do
  cp "$APP/mlb-team-logos/$t.svg" "assets/team_MLB_$t.svg" 2>/dev/null || echo "MISSING MLB $t"
done

echo "---- total ----"
du -sh assets
ls assets | wc -l