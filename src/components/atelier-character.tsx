"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function AtelierCharacter({ motionEnabled }: { motionEnabled: boolean }) {
  const scene = useRef<SVGSVGElement>(null);
  const greet = useRef<(() => void) | null>(null);
  const [greetings, setGreetings] = useState(0);

  useEffect(() => {
    if (!motionEnabled) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import("gsap").then(({ gsap }) => {
      if (disposed || !scene.current) return;
      const svg = scene.current;
      const context = gsap.context(() => {
        const eyes = svg.querySelector("[data-eyes]");
        const hand = svg.querySelector("[data-hand]");
        const plane = svg.querySelector("[data-plane]");
        const x = gsap.quickTo(eyes, "x", { duration: .3, ease: "power2.out" });
        const y = gsap.quickTo(eyes, "y", { duration: .3, ease: "power2.out" });
        gsap.set(hand, { svgOrigin: "311 174" });
        gsap.set(plane, { transformOrigin: "50% 50%" });
        const wave = gsap.timeline({ paused: true })
          .to(hand, { rotation: -30, duration: .25, ease: "power2.out" })
          .to(hand, { rotation: 14, duration: .18, repeat: 3, yoyo: true })
          .to(hand, { rotation: 0, duration: .55, ease: "elastic.out(1,.4)" })
          .fromTo(plane, { x: -70, y: 24, rotation: -12, opacity: 0 }, { x: 30, y: -16, rotation: 6, opacity: 1, duration: .9, ease: "power2.out", immediateRender: false }, .15)
          .to(plane, { x: 95, y: -55, opacity: 0, duration: .5, ease: "power2.in" })
          .set(plane, { x: 0, y: 0, rotation: 0, opacity: 1 });
        greet.current = () => wave.restart();
        const move = (event: PointerEvent) => {
          if (event.pointerType === "touch") return;
          const bounds = svg.getBoundingClientRect();
          x(gsap.utils.clamp(-5, 5, ((event.clientX - bounds.left) / bounds.width - .5) * 16));
          y(gsap.utils.clamp(-4, 4, ((event.clientY - bounds.top) / bounds.height - .5) * 12));
        };
        const reset = () => { x(0); y(0); };
        const visibility = () => { if (document.hidden) wave.progress(1).pause(); };
        const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) wave.progress(1).pause(); });
        observer.observe(svg);
        svg.addEventListener("pointermove", move);
        svg.addEventListener("pointerleave", reset);
        document.addEventListener("visibilitychange", visibility);
        return () => {
          greet.current = null;
          observer.disconnect();
          svg.removeEventListener("pointermove", move);
          svg.removeEventListener("pointerleave", reset);
          document.removeEventListener("visibilitychange", visibility);
        };
      });
      cleanup = () => context.revert();
    }).catch(() => { /* The illustration and greeting remain usable without enhancement. */ });
    return () => { disposed = true; cleanup?.(); };
  }, [motionEnabled]);

  return <figure className="home-art" data-art>
    <div className="home-art-frame">
      <svg ref={scene} className="atelier-scene" viewBox="0 0 480 300" role="img" aria-labelledby="atelier-title atelier-description">
        <title id="atelier-title">A little character. A working imagination.</title>
        <desc id="atelier-description">An original illustrated coding companion on a rooftop. Move your pointer to catch its eye, or use Say hello to make it wave.</desc>
        <rect width="480" height="300" fill="#f3f1e9" />
        <g fill="none" stroke="#17255b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="387" cy="65" r="27" fill="#ef9569" stroke="none" />
          <path d="M41 91h72m-55-14h37M334 122h96M79 247h332M110 266h260" opacity=".4" />
          <path d="M33 226l65-39 82 10 91-25 171 54-167 50z" fill="#d7dfec" />
          <path d="M33 226v16l242 50 167-50v-16M275 276v16" />
          <path d="M120 218l-12 23m63-14-10 25M306 220l38 28" />
          <path d="M150 180q-29-7-34 13t30 21" strokeWidth="10" />
          <g data-hand><path d="M309 175q43-2 34-42" strokeWidth="10" /><path d="M340 135l-10-16m13 13 1-22m3 22 9-17" strokeWidth="7" /></g>
          <path d="M196 220l-8 27-18 2m91-29 6 25 19 1" strokeWidth="9" />
          <rect x="143" y="117" width="170" height="113" rx="19" fill="#2944eb" />
          <rect x="154" y="126" width="148" height="80" rx="10" fill="#fffdf4" />
          <path d="M161 143h132" /><circle cx="166" cy="135" r="2" fill="#17255b" /><circle cx="175" cy="135" r="2" fill="#17255b" />
          <path d="M210 117v-12h37" /><circle cx="252" cy="105" r="5" fill="#ef9569" />
          <g data-eyes fill="#17255b" stroke="none"><rect x="193" y="159" width="10" height="16" rx="5" /><rect x="250" y="159" width="10" height="16" rx="5" /></g>
          <path d="M215 183q12 12 24 0" /><path d="M211 217h36" stroke="#fffdf4" />
          <path d="M368 220l-4-38m5 20q24-21 13-36-22 7-13 36m-3-7q-25-4-25-23 25-3 25 23" fill="#9eaf8b" />
          <path d="M349 217h36l-5 24h-26z" fill="#ef9569" />
          <g data-plane><path d="M302 66l47-14-19 32-6-17z" fill="#fffdf4" /><path d="M324 67l25-15m-25 15-3 15 9-8" /></g>
          <path d="M121 81l-9 9 9 9m18-18 9 9-9 9m-6-23-7 28" />
          <path d="M66 153v12m-6-6h12m330-8v12m-6-6h12" />
        </g>
      </svg>
      <div className="home-art-caption">
        <Button variant="ghost" className="atelier-hello" onClick={() => { setGreetings(value => value + 1); greet.current?.(); }}>Say hello <span aria-hidden="true">↗</span></Button>
        <Link href="/play" prefetch={false}>Explore in 3D <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </div>
    </div>
    <figcaption role="status">{greetings ? "Hello, curious human. Let’s make something good." : "Code with a human side. Move your cursor, or say hello."}</figcaption>
  </figure>;
}
