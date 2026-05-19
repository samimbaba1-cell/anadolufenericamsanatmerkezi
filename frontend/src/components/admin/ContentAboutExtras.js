"use client";

import Card from "../ui/Card";
import Button from "../ui/Button";
import MediaPicker from "./MediaPicker";

export default function ContentAboutExtras({ content, setContent, updateSection }) {
  const values = content.about.values || [];
  const cta = content.about.cta || {};

  const setValues = (next) => {
    setContent((prev) => ({
      ...prev,
      about: { ...prev.about, values: next }
    }));
  };

  const setCta = (key, value) => {
    setContent((prev) => ({
      ...prev,
      about: {
        ...prev.about,
        cta: { ...(prev.about.cta || {}), [key]: value }
      }
    }));
  };

  return (
    <>
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Görseller</h2>
        <MediaPicker
          label="Misyon bölümü görseli (sağ taraf)"
          value={content.about.missionImageUrl || ""}
          onChange={(url) => updateSection("about", "missionImageUrl", url)}
          hint="Boş bırakırsanız varsayılan logo gösterilir."
        />
        <MediaPicker
          label="Şirket bilgileri fotoğrafı"
          value={content.about.companyImageUrl || ""}
          onChange={(url) => updateSection("about", "companyImageUrl", url)}
        />
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Değerlerimiz</h2>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setValues([...values, { title: "", description: "", iconUrl: "" }])
            }
          >
            Değer Ekle
          </Button>
        </div>
        {values.map((item, index) => (
          <div key={index} className="rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-800">Değer #{index + 1}</span>
              <button
                type="button"
                className="text-sm text-red-600"
                onClick={() => setValues(values.filter((_, i) => i !== index))}
              >
                Sil
              </button>
            </div>
            <input
              type="text"
              placeholder="Başlık"
              value={item.title || ""}
              onChange={(e) => {
                const next = [...values];
                next[index] = { ...next[index], title: e.target.value };
                setValues(next);
              }}
              className="input-modern w-full"
            />
            <textarea
              rows={2}
              placeholder="Açıklama"
              value={item.description || ""}
              onChange={(e) => {
                const next = [...values];
                next[index] = { ...next[index], description: e.target.value };
                setValues(next);
              }}
              className="input-modern w-full"
            />
            <MediaPicker
              label="İkon / küçük görsel"
              value={item.iconUrl || ""}
              onChange={(url) => {
                const next = [...values];
                next[index] = { ...next[index], iconUrl: url };
                setValues(next);
              }}
            />
          </div>
        ))}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Alt CTA — İletişim bandı</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-2 text-sm">
            <span>Başlık</span>
            <input className="input-modern w-full" value={cta.title || ""} onChange={(e) => setCta("title", e.target.value)} />
          </label>
          <label className="space-y-2 text-sm">
            <span>Alt metin</span>
            <input className="input-modern w-full" value={cta.subtitle || ""} onChange={(e) => setCta("subtitle", e.target.value)} />
          </label>
          <label className="space-y-2 text-sm">
            <span>Birinci buton yazısı</span>
            <input className="input-modern w-full" value={cta.primaryLabel || ""} onChange={(e) => setCta("primaryLabel", e.target.value)} />
          </label>
          <label className="space-y-2 text-sm">
            <span>Birinci buton linki</span>
            <input className="input-modern w-full" value={cta.primaryLink || ""} onChange={(e) => setCta("primaryLink", e.target.value)} />
          </label>
          <label className="space-y-2 text-sm">
            <span>İkinci buton yazısı</span>
            <input className="input-modern w-full" value={cta.secondaryLabel || ""} onChange={(e) => setCta("secondaryLabel", e.target.value)} />
          </label>
          <label className="space-y-2 text-sm">
            <span>İkinci buton linki</span>
            <input className="input-modern w-full" value={cta.secondaryLink || ""} onChange={(e) => setCta("secondaryLink", e.target.value)} />
          </label>
        </div>
      </Card>
    </>
  );
}
