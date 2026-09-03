// Assembles the final self-contained /start/index.html:
// template + embedded asset data-URIs + runtime card data.
import { readFileSync, writeFileSync } from "node:fs";

const DIR = new URL("./", import.meta.url).pathname;
const OUT = process.argv[2] || "/Users/eyalcohen/Projects/propgpt/website/start/index.html";

const template = readFileSync(DIR + "funnel.template.html", "utf8");
const manifest = JSON.parse(readFileSync(DIR + "manifest.json", "utf8"));
const bets = JSON.parse(readFileSync(DIR + "bets.json", "utf8"));

// ---- runtime marquee entries ----
const marquee = bets.marquee.map((b) => {
  let logo = null;
  if (b.logoPath) logo = `team_${b.league}_${b.team}`;
  else logo = "team_fallback"; // app renders assets/fallback.png for unmapped teams (LVA)
  if (!manifest[logo]) {
    console.warn(`no logo asset ${logo}; dropping watermark`);
    logo = null;
  }
  const img = `m${Math.abs(b.id)}`;
  if (!manifest[img]) throw new Error(`missing headshot ${img}`);
  return {
    row: b.row, league: b.league, team: b.team, opp: b.opp,
    stat: b.stat, line: b.line, price: b.price, grade: b.grade, ou: b.ou,
    name: b.name, bg: b.bg, fg: b.fg, img, logo,
  };
});

// ---- demo screen data (copy from src/locales/en.json, data from demo.tsx) ----
const D = Object.fromEntries(bets.demo.map((d) => [d.key, d]));
const NFL_LBL = ["@NE", "CLE", "PIT", "@BAL", "ARI", "@MIA", "BAL", "@PIT", "DEN", "CLE"];
const MLB_LBL = ["@MIN", "MIA", "MIA", "MIA", "STL", "STL", "STL", "@SEA", "@SEA", "@SEA"];
const demo = {
  NFL: {
    lg: "NFL", name: D.NFL.name, teamName: D.NFL.teamName, pos: D.NFL.pos, opp: "BAL",
    line: 84.5, stat: "rec yards", price: 1.85, grade: 91, bg: D.NFL.bg, fg: D.NFL.fg,
    long: "Chase enters the season as the engine of a Bengals offense that finished top five in passing. He topped 84.5 receiving yards in 11 of 17 games last year, and his quick-game connection with Joe Burrow holds up well against the blitz-heavy pressure looks Baltimore leans on. With Tee Higgins drawing coverage on the opposite side, Chase should see favorable one-on-one matchups, and his league-best yards after catch turns short throws into chunk gains. Volume, matchup and role all point to the over.",
    insights: [
      "Chase has cleared 84.5 receiving yards in 6 of his last 8 games against AFC North defenses.",
      "Baltimore allowed the 5th-most receiving yards to opposing No. 1 receivers last season.",
      "Chase led the NFL in target share last season. Burrow looks his way on nearly 30% of routes.",
    ],
    graphs: [
      { title: "Receiving Yards", threshold: 84.5, data: [91, 68, 112, 87, 74, 133, 96, 59, 105, 88].map((v, i) => ({ l: NFL_LBL[i], v })) },
      { title: "Receptions", threshold: 6.5, data: [7, 5, 9, 7, 6, 11, 8, 4, 8, 7].map((v, i) => ({ l: NFL_LBL[i], v })) },
    ],
  },
  MLB: {
    lg: "MLB", name: D.MLB.name, teamName: D.MLB.teamName, pos: D.MLB.pos, opp: "LAA",
    line: 1.5, stat: "hits + rbi", price: 1.74, grade: 98, bg: D.MLB.bg, fg: D.MLB.fg,
    long: "Harper comes in hot: 1.9 hits + RBI per game over his last ten, over this line in six of them, and five straight above it. The matchup helps: Detmers is allowing 91 mph average exit velocity with a .469 wOBA against, and the Angels' defense gives up 8.6 hits a game, 21st in the league. Harper also owns the history here: .385 against Detmers across 35 career plate appearances. Form, matchup and track record point the same way.",
    insights: [
      "Harper is hitting .385 against Reid Detmers across 35 career plate appearances.",
      "He has cleared 1.5 hits + RBI in 6 of his last 10 games and enters on a five-game streak above the line.",
      "The Angels allow 8.6 hits per game, 21st in the league, and Detmers is giving up a .469 wOBA on contact.",
    ],
    graphs: [
      { title: "Hits + RBI", threshold: 1.5, data: [1, 3, 0, 1, 0, 4, 2, 2, 2, 4].map((v, i) => ({ l: MLB_LBL[i], v })) },
      { title: "Hits", threshold: null, data: [1, 3, 0, 1, 0, 1, 2, 2, 2, 2].map((v, i) => ({ l: MLB_LBL[i], v })) },
    ],
  },
  WNBA: {
    lg: "WNBA", name: D.WNBA.name, teamName: D.WNBA.teamName, pos: D.WNBA.pos, opp: "CHI",
    line: 3.5, stat: "assists", price: 1.57, grade: 97, bg: D.WNBA.bg, fg: D.WNBA.fg,
    long: "Ionescu is averaging 5.7 assists over her last ten games and beat this line in nine of them. Her one meeting with Chicago this month ended with a season-high 12 assists. The Sky concede assists at one of the highest rates in the league, and New York's offense runs through her hands. Volume, form and matchup all line up on the over.",
    insights: [
      "Ionescu has cleared 3.5 assists in 9 of her last 10 games, averaging 5.7 over the stretch.",
      "She put up 12 assists against this same Sky team on August 18, her season high.",
      "Chicago allows one of the highest opponent-assist rates in the WNBA; playmakers keep finding lanes against them.",
    ],
    graphs: [
      { title: "Assists", threshold: 3.5, data: [["@LV", 5], ["@PHX", 10], ["SEA", 5], ["SEA", 6], ["LV", 2], ["@IND", 5], ["LA", 4], ["@CHI", 12], ["IND", 4], ["GS", 4]].map(([l, v]) => ({ l, v })) },
    ],
  },
  NBA: {
    lg: "NBA", name: D.NBA.name, teamName: D.NBA.teamName, pos: D.NBA.pos, opp: "SA",
    line: 15.5, stat: "points", price: 1.83, grade: 97, bg: D.NBA.bg, fg: D.NBA.fg,
    long: "Anunoby has scored past this number in eight of his last ten, averaging 20.2 a night over the stretch, with 28 and 33 in the two most recent meetings with San Antonio. The shooting holds up: 45.9% from the field, 37.3% from three. And the Spurs' 101.1 pace while allowing 111.5 points a game keeps the volume coming. The line sits well below his recent scoring floor.",
    insights: [
      "Anunoby is averaging 20.2 points over his last ten games, clearing 15.5 in eight of them.",
      "He is shooting 45.9% from the field and 37.3% from three across the run.",
      "San Antonio plays at a 101.1 pace and allows 111.5 points per game. More possessions, more looks.",
    ],
    graphs: [
      { title: "Points", threshold: 15.5, data: [["PHI", 18], ["PHI", 24], ["CLE", 13], ["CLE", 14], ["@CLE", 21], ["@CLE", 17], ["@SA", 17], ["@SA", 17], ["SA", 28], ["SA", 33]].map(([l, v]) => ({ l, v })) },
    ],
  },
};

const data = { marquee, demo };

let out = template
  .replace('"__ASSETS_JSON__"', JSON.stringify(manifest))
  .replace('"__DATA_JSON__"', JSON.stringify(data));

writeFileSync(OUT, out);
console.log("wrote", OUT, Math.round(out.length / 1024) + "KB");
