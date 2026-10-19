import Link from "next/link";

export default function PlaygroundLoading() {
  return (
    <main className="fixed inset-0 grid place-items-center bg-[#171a16] p-6 text-[#f2f1e9]">
      <section className="w-full max-w-sm border-l border-[#c7ef73] pl-6">
        <Link href="/" className="mb-6 inline-flex min-h-11 items-center font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c7ef73]">ohaki</Link>
        <h1 className="text-2xl font-semibold tracking-tight" role="status">Opening the rooftop…</h1>
        <div aria-hidden="true" className="my-6 h-px w-full overflow-hidden bg-white/20"><div className="h-full w-1/3 animate-pulse bg-[#c7ef73] motion-reduce:animate-none" /></div>
        <p className="leading-relaxed text-[#d5d9cd]">Preparing your projects and saved visit.</p>
        <Link href="/work" className="mt-6 inline-flex min-h-11 items-center text-[#c7ef73] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c7ef73]">Read the work without 3D</Link>
      </section>
    </main>
  );
}
