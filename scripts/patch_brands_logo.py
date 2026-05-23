from pathlib import Path
p = Path("frontend/src/app/admin/brands/page.js")
t = p.read_text(encoding="utf-8")
s = t.index("Marka logosu")
start = t.rindex('className="sm:col-span-2"', 0, s)
start = t.rfind("<div", 0, start)
e = t.index("Marka banner", s)
block = """
              <motion className="sm:col-span-2">
                <MediaPicker
                  label="Marka logosu"
                  value={form.logo}
                  onChange={(url) => setForm((prev) => ({ ...prev, logo: url }))}
                />
              </motion>
"""
block = block.replace("motion", "div")
p.write_text(t[:start] + block + t[e:], encoding="utf-8")
print("ok")
