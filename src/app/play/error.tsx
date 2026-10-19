"use client";

import Link from "next/link";

export default function PlaygroundError({ reset }: { reset: () => void }) {
  return (
    <main className="fixed inset-0 grid place-items-center overflow-y-auto bg-[#171a16] p-6 text-[#f2f1e9]">
      <section className="w-full max-w-md border-l border-[#c7ef73] pl-6" role="alert">
        <Link href="/" className="mb-4 inline-flex min-h-11 items-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c7ef73]">ohaki</Link>
        <h1 className="text-3xl font-semibold tracking-tight">The rooftop could not open.</h1>
        <p className="mt-4 leading-relaxed text-[#d5d9cd]">Your saved chapters are safe. Try again or read the projects without 3D.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="min-h-11 bg-[#c7ef73] px-5 font-semibold text-[#171a16] transition-colors hover:bg-[#d4f692] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c7ef73] motion-reduce:transition-none" onClick={reset}>Try again</button>
          <Link className="inline-flex min-h-11 items-center border border-white/35 px-5 text-[#f2f1e9] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c7ef73]" href="/work">Read the work</Link>
        </div>
      </section>
    </main>
  );
}
