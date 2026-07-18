
"use client";

import { useState } from "react";
import {
  Trophy,
  Trash2,
  RefreshCw,
  PlusCircle,
  TrendingUp,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface TeamRow {
  id: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number; // Goals For
  ga: number; // Goals Against
}

export default function GamesTablePage() {
  const [teams, setTeams] = useState<TeamRow[]>([
    { id: "1", name: "Apex Warriors", played: 5, won: 3, drawn: 1, lost: 1, gf: 12, ga: 6 },
    { id: "2", name: "Cyber Knights", played: 5, won: 2, drawn: 2, lost: 1, gf: 8, ga: 5 },
    { id: "3", name: "Echo United", played: 5, won: 1, drawn: 2, lost: 2, gf: 6, ga: 9 },
    { id: "4", name: "Zenith FC", played: 5, won: 0, drawn: 3, lost: 2, gf: 4, ga: 10 }
  ]);
  const [newTeamName, setNewTeamName] = useState("");

  const addTeam = () => {
    if (!newTeamName.trim()) {
      toast.error("Please enter a valid team name!");
      return;
    }
    const team: TeamRow = {
      id: `${Date.now()}`,
      name: newTeamName.trim(),
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0
    };
    setTeams([...teams, team]);
    setNewTeamName("");
    toast.success("New competitor registered!");
  };

  const removeTeam = (id: string) => {
    setTeams(teams.filter(t => t.id !== id));
    toast.success("Competitor removed from table");
  };

  const updateStat = (id: string, field: keyof Omit<TeamRow, "id" | "name">, delta: number) => {
    setTeams(prev => prev.map(t => {
      if (t.id !== id) return t;
      const newVal = Math.max(0, t[field] + delta);

      // Auto-compute total played matches if modifying won/lost/drawn
      let updatedPlayed = t.played;
      if (field === "won" || field === "lost" || field === "drawn") {
        const temp = { ...t, [field]: newVal };
        updatedPlayed = temp.won + temp.lost + temp.drawn;
      }

      return {
        ...t,
        [field]: newVal,
        played: updatedPlayed
      };
    }));
  };

  const resetTable = () => {
    setTeams([]);
    toast.success("Table cleared!");
  };

  // Sort by Points (W*3 + D), then Goal Diff (GF - GA), then Goals For (GF)
  const sortedTeams = [...teams].sort((a, b) => {
    const ptsA = a.won * 3 + a.drawn;
    const ptsB = b.won * 3 + b.drawn;
    if (ptsB !== ptsA) return ptsB - ptsA;

    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;
    if (gdB !== gdA) return gdB - gdA;

    return b.gf - a.gf;
  });

  return (
    <div className='container mx-auto px-6 py-12 max-w-6xl min-h-[calc(100vh-64px)] pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12'>
        <div>
          <div className='badge mb-4'>
            <Trophy className='h-3.5 w-3.5' />
            Tournament Studio
          </div>
          <h1 className='text-4xl font-extrabold font-display leading-[1.1]'>
            Games <span className='gradient-text'>Table.</span>
          </h1>
          <p className='mt-2 text-pw-muted'>
            Register competitors, input live stats, auto-calculate points and sort standings dynamically.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant='outline'
            onClick={resetTable}
            className='bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-6'>
            <RefreshCw className='h-4 w-4' /> Clear Table
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
        {/* Table Standings Panel */}
        <div className='lg:col-span-8 space-y-6'>
          <Card className='card-glow overflow-x-auto p-6'>
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/5 text-pw-muted font-bold text-xs uppercase">
                  <th className="py-3 px-2">#</th>
                  <th className="py-3 px-2">Competitor</th>
                  <th className="py-3 px-2 text-center">PL</th>
                  <th className="py-3 px-2 text-center">W</th>
                  <th className="py-3 px-2 text-center">D</th>
                  <th className="py-3 px-2 text-center">L</th>
                  <th className="py-3 px-2 text-center">GF</th>
                  <th className="py-3 px-2 text-center">GA</th>
                  <th className="py-3 px-2 text-center">GD</th>
                  <th className="py-3 px-2 text-center text-pw-primary">PTS</th>
                  <th className="py-3 px-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedTeams.map((team, idx) => {
                  const pts = team.won * 3 + team.drawn;
                  const gd = team.gf - team.ga;

                  return (
                    <tr key={team.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 px-2 font-bold text-pw-muted">{idx + 1}</td>
                      <td className="py-4 px-2 font-bold text-pw-text">{team.name}</td>
                      <td className="py-4 px-2 text-center font-mono">{team.played}</td>

                      {/* Won controls */}
                      <td className="py-4 px-2 text-center font-mono">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => updateStat(team.id, "won", -1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">-</button>
                          <span>{team.won}</span>
                          <button onClick={() => updateStat(team.id, "won", 1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">+</button>
                        </div>
                      </td>

                      {/* Drawn controls */}
                      <td className="py-4 px-2 text-center font-mono">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => updateStat(team.id, "drawn", -1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">-</button>
                          <span>{team.drawn}</span>
                          <button onClick={() => updateStat(team.id, "drawn", 1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">+</button>
                        </div>
                      </td>

                      {/* Lost controls */}
                      <td className="py-4 px-2 text-center font-mono">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => updateStat(team.id, "lost", -1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">-</button>
                          <span>{team.lost}</span>
                          <button onClick={() => updateStat(team.id, "lost", 1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">+</button>
                        </div>
                      </td>

                      {/* GF controls */}
                      <td className="py-4 px-2 text-center font-mono">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => updateStat(team.id, "gf", -1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">-</button>
                          <span>{team.gf}</span>
                          <button onClick={() => updateStat(team.id, "gf", 1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">+</button>
                        </div>
                      </td>

                      {/* GA controls */}
                      <td className="py-4 px-2 text-center font-mono">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => updateStat(team.id, "ga", -1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">-</button>
                          <span>{team.ga}</span>
                          <button onClick={() => updateStat(team.id, "ga", 1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">+</button>
                        </div>
                      </td>

                      <td className="py-4 px-2 text-center font-mono text-pw-muted">{gd > 0 ? `+${gd}` : gd}</td>
                      <td className="py-4 px-2 text-center font-mono font-bold text-pw-primary">{pts}</td>

                      <td className="py-4 px-2 text-center">
                        <Button
                          onClick={() => removeTeam(team.id)}
                          variant="ghost"
                          className="h-8 w-8 p-0 text-pw-muted hover:text-pw-danger">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {teams.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-pw-muted">
                      No teams registered yet. Use the sidebar to register competitors!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Competitor Registration */}
        <div className='lg:col-span-4 flex flex-col gap-6'>
          <Card className='card-glow p-8 space-y-6'>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-pw-primary" /> Add Competitor
            </h3>

            <div className="space-y-4">
              <div>
                <label className='text-xs font-bold text-pw-muted uppercase block mb-1.5'>
                  Competitor / Team Name
                </label>
                <Input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Genesis Warriors"
                  className="bg-white/5 border-white/10 h-12"
                />
              </div>

              <Button
                onClick={addTeam}
                className="w-full btn-primary h-12 text-sm font-bold gap-2">
                <PlusCircle className="h-4 w-4" /> Register Competitor
              </Button>
            </div>
          </Card>

          {/* Quick Stats Summary */}
          <Card className='card-glow p-6 space-y-4'>
            <h4 className="text-xs font-bold uppercase tracking-widest text-pw-muted flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-pw-secondary" /> Dynamic Standings Rule
            </h4>
            <p className="text-[11px] text-pw-muted leading-relaxed">
              Teams are automatically ranked on point accumulation (3 for a Win, 1 for a Draw, 0 for a Loss). Ties are resolved by Goal Difference (Goals For minus Goals Against), then Goals For.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
