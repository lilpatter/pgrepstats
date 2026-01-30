import { FeatureGrid } from "@/components/home/FeatureGrid";
import { HomeHero } from "@/components/home/HomeHero";

export default function Home() {
  return (
    <div className="space-y-16 pb-20">
      <HomeHero />
      <div className="neon-divider mx-auto max-w-5xl" />
      <FeatureGrid />
    </div>
  );
}
