import type { Metadata } from "next";
import WisdomPortal from "../components/portal/WisdomPortal";

export const metadata: Metadata = {
  title: "Wisdom Course | App portal",
  description: "A single portal to Wisdom Course apps and services.",
  manifest: null,
  icons: null,
};

export default function HomePage() {
  return <WisdomPortal />;
}
