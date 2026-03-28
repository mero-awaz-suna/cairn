export default function EchoesLoading() {
  return (
    <div className="min-h-screen bg-warm-cream pb-24">
      <div className="h-[52px]" />
      <div className="px-6 mb-4">
        <div className="h-7 w-36 bg-sand rounded-[8px] mb-2 animate-[shimmer_1.5s_infinite]" />
        <div className="h-4 w-56 bg-sand-light rounded-[8px] animate-[shimmer_1.5s_infinite]" />
      </div>
      <div className="flex gap-2 px-6 py-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-16 bg-white rounded-full border border-sand animate-[shimmer_1.5s_infinite]" />
        ))}
      </div>
      <div className="px-6 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-[16px] h-[120px] border-l-[3px] border-sand shadow-[0_2px_12px_rgba(44,40,37,0.05)] animate-[shimmer_1.5s_infinite]" />
        ))}
      </div>
    </div>
  );
}
