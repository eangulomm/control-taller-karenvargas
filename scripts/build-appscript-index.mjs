import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(root, "index.html");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const js = fs.readFileSync(path.join(root, "app.js"), "utf8");
let html = fs.readFileSync(htmlPath, "utf8");

html = html.replace(
  /<link rel="stylesheet" href="styles\.css\?v=\d+" \/>/,
  `<style>\n${css}\n</style>`,
);
html = html.replace(
  /<script src="config\.js\?v=\d+"><\/script>\s*<script src="app\.js\?v=\d+"><\/script>/,
  `<script>window.APP_CONFIG={API_URL:"",DEMO_MODE:false};</script>\n<script>\n(function atelierApp(){\n${js.replaceAll("</script>", "<\\/script>")}\n})();\n</script>`,
);

fs.writeFileSync(path.join(root, "appscript", "Index.html"), html, "utf8");
