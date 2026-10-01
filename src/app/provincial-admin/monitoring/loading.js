export default function Loading() {
  return (
    <div className="w-full h-[600px] sm:h-[800px] bg-gray-100 animate-pulse rounded-2xl flex flex-col items-center justify-center border border-gray-200">
      <div className="flex flex-col items-center gap-3">
        <div className="size-10 border-4 border-gray-300 border-t-primary rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Loading Map Data...</p>
      </div>
    </div>
  )
}
