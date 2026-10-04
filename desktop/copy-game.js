/* Copy the plain web game into desktop/game. Zips, tools, and the site stay out. */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dest = path.join(__dirname, "game");

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

for (const name of ["play.html", "style.css"]) {
  fs.copyFileSync(path.join(root, name), path.join(dest, name));
}
for (const dir of ["css", "js"]) {
  fs.cpSync(path.join(root, dir), path.join(dest, dir), { recursive: true });
}

fs.cpSync(path.join(root, "assets", "ui"), path.join(dest, "assets", "ui"), { recursive: true });
fs.cpSync(path.join(root, "assets", "sprites", "deco"), path.join(dest, "assets", "sprites", "deco"), { recursive: true });

const spriteDir = path.join(root, "assets", "sprites");
const spriteDest = path.join(dest, "assets", "sprites");
fs.mkdirSync(spriteDest, { recursive: true });
for (const name of fs.readdirSync(spriteDir)) {
  if (!name.endsWith(".png") || name === "player-preview.png") continue;
  const src = path.join(spriteDir, name);
  if (!fs.statSync(src).isFile()) continue;
  fs.copyFileSync(src, path.join(spriteDest, name));
}

fs.copyFileSync(
  path.join(root, "assets", "fishing-reference.jpg"),
  path.join(dest, "assets", "fishing-reference.jpg")
);
