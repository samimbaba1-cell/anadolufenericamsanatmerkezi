const fs = require("fs");
const files = [
  "frontend/src/components/admin/ContentTestimonialsTab.js",
  "frontend/src/components/admin/ContentAboutExtras.js"
];
for (const f of files) {
  let c = fs.readFileSync(f, "utf8");
  c = c.replace(/<motion /g, "<div ");
  c = c.replace(/<\/motion>/g, "</div>");
  fs.writeFileSync(f, c);
  console.log("fixed", f);
}
