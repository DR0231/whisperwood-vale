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
for (const dir of ["css", "js", "assets"]) {
  fs.cpSync(path.join(root, dir), path.join(dest, dir), { recursive: true });
}
