from pathlib import Path
p = Path("frontend/src/app/admin/banners/page.js")
t = p.read_text(encoding="utf-8")
s = t.index("Görsel URL")
start = t.rindex("<label", 0, s)
e = t.index("<label", t.index("Bağlantı"))
block = """
                <div className="md:col-span-2 space-y-4">
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
                  <MediaPicker
                    label="Mobil banner görseli"
                    value={formData.mobileImage || ""}
                    onChange={(url) => setFormData((prev) => ({ ...prev, mobileImage: url }))}
                  />
                </motion>
""".replace("motion", "div")
p.write_text(t[:start] + block + t[e:], encoding="utf-8")
print("ok")
