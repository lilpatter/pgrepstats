"use client";

import { motion } from "framer-motion";
import {
  Cpu,
  Eye,
  Gauge,
  Radar,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Multi-Platform Scanning",
    description:
      "Scan player data across Steam, FACEIT, and Leetify in a single workflow.",
    icon: Radar,
  },
  {
    title: "AI Detection",
    description:
      "AI models flag suspicious aim, movement, and match anomalies instantly.",
    icon: Cpu,
  },
  {
    title: "Watchlists",
    description:
      "Track high-risk accounts across queues and share lists with your team.",
    icon: Eye,
  },
  {
    title: "Overwatch",
    description:
      "Community-driven demo review with transparent verdict tracking.",
    icon: ShieldCheck,
  },
  {
    title: "Reputation System",
    description:
      "Unified score blending stats, reports, and demo audits across platforms.",
    icon: Gauge,
  },
  {
    title: "Community Intel",
    description:
      "Crowdsourced insights from verified players and competitive analysts.",
    icon: Users,
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto mt-16 w-full max-w-6xl">
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.4em] text-[rgba(155,108,255,0.7)]">
          Everything you need for transparency
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-white">
          PGREP Feature Suite
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-[rgba(233,228,255,0.65)]">
          Tools to scan profiles, flag cheaters, view watchlists, and explore
          deep match analytics across CS2 platforms.
        </p>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.div key={feature.title} whileHover={{ y: -6 }}>
              <Card className="h-full space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(124,77,255,0.2)]">
                  <Icon className="h-5 w-5 text-[#9b6cff]" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

