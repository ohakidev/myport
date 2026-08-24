"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, GameController, Keyboard, MapPin, Sparkle } from "@phosphor-icons/react";
import AnimatedContent from "@/components/AnimatedContent";
import Aurora from "@/components/Aurora";
import BlurText from "@/components/BlurText";
import ClickSpark from "@/components/ClickSpark";
import { Button } from "@/components/ui/button";

const controls = [
  { icon: <GameController size={15} weight="duotone" />, keys: ["A", "D"], label: "run" },
  { icon: <Keyboard size={15} weight="duotone" />, keys: ["W", "SPACE"], label: "jump" },
  { icon: <MapPin size={15} weight="duotone" />, keys: ["E"], label: "inspect" },
];

export function Intro({ start }: { start: () => void }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      aria-label="Start portfolio experience"
      className="game-intro fixed inset-0 z-[70] grid place-items-center overflow-hidden bg-[#07101d] px-5 sm:px-10"
      initial={false}
      exit={reduceMotion ? { opacity: 0, transition: { duration: 0.01 } } : { clipPath: "inset(0 0 100% 0)", transition: { duration: 0.7, ease: [0.85, 0, 0.15, 1] } }}
    >
      <div className="intro-aurora" aria-hidden="true">
        <Aurora colorStops={["#ff7a75", "#64e8ff", "#ffd166"]} amplitude={1.15} blend={0.62} speed={0.34} />
      </div>
      <div className="intro-grid" aria-hidden="true" />
      <div className="intro-noise" aria-hidden="true" />
      <div className="signal-ring animate-[orbit_42s_linear_infinite]" aria-hidden="true" />

      <div className="intro-content relative z-10 mx-auto w-full max-w-6xl">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ff7a75]/40 bg-[#ff7a75]/10 px-3.5 py-1.5"
        >
          <Sparkle size={14} weight="duotone" className="text-[#ff7a75]" />
          <span className="font-mono text-[11px] font-bold tracking-[.18em] text-[#ff7a75]">INFINITE GITHUB WORLD / NO FINAL SCREEN</span>
        </motion.div>

        <BlurText
          as="h1"
          className="intro-title"
          text="RESEARCH THE WORLD. BUILD WHAT HELPS."
          animateBy="words"
          delay={72}
          direction="bottom"
          stepDuration={0.28}
        />

        <AnimatedContent distance={28} duration={0.65} delay={0.35}>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            A playable timeline of <strong className="font-semibold text-foreground">ohakidev</strong>. Every public
            repository is a landmark in one seamless loop—run past “Now” and the origin returns without resetting your
            momentum.
          </p>
        </AnimatedContent>

        <AnimatedContent distance={20} duration={0.6} delay={0.5}>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ClickSpark sparkColor="#64e8ff" sparkRadius={26} sparkCount={9} duration={480}>
              <Button size="lg" onClick={start} className="h-12 gap-2.5 rounded-full bg-[#ffd166] px-6 text-[15px] font-bold tracking-wide text-[#07101d] shadow-[6px_6px_0_var(--coral),0_18px_44px_rgba(255,209,102,.35)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--coral)]">
                Enter the infinite trail <ArrowRight size={18} weight="bold" />
              </Button>
            </ClickSpark>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {controls.map((control) => (
                <span key={control.label} className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-[.1em] text-white/55">
                  <span className="text-[#64e8ff]">{control.icon}</span>
                  {control.keys.map((key) => (
                    <kbd key={key}>{key}</kbd>
                  ))}
                  {control.label.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </AnimatedContent>
      </div>

      <p className="absolute bottom-5 left-6 z-10 hidden font-mono text-[10px] font-semibold tracking-[.12em] text-white/35 sm:block">
        PROCEDURAL EXPLORER / REACT BITS INTERFACE / THREE.JS WORLD / GSAP CHOREOGRAPHY
      </p>
    </motion.section>
  );
}
