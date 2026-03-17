import { Outlet } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Navbar from './Navbar';

function AppShell() {
  const shellRef = useRef(null);
  const spotlightRef = useRef(null);
  const frameRef = useRef(0);
  const targetPositionRef = useRef({ x: 0, y: 0 });
  const currentPositionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const shell = shellRef.current;
    const spotlight = spotlightRef.current;

    if (!shell || !spotlight) {
      return undefined;
    }

    const rect = shell.getBoundingClientRect();
    const centeredPosition = {
      x: rect.width * 0.5,
      y: rect.height * 0.18,
    };

    currentPositionRef.current = centeredPosition;
    targetPositionRef.current = centeredPosition;

    const animateSpotlight = () => {
      const current = currentPositionRef.current;
      const target = targetPositionRef.current;

      current.x += (target.x - current.x) * 0.12;
      current.y += (target.y - current.y) * 0.12;

      spotlight.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;

      if (Math.abs(target.x - current.x) < 0.5 && Math.abs(target.y - current.y) < 0.5) {
        frameRef.current = 0;
        return;
      }

      frameRef.current = window.requestAnimationFrame(animateSpotlight);
    };

    const syncSpotlight = () => {
      if (frameRef.current) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(animateSpotlight);
    };

    const handlePointerMove = (event) => {
      const nextRect = shell.getBoundingClientRect();

      targetPositionRef.current = {
        x: event.clientX - nextRect.left,
        y: event.clientY - nextRect.top,
      };

      syncSpotlight();
    };

    const handlePointerLeave = () => {
      const nextRect = shell.getBoundingClientRect();

      targetPositionRef.current = {
        x: nextRect.width * 0.72,
        y: nextRect.height * 0.12,
      };

      syncSpotlight();
    };

    shell.addEventListener('pointermove', handlePointerMove);
    shell.addEventListener('pointerleave', handlePointerLeave);
    syncSpotlight();

    return () => {
      shell.removeEventListener('pointermove', handlePointerMove);
      shell.removeEventListener('pointerleave', handlePointerLeave);

      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <div ref={shellRef} className="page-shell relative min-h-[100svh] overflow-hidden bg-[var(--color-bg)]">
      <div ref={spotlightRef} className="ambient-spotlight pointer-events-none absolute -left-60 -top-60 h-[36rem] w-[36rem] rounded-full" />
      <div className="pointer-events-none absolute inset-0 dashboard-grid opacity-40" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(106,189,255,0.12),transparent_58%)]" />
      <div className="pointer-events-none absolute -left-16 top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(240,140,86,0.18),transparent_68%)] blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(24,154,255,0.16),transparent_68%)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(14,165,165,0.16),transparent_70%)] blur-3xl" />

      <div className="relative z-10">
        <Navbar />

        <main className="mx-auto w-full max-w-[96rem] px-3 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:px-8 lg:pt-36">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
