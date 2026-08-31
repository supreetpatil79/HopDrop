export interface LiveMapProps {
  lat?: number;
  lng?: number;
}

export function LiveMap({ lat = 12.9716, lng = 77.5946 }: LiveMapProps) {
  const mapMyIndiaEmbed = import.meta.env.VITE_MMI_EMBED_URL as string | undefined;
  const src = mapMyIndiaEmbed
    ? `${mapMyIndiaEmbed}?q=${lat},${lng}&z=12`
    : `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.04},${lat - 0.04},${lng + 0.04},${lat + 0.04}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
      <iframe
        title="Live route map"
        src={src}
        className="h-64 w-full border-0 grayscale contrast-125 opacity-90 transition-opacity hover:opacity-100"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
