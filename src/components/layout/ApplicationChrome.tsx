"use client";

import { usePathname } from "next/navigation";
import NavigationHeader from "../NavigationHeader";
import PwaRegistrar from "../mobile/PwaRegistrar";
import MobileBottomNav from "../mobile/MobileBottomNav";
import AppFooter from "./AppFooter";
import NotificationBell from "./NotificationBell";
import { EffectLayer } from "../hud/EffectLayer";
import { HudGridLayer } from "../hud/HudGridLayer";
import { HudScanlines } from "../hud/HudScanlines";
import { HudVignette } from "../hud/HudVignette";
import { HudParticles } from "../hud/HudParticles";
import { HudCursorGlow } from "../hud/HudCursorGlow";
import { HudBootSequence } from "../hud/HudBootSequence";
import { GlassFilter } from "../hud/GlassFilter";
import { XRayPanel } from "../debug/XRayPanel";

export default function ApplicationChrome() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <>
      <GlassFilter />
      <EffectLayer name="grid">
        <HudGridLayer />
      </EffectLayer>
      <EffectLayer name="scanlines">
        <HudScanlines />
      </EffectLayer>
      <EffectLayer name="vignette">
        <HudVignette />
      </EffectLayer>
      <EffectLayer name="particles">
        <HudParticles />
      </EffectLayer>
      <EffectLayer name="cursor-glow">
        <HudCursorGlow />
      </EffectLayer>
      <HudBootSequence />
      <PwaRegistrar />
      <NavigationHeader />
      <div className="md:hidden fixed top-[calc(env(safe-area-inset-top)+0.75rem)] right-3 z-[300]">
        <NotificationBell />
      </div>
      <MobileBottomNav />
      <AppFooter />
      <XRayPanel />
    </>
  );
}
