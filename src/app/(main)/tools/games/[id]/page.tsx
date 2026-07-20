import { Suspense } from "react";
import type { Metadata } from "next";
import GamesClient from "../GamesClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Tournament Standings Live Monitor | Ping World",
  description:
    "View live scoreboard, sports standings, league points, wins, losses, and goals on the PingWorld realtime network. Built by Qal Technologies.",
  openGraph: {
    title: "Tournament Standings Live Monitor | Ping World",
    description: "View live scoreboard, sports standings, league points, wins, losses, and goals in real-time.",
  }
};

export default async function TournamentViewerPage(props: PageProps) {
  const { id } = await props.params;

  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-6 py-12 max-w-6xl text-center text-pw-muted">
          Establishing websocket connection & loading live standings...
        </div>
      }>
      <GamesClient tournamentId={id} readOnly={true} />
    </Suspense>
  );
}
