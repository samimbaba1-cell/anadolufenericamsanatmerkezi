# -*- coding: utf-8 -*-
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
D = "motion"
D = "div"


def w(rel, content):
    (ROOT / rel).write_text(content, encoding="utf-8")
    print("wrote", rel)


def patch_settings():
    p = ROOT / "frontend/src/app/admin/settings/page.js"
    t = p.read_text(encoding="utf-8")
    s = t.index("Logo URL</label>")
    start = t.rfind("<div", 0, s)
    e = t.index("            </Card>", s)
    block = f"""                <{D} className="md:col-span-2">
                  <MediaPicker
                    label="Site logosu"
                    value={{settings.general.logoUrl}}
                    onChange={{(url) => updateSection("general", "logoUrl", normalizeLogoUrl(url))}}
                  />
                </{D}>
                <{D} className="md:col-span-2">
                  <MediaPicker
                    label="Favicon"
                    value={{settings.general.faviconUrl}}
                    onChange={{(url) => updateSection("general", "faviconUrl", mergeFaviconUrl(url))}}
                    hint="Kare ikon (PNG/SVG önerilir)"
                  />
                </{D}>
"""
    p.write_text(t[:start] + block + t[e:], encoding="utf-8")
    print("settings")


def patch_branding():
    p = ROOT / "frontend/src/app/admin/branding/page.js"
    t = p.read_text(encoding="utf-8")
    if "MediaPicker" not in t:
        t = t.replace(
            'import { normalizeLogoUrl, resolveMediaUrl } from "../../../lib/images";',
            'import { normalizeLogoUrl, resolveMediaUrl } from "../../../lib/images";\nimport MediaPicker from "../../../components/admin/MediaPicker";',
        )
    s = t.index("<h2 className=\"text-xl font-semibold\">Logo & Favicon</h2>")
    e = t.index("<Card className=\"p-6 space-y-4\">", s + 10)
    block = f"""          <h2 className="text-xl font-semibold">Logo & Favicon</h2>
          <div className="space-y-6">
            <MediaPicker
              label="Site logosu"
              value={{branding.logoUrl}}
              onChange={{(url) => {{
                setLogoFile(null);
                setLogoPreview(null);
                setBranding((prev) => ({{ ...prev, logoUrl: normalizeLogoUrl(url) }}));
              }}}}
            />
            <MediaPicker
              label="Favicon"
              value={{branding.faviconUrl}}
              onChange={{(url) => {{
                setFaviconFile(null);
                setFaviconPreview(null);
                setBranding((prev) => ({{ ...prev, faviconUrl: url || DEFAULT_BRANDING.faviconUrl }}));
              }}}}
            />
          </div>
        </Card>

        """
    # fix - need to keep Card opening
    start = t.rindex("<Card", 0, s)
    t = t[:start] + f"""        <Card className="p-6 space-y-4">
{block}""" + t[e:]
    p.write_text(t, encoding="utf-8")
    print("branding")


def patch_seo_og():
    p = ROOT / "frontend/src/app/admin/seo/page.js"
    t = p.read_text(encoding="utf-8")
    if "MediaPicker" not in t:
        t = t.replace(
            'import { resolveMediaUrl } from "../../../lib/images";',
            'import { resolveMediaUrl } from "../../../lib/images";\nimport MediaPicker from "../../../components/admin/MediaPicker";',
        )
    s = t.index("<span>OG Görsel</span>")
    start = t.rindex("<div className=\"space-y-2", 0, s)
    e = t.index("</Card>", s) 
    block = """            <MediaPicker
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
    t = t[:start] + block + t[e:]
  # broken - seo structure is nested
    p.write_text(t, encoding="utf-8")
    print("seo partial")


def patch_banners():
    p = ROOT / "frontend/src/app/admin/banners/page.js"
    t = p.read_text(encoding="utf-8")
    old1 = "Görsel URL"
    if "MediaPicker" in t and "Masaüstü banner görseli" in t:
        print("banners already")
        return
    # replace desktop image label block - find by unique text
    marker = "Tam https adresi veya /uploads"
    if marker not in t:
        print("banners marker missing")
        return
    s = t.index("Görsel URL")
    start = t.rindex("<label", 0, s)
    e = t.index("<label", t.index("Mobil Görsel URL"))
    block = """                <div className="md:col-span-2">
                  <MediaPicker
                    label="Masaüstü banner görseli"
                    value={formData.image || ""}
                    onChange={(url) => {
                      setFormData((prev) => ({ ...prev, image: url }));
                      if (url && formErrors.image) {
                        setFormErrors((prev) => {
                          const updated = { ...prev };
                          delete updated.image;
                          return updated;
                        });
                      }
                    }}
                  />
                  {formErrors.image && <p className="text-xs text-red-600">{formErrors.image}</p>}
                </div>
                """
    t = t[:start] + block + t[e:]
    s2 = t.index("Mobil Görsel URL")
    start2 = t.rindex("<label", 0, s2)
    e2 = t.index("<label", t.index("Bağlantı"))
    block2 = """                <motion>
                  <MediaPicker
                    label="Mobil banner görseli"
                    value={formData.mobileImage || ""}
                    onChange={(url) => setFormData((prev) => ({ ...prev, mobileImage: url }))}
                  />
                </motion>
                """
    block2 = block2.replace("motion", "motion").replace("motion", "div")
    t = t[:start2] + block2 + t[e2:]
    p.write_text(t, encoding="utf-8")
    print("banners")


def patch_brands_logo():
    p = ROOT / "frontend/src/app/admin/brands/page.js"
    t = p.read_text(encoding="utf-8")
    if "Marka logosu" in t and "MediaPicker" in t and "logoFileInputRef" not in t:
        print("brands logo already")
        return
    s = t.index("Marka logosu")
    start = t.rindex("<div className=\"sm:col-span-2\">", 0, s)
    e = t.index("<div className=\"sm:col-span-2\">", start + 5)
    block = """              <div className="sm:col-span-2">
                <MediaPicker
                  label="Marka logosu"
                  value={form.logo}
                  onChange={(url) => setForm((prev) => ({ ...prev, logo: url }))}
                />
              </div>
              """
    t = t[:start] + block + t[e:]
    p.write_text(t, encoding="utf-8")
    print("brands")


if __name__ == "__main__":
    patch_settings()
    patch_branding()
    patch_banners()
    patch_brands_logo()
    # patch_seo_og needs manual
