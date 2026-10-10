"use client";
import { useRef, type HTMLAttributes, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";
// Adapted concepts: https://reactbits.dev/components/spotlight-card and /animations/magnet.
// Local pointer handlers avoid one global mouse listener per card.
export function SpotlightCard({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  return (
    <div
      ref={ref}
      className={cn("spotlight-card", className)}
      {...props}
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse" || reduced || !ref.current) return;
        const bounds = ref.current.getBoundingClientRect();
        ref.current.style.setProperty(
          "--pointer-x",
          `${event.clientX - bounds.left}px`,
        );
        ref.current.style.setProperty(
          "--pointer-y",
          `${event.clientY - bounds.top}px`,
        );
      }}
    >
      {children}
    </div>
  );
}
export function Magnet({ children }: { children: ReactNode }) {
  const x = useMotionValue(0),
    y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 250, damping: 20 }),
    springY = useSpring(y, { stiffness: 250, damping: 20 });
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="inline-flex"
      style={{ x: reduced ? 0 : springX, y: reduced ? 0 : springY }}
      onPointerMove={(event) => {
        if (reduced || event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - rect.left - rect.width / 2) * 0.08);
        y.set((event.clientY - rect.top - rect.height / 2) * 0.08);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -20px 0px" }}
      transition={{ duration: reduced ? 0 : 0.45, delay: reduced ? 0 : delay }}
    >
      {children}
    </motion.div>
  );
}
