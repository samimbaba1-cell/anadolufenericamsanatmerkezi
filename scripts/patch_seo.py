from pathlib import Path
p = Path("frontend/src/app/admin/seo/page.js")
t = p.read_text(encoding="utf-8")
if "MediaPicker" not in t:
    t = t.replace(
        'import { resolveMediaUrl } from "../../../lib/images";',
        'import { resolveMediaUrl } from "../../../lib/images";\nimport MediaPicker from "../../../components/admin/MediaPicker";',
    )
s = t.index("<span>OG Görsel</span>")
start = t.rindex("<div className=\"space-y-2", 0, s)
e = t.index("</Card>", s)
block = """
            <MediaPicker
              label="OG Görsel (sosyal paylaşım)"
              value={seo.ogImage}
              onChange={(url) => {
                setOgFile(null);
                handleInputChange("ogImage", url);
              }}
              hint="Facebook, WhatsApp vb. paylaşımlarda görünür"
            />
            {validationErrors.ogImage && <p className="text-xs text-red-600">{validationErrors.ogImage}</p>}
"""
p.write_text(t[:start] + block + t[e:], encoding="utf-8")
print("ok")
