"use client";

import Card from "../ui/Card";
import Button from "../ui/Button";
import MediaPicker from "./MediaPicker";

export default function ContentTestimonialsTab({ testimonials = [], setContent }) {
  const setList = (next) => {
    setContent((prev) => ({ ...prev, testimonials: next }));
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Müşteri Yorumları</h2>
          <p className="text-sm text-gray-600">Ana sayfadaki Müşteri Yorumları bölümünde gösterilir.</p>
        </div>
        <Button
          type="button"
          onClick={() =>
            setList([
              ...testimonials,
              { name: "", role: "Müşteri", content: "", rating: 5, avatarUrl: "" }
            ])
          }
        >
          Yorum Ekle
        </Button>
      </div>

      {testimonials.length === 0 && (
        <p className="text-sm text-gray-500">Henüz yorum yok.</p>
      )}

      {testimonials.map((item, index) => (
        <div key={index} className="rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex justify-between">
            <span className="font-medium">Yorum #{index + 1}</span>
            <button
              type="button"
              className="text-sm text-red-600"
              onClick={() => setList(testimonials.filter((_, i) => i !== index))}
            >
              Sil
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="input-modern"
              placeholder="Ad Soyad"
              value={item.name || ""}
              onChange={(e) => {
                const next = [...testimonials];
                next[index] = { ...next[index], name: e.target.value };
                setList(next);
              }}
            />
            <input
              className="input-modern"
              placeholder="Rol"
              value={item.role || ""}
              onChange={(e) => {
                const next = [...testimonials];
                next[index] = { ...next[index], role: e.target.value };
                setList(next);
              }}
            />
          </div>
          <textarea
            rows={3}
            className="input-modern w-full"
            placeholder="Yorum metni"
            value={item.content || ""}
            onChange={(e) => {
              const next = [...testimonials];
              next[index] = { ...next[index], content: e.target.value };
              setList(next);
            }}
          />
          <label className="text-sm text-gray-700 flex items-center gap-2">
            Puan (1-5)
            <input
              type="number"
              min={1}
              max={5}
              className="input-modern w-24"
              value={item.rating ?? 5}
              onChange={(e) => {
                const next = [...testimonials];
                next[index] = { ...next[index], rating: Number(e.target.value) || 5 };
                setList(next);
              }}
            />
          </label>
          <MediaPicker
            label="Profil fotoğrafı"
            value={item.avatarUrl || ""}
            onChange={(url) => {
              const next = [...testimonials];
              next[index] = { ...next[index], avatarUrl: url };
              setList(next);
            }}
          />
        </div>
      ))}
    </Card>
  );
}
