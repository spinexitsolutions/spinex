// Shown instantly while the next page loads, so a click never feels stuck.
export default function Loading() {
  return (
    <div className="min-h-[70svh] bg-white" aria-busy="true" aria-label="Loading">
      <div className="fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden bg-lav-100">
        <div className="h-full w-1/3 animate-[spinex-load_1s_ease-in-out_infinite] rounded-full bg-lav-600" />
      </div>
      <div className="container-x pt-40">
        <div className="h-4 w-40 animate-pulse rounded-full bg-mist" />
        <div className="mt-6 h-12 w-full max-w-2xl animate-pulse rounded-2xl bg-mist" />
        <div className="mt-4 h-12 w-2/3 max-w-xl animate-pulse rounded-2xl bg-mist" />
      </div>
      <style>{`@keyframes spinex-load{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </div>
  );
}
