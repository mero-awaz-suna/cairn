export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-warm-cream pb-24">
      <div className="h-[52px]" />
      <div className="bg-sand h-[180px] animate-[shimmer_1.5s_infinite]" />
      <div className="px-6 -mt-2">
        <div className="grid grid-cols-3 gap-[10px] mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-[10px] h-[72px] shadow-[0_2px_12px_rgba(44,40,37,0.05)] animate-[shimmer_1.5s_infinite]" />
          ))}
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-[16px] h-[100px] mb-4 shadow-[0_2px_12px_rgba(44,40,37,0.05)] animate-[shimmer_1.5s_infinite]" />
        ))}
      </div>
    </div>
  );
}
