import { getApiBaseUrl } from "../../../lib/api";

export default async function Head({ params }) {
  const res = await fetch(`${getApiBaseUrl()}/api/products/${params.id}`, { cache: 'no-store' });
  const p = res.ok ? await res.json() : null;
  const title = p?.name ? `${p.name} | Anadolu Feneri Cam Sanat Merkezi` : 'Ürün | Anadolu Feneri Cam Sanat Merkezi';
  const desc = p?.description?.slice(0, 150) || 'Ürün detayları';
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      {p?.images?.[0] && <meta property="og:image" content={p.images[0]} />}
    </>
  );
}

