# -*- coding: utf-8 -*-
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def patch_file(rel, old, new):
    p = ROOT / rel
    t = p.read_text(encoding="utf-8")
    if old not in t:
        print("SKIP (not found):", rel, old[:60])
        return
    p.write_text(t.replace(old, new, 1), encoding="utf-8")
    print("OK:", rel)

# Settings logo + favicon
patch_file(
    "frontend/src/app/admin/settings/page.js",
    """                <motion className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                  <input
                    type="url"
                    value={settings.general.logoUrl}
                    onChange={(e) => updateSection("general", "logoUrl", normalizeLogoUrl(e.target.value))}
                    className="input-modern"
                    placeholder="/images/logo-placeholder.png"
                  />
                </motion>
                <motion className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Favicon URL</label>
                  <input
                    type="url"
                    value={settings.general.faviconUrl}
                    onChange={(e) => updateSection("general", "faviconUrl", mergeFaviconUrl(e.target.value))}
                    className="input-modern"
                    placeholder="/icons/icon-192.svg"
                  />
                </motion>""".replace("motion", "div"),
    """                <motion className="md:col-span-2">
                  <MediaPicker
                    label="Site logosu"
                    value={settings.general.logoUrl}
                    onChange={(url) => updateSection("general", "logoUrl", normalizeLogoUrl(url))}
                  />
                </motion>
                <motion className="md:col-span-2">
                  <MediaPicker
                    label="Favicon"
                    value={settings.general.faviconUrl}
                    onChange={(url) => updateSection("general", "faviconUrl", mergeFaviconUrl(url))}
                    hint="Kare ikon (PNG/SVG önerilir)"
                  />
                </motion>""".replace("motion", "motion"),
)

print("run with div tags fixed below")
