export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-warm-cream pb-24">
      <div className="h-[52px]" />

      {/* Greeting skeleton */}
      <div className="px-6 mb-4">
        <div className="h-8 w-48 bg-sand rounded-[8px] mb-2 animate-[shimmer_1.5s_infinite]" />
        <div className="h-4 w-64 bg-sand-light rounded-[8px] animate-[shimmer_1.5s_infinite]" />
      </div>

      {/* Streak card skeleton */}
      <div className="mx-6 mt-4 bg-white rounded-[16px] px-5 py-5 shadow-[0_2px_12px_rgba(44,40,37,0.05)]">
        <div className="h-5 w-32 bg-sand-light rounded-[8px] animate-[shimmer_1.5s_infinite]" />
      </div>

      {/* Journal prompt skeleton */}
      <div className="mx-6 mt-5 bg-sand rounded-[16px] h-[140px] animate-[shimmer_1.5s_infinite]" />

      {/* Quick actions skeleton */}
      <div className="mx-6 mt-4 flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 bg-white rounded-[16px] h-[72px] shadow-[0_2px_12px_rgba(44,40,37,0.05)] animate-[shimmer_1.5s_infinite]" />
        ))}
      </div>

      {/* Entries skeleton */}
      <div className="px-6 pt-6 pb-3">
        <div className="h-5 w-28 bg-sand-light rounded-[8px] animate-[shimmer_1.5s_infinite]" />
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="mx-6 mb-[10px] bg-white rounded-[10px] h-[66px] shadow-[0_1px_6px_rgba(44,40,37,0.04)] animate-[shimmer_1.5s_infinite]" />
      ))}
    </div>
  );
}
