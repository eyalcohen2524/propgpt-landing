// Extracts exactly the data the web funnel needs from the app's codegen files,
// porting bgFgHex 1:1 so card colors match the app to the byte.
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = "/Users/eyalcohen/Projects/propgpt/frontend";

function block(src, name) {
  const re = new RegExp(`export const ${name}[^=]*= \\{([\\s\\S]*?)\\n\\};?`, "m");
  const m = re.exec(src);
  if (!m) throw new Error(`block ${name} not found`);
  const body = m[1];
  const out = {};
  // string values (allow trailing // comments)
  for (const mm of body.matchAll(/^\s*(?:"([^"]+)"|(\w+)|(\d+)):\s*"((?:[^"\\]|\\.)*)",?\s*(?:\/\/.*)?$/gm)) {
    const key = mm[1] ?? mm[2] ?? mm[3];
    out[key] = mm[4].replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  // numeric values (e.g. NBA_PLAYER_ID_TO_PICTURE)
  for (const mm of body.matchAll(/^\s*(?:"([^"]+)"|(\w+)|(\d+)):\s*(\d+),?\s*(?:\/\/.*)?$/gm)) {
    const key = mm[1] ?? mm[2] ?? mm[3];
    out[key] = mm[4];
  }
  // require() values -> asset path ("@/..." or "../...", both live under src/)
  for (const mm of body.matchAll(/^\s*(?:"([^"]+)"|(\w+)|(\d+)):\s*require\("(?:@\/|\.\.\/)(.*?)"\)/gm)) {
    const key = mm[1] ?? mm[2] ?? mm[3];
    out[key] = ROOT + "/src/" + mm[4];
  }
  return out;
}

const files = {
  NBA: readFileSync(`${ROOT}/src/codegen/nba.ts`, "utf8"),
  NFL: readFileSync(`${ROOT}/src/codegen/nfl.ts`, "utf8"),
  MLB: readFileSync(`${ROOT}/src/codegen/mlb.ts`, "utf8"),
  WNBA: readFileSync(`${ROOT}/src/codegen/wnba.ts`, "utf8"),
};

const data = {};
for (const [lg, src] of Object.entries(files)) {
  data[lg] = {
    colors: block(src, `${lg}_TEAM_COLORS`),
    names: block(src, `${lg}_TEAM_NAMES`),
    logos: block(src, `${lg}_TEAM_LOGOS`),
    playerNames: block(src, `${lg}_PLAYER_ID_TO_NAME`),
  };
}
data.NBA.pictures = block(files.NBA, "NBA_PLAYER_ID_TO_PICTURE");

// ---- bgFgHex, ported verbatim from src/lib/color.ts ----
function rgbStrToRgb(hex) {
  const str = hex.replace(/^#/, "");
  let r, g, b;
  if (str.length === 3) {
    r = parseInt(str[0] + str[0], 16); g = parseInt(str[1] + str[1], 16); b = parseInt(str[2] + str[2], 16);
  } else { r = parseInt(str.substring(0, 2), 16); g = parseInt(str.substring(2, 4), 16); b = parseInt(str.substring(4, 6), 16); }
  return { r, g, b };
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s; const l = (max + min) / 2;
  if (max === min) { h = s = 0; } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h, s, l };
}
function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) { r = g = b = l; } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (n) => { const v = Math.round(n * 255).toString(16); return v.length === 1 ? "0" + v : v; };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function bgFgHex(hex, percent) {
  const { r, g, b } = rgbStrToRgb(hex);
  const hsl = rgbToHsl(r, g, b);
  const { h, s } = hsl;
  hsl.l = Math.min(hsl.l, 0.45);
  let l1, l2;
  if (hsl.l - percent <= 0) { l1 = 0; l2 = percent; } else { l1 = hsl.l - percent; l2 = hsl.l; }
  return [hslToRgb(h, s, l1), hslToRgb(h, s, l2)];
}

// ---- the 24 marquee bets (exact args from hook.tsx) + demo/result extras ----
const bets = [
  // row, id, playerId, team, opp, stat, line, price, grade, ou, league, nameOverride
  [1, -1, 660271, "LAD", "SF", "total bases", 1.5, 1.66, 97, "over", "MLB", "Shohei Ohtani"],
  [1, -2, 3149391, "LVA", "NYL", "points + rebounds", 31.5, 1.78, 94, "over", "WNBA", "A'ja Wilson"],
  [1, -3, 3139477, "KC", "BUF", "pass yards", 285.5, 1.87, 91, "over", "NFL", "Patrick Mahomes"],
  [1, -4, 592450, "NYY", "BOS", "home runs", 0.5, 2.35, 88, "over", "MLB", "Aaron Judge"],
  [1, -5, 28908111729, "DEN", "GS", "points", 27.5, 1.73, 98, "over", "NBA", null],
  [1, -6, 4262921, "MIN", "GB", "rec yards", 89.5, 1.85, 93, "over", "NFL", "Justin Jefferson"],
  [2, -7, 28778646789, "OKC", "HOU", "points + assists", 38.5, 1.91, 99, "over", "NBA", null],
  [2, -8, 3918298, "BUF", "KC", "pass tds", 1.5, 1.62, 95, "over", "NFL", "Josh Allen"],
  [2, -9, 28118035349, "MIL", "BOS", "points", 32.5, 1.87, 90, "under", "NBA", null],
  [2, -10, 4066533, "NY", "CHI", "assists", 3.5, 1.57, 96, "over", "WNBA", "Sabrina Ionescu"],
  [2, -11, 28398804489, "LAL", "DEN", "points + rebounds", 34.5, 1.95, 92, "over", "NBA", null],
  [2, -12, 547180, "PHI", "LAA", "hits + rbi", 1.5, 1.74, 98, "over", "MLB", "Bryce Harper"],
  [3, -13, 943740414489, "SA", "OKC", "points + blocks", 22.5, 1.83, 89, "over", "NBA", null],
  [3, -14, 4362628, "CIN", "BAL", "rec yards", 84.5, 1.85, 91, "over", "NFL", "Ja'Marr Chase"],
  [3, -15, 94344202027, "MIN", "LAL", "points", 28.5, 1.80, 97, "over", "NBA", null],
  [3, -16, 665742, "SD", "LAD", "hits", 1.5, 2.05, 90, "over", "MLB", "Juan Soto"],
  [3, -17, 94054442047, "IND", "DET", "assists", 10.5, 1.69, 94, "over", "NBA", null],
  [3, -18, 94914298027, "CHA", "ATL", "points", 24.5, 1.88, 87, "under", "NBA", null],
  [4, -19, 28046691632, "GS", "DEN", "threes", 4.5, 1.92, 93, "over", "NBA", null],
  [4, -20, 518692, "LAD", "SF", "hits", 1.5, 1.71, 96, "over", "MLB", "Freddie Freeman"],
  [4, -21, 28118309129, "SAC", "OKC", "points + rebounds", 25.5, 1.76, 89, "over", "NBA", null],
  [4, -22, 677951, "KC", "DET", "total bases", 1.5, 1.84, 92, "over", "MLB", "Bobby Witt Jr."],
  [4, -23, 28336662792, "HOU", "LAL", "points", 26.5, 1.81, 88, "under", "NBA", null],
  [4, -24, 28898319129, "PHO", "SA", "threes", 3.5, 1.73, 95, "over", "NBA", null],
];

// Demo screen bets (BetDetails) — headshots render at size<=128 for NBA
const demoBets = [
  { key: "NFL", playerId: 4362628, team: "CIN", opp: "BAL", pos: "WR" },
  { key: "MLB", playerId: 547180, team: "PHI", opp: "LAA", pos: "1B" },
  { key: "WNBA", playerId: 4066533, team: "NY", opp: "CHI", pos: "G" },
  { key: "NBA", playerId: 28978550069, team: "NY", opp: "SA", pos: "SF" },
];

function headshotUrl(league, playerId, big = false) {
  if (league === "NBA") {
    const imageId = data.NBA.pictures[playerId];
    if (!imageId) return null;
    return `https://cdn.nba.com/headshots/nba/latest/${big ? "1040x760" : "260x190"}/${imageId}.png`;
  }
  if (league === "NFL") return `https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/${playerId}.png&h=${big ? 240 : 120}`;
  if (league === "WNBA") return `https://a.espncdn.com/combiner/i?img=/i/headshots/wnba/players/full/${playerId}.png&h=${big ? 240 : 120}`;
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:silo:current.png/w_180,q_auto:best/v1/people/${playerId}/headshot/silo/current`;
}

const resolve = (league, playerId, team, nameOverride) => {
  const lg = data[league];
  const rawColor = lg.colors[team] ?? "#000";
  const [bg, fg] = bgFgHex(rawColor, 0.25);
  return {
    name: lg.playerNames[playerId] ?? nameOverride ?? "Unknown Player",
    teamName: lg.names[team] ?? "Unknown Team",
    rawColor, bg, fg,
    logoPath: lg.logos[team] ?? null,
  };
};

const out = {
  marquee: bets.map(([row, id, playerId, team, opp, stat, line, price, grade, ou, league, nameOverride]) => ({
    row, id, league, team, opp, stat, line, price, grade, ou, playerId,
    ...resolve(league, playerId, team, nameOverride),
    headshot: headshotUrl(league, playerId),
  })),
  demo: demoBets.map((d) => ({
    ...d,
    ...resolve(d.key, d.playerId, d.team, null),
    headshot: headshotUrl(d.key, d.playerId, true),
  })),
};

writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log("bets:", out.marquee.length, "| missing headshots:", out.marquee.filter(b => !b.headshot).length);
for (const d of out.demo) console.log("demo", d.key, d.name, d.teamName, d.bg, d.fg, d.headshot ? "ok" : "NO-HEADSHOT");
