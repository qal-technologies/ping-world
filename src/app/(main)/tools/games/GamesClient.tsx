"use client";

import { useState, useEffect } from "react";
import {
  Trophy,
  Trash2,
  RefreshCw,
  PlusCircle,
  TrendingUp,
  UserPlus,
  Share2,
  CloudLightning,
  Eye,
  Edit3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { HybridStorage } from "@/lib/storage-utils";
import { supabase } from "@/lib/supabase";

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

interface GamesClientProps {
  tournamentId?: string;
  readOnly?: boolean;
}

export default function GamesTablePage({ tournamentId, readOnly = false }: GamesClientProps) {
  // Determine if we're in admin vs read-only mode
  const [adminId, setAdminId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(readOnly);
  const [tournamentName, setTournamentName] = useState("Standings Tournament");

  const [teams, setTeams] = useState<TeamRow[]>([
    { id: "1", name: "Apex Warriors", played: 5, won: 3, drawn: 1, lost: 1, gf: 12, ga: 6 },
    { id: "2", name: "Cyber Knights", played: 5, won: 2, drawn: 2, lost: 1, gf: 8, ga: 5 },
    { id: "3", name: "Echo United", played: 5, won: 1, drawn: 2, lost: 2, gf: 6, ga: 9 },
    { id: "4", name: "Zenith FC", played: 5, won: 0, drawn: 3, lost: 2, gf: 4, ga: 10 }
  ]);
  const [newTeamName, setNewTeamName] = useState("");
  const [loading, setLoading] = useState(false);

  // Extract from query params on client side safely
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const adminParam = params.get("admin");
      if (adminParam) {
        setAdminId(adminParam);
        setActiveId(adminParam);
        setIsReadOnly(false);
      } else if (tournamentId) {
        setActiveId(tournamentId);
        setIsReadOnly(true);
      }
    }
  }, [tournamentId]);

  // Load tournament data if activeId is set
  useEffect(() => {
    if (!activeId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Try local storage cache first
        const cacheRaw = localStorage.getItem("pingworld_games");
        if (cacheRaw) {
          const cached = JSON.parse(cacheRaw);
          const found = cached.find((item: any) => item.id === activeId);
          if (found) {
            const dataObj = found.content || found;
            setTeams(dataObj.teams || []);
            setTournamentName(dataObj.name || "Standings Tournament");
          }
        }

        // Fetch from Supabase
        const { data, error } = await supabase
          .from("tournaments")
          .select("*")
          .eq("id", activeId)
          .single();

        if (!error && data) {
          setTeams(data.teams || []);
          setTournamentName(data.name || "Standings Tournament");
        }
      } catch (err) {
        console.warn("Failed loading tournament details:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeId]);

  // Auto-sync debounce to prevent API thrashing
  useEffect(() => {
    if (!adminId) return;

    const timer = setTimeout(async () => {
      try {
        await HybridStorage.save(adminId, {
          id: adminId,
          name: tournamentName,
          teams: teams
        }, "games");
      } catch (err) {
        console.error("Auto sync failed:", err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [teams, tournamentName, adminId]);

  const createTournament = async () => {
    const newUUID = typeof window !== "undefined" && window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);

    try {
      await HybridStorage.save(newUUID, {
        id: newUUID,
        name: tournamentName,
        teams: teams
      }, "games");

      setAdminId(newUUID);
      setActiveId(newUUID);
      setIsReadOnly(false);

      if (typeof window !== "undefined") {
        const newUrl = `${window.location.pathname}?admin=${newUUID}`;
        window.history.pushState({ path: newUrl }, "", newUrl);
      }
      toast.success("Tournament created and synced to cloud!");
    } catch (e) {
      toast.error("Failed to sync tournament details.");
    }
  };

  const copyShareLink = () => {
    const targetLink = activeId || adminId;
    if (!targetLink) {
      toast.error("Please create a cloud tournament first!");
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = `${origin}/tools/games/${targetLink}`;
    
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Viewer share link copied to clipboard!");
    } else {
      toast.error("Unable to copy to clipboard automatically.");
    }
  };

  const addTeam = () => {
    if (isReadOnly) return;
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
    if (isReadOnly) return;
    setTeams(teams.filter(t => t.id !== id));
    toast.success("Competitor removed from table");
  };

  const updateStat = (id: string, field: keyof Omit<TeamRow, "id" | "name">, delta: number) => {
    if (isReadOnly) return;
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
    if (isReadOnly) return;
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
    <div className='container mx-auto px-4 sm:px-6 py-12 max-w-6xl min-h-[calc(100vh-64px)] pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12'>
        <div className="space-y-3">
          <div className='badge border-pw-primary/20 bg-pw-primary/10 text-pw-primary'>
            <Trophy className='h-3.5 w-3.5' />
            {isReadOnly ? "Viewer Standings Mode" : "Admin Standings Mode"}
          </div>
          
          {isReadOnly ? (
            <h1 className='text-3xl sm:text-4xl font-extrabold font-display leading-[1.1] text-pw-text'>
              {tournamentName}
            </h1>
          ) : (
            <div className="flex flex-col gap-1 max-w-md">
              <label className="text-[10px] font-bold text-pw-muted uppercase tracking-wider">Tournament Title</label>
              <Input
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                className="bg-transparent text-xl sm:text-2xl font-extrabold font-display border-white/10 h-10 px-2 pl-0 focus-visible:ring-0 focus-visible:border-pw-primary"
              />
            </div>
          )}
          <p className='mt-2 text-sm text-pw-muted'>
            {isReadOnly 
              ? "Real-time viewer access to competitor standings. Updates dynamically as matches are reported."
              : "Register competitors, input live stats, auto-calculate points and sort standings dynamically."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {isReadOnly ? (
            <div className="flex gap-2">
              <Button
                variant='outline'
                onClick={copyShareLink}
                className='bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-5 text-xs font-bold'>
                <Share2 className='h-4 w-4 text-pw-secondary' /> Share Table
              </Button>
            </div>
          ) : (
            <>
              {adminId ? (
                <div className="flex gap-2">
                  <Button
                    variant='outline'
                    onClick={copyShareLink}
                    className='bg-white/5 border-white/10 hover:bg-white/10 gap-2 h-11 px-5 text-xs font-bold'>
                    <Share2 className='h-4 w-4 text-pw-secondary' /> Copy Viewer Link
                  </Button>
                  <Button
                    variant='outline'
                    onClick={resetTable}
                    className='bg-pw-danger/10 border-pw-danger/20 hover:bg-pw-danger/20 gap-2 h-11 px-5 text-xs font-bold text-pw-danger'>
                    <RefreshCw className='h-4 w-4' /> Reset Array
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={createTournament}
                  className='btn-primary gap-2 h-11 px-6 text-xs font-bold'>
                  <CloudLightning className='h-4 w-4' /> Go Live (Sync DB)
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
        {/* Table Standings Panel */}
        <div className={isReadOnly ? 'lg:col-span-12 space-y-6' : 'lg:col-span-8 space-y-6'}>
          <Card className='card-glow overflow-x-auto p-4 sm:p-6'>
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/5 text-pw-muted font-bold text-[10px] sm:text-xs uppercase tracking-wider">
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
                  {!isReadOnly && <th className="py-3 px-2 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {sortedTeams.map((team, idx) => {
                  const pts = team.won * 3 + team.drawn;
                  const gd = team.gf - team.ga;

                  return (
                    <tr key={team.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors text-xs sm:text-sm">
                      <td className="py-4 px-2 font-bold text-pw-muted">{idx + 1}</td>
                      <td className="py-4 px-2 font-bold text-pw-text">{team.name}</td>
                      <td className="py-4 px-2 text-center font-mono">{team.played}</td>

                      {/* Won controls */}
                      <td className="py-4 px-2 text-center font-mono">
                        {isReadOnly ? (
                          <span>{team.won}</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => updateStat(team.id, "won", -1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">-</button>
                            <span className="min-w-4">{team.won}</span>
                            <button onClick={() => updateStat(team.id, "won", 1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">+</button>
                          </div>
                        )}
                      </td>

                      {/* Drawn controls */}
                      <td className="py-4 px-2 text-center font-mono">
                        {isReadOnly ? (
                          <span>{team.drawn}</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => updateStat(team.id, "drawn", -1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">-</button>
                            <span className="min-w-4">{team.drawn}</span>
                            <button onClick={() => updateStat(team.id, "drawn", 1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">+</button>
                          </div>
                        )}
                      </td>

                      {/* Lost controls */}
                      <td className="py-4 px-2 text-center font-mono">
                        {isReadOnly ? (
                          <span>{team.lost}</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => updateStat(team.id, "lost", -1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">-</button>
                            <span className="min-w-4">{team.lost}</span>
                            <button onClick={() => updateStat(team.id, "lost", 1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">+</button>
                          </div>
                        )}
                      </td>

                      {/* GF controls */}
                      <td className="py-4 px-2 text-center font-mono">
                        {isReadOnly ? (
                          <span>{team.gf}</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => updateStat(team.id, "gf", -1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">-</button>
                            <span className="min-w-4">{team.gf}</span>
                            <button onClick={() => updateStat(team.id, "gf", 1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">+</button>
                          </div>
                        )}
                      </td>

                      {/* GA controls */}
                      <td className="py-4 px-2 text-center font-mono">
                        {isReadOnly ? (
                          <span>{team.ga}</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => updateStat(team.id, "ga", -1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">-</button>
                            <span className="min-w-4">{team.ga}</span>
                            <button onClick={() => updateStat(team.id, "ga", 1)} className="w-5 h-5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold">+</button>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-2 text-center font-mono text-pw-muted">{gd > 0 ? `+${gd}` : gd}</td>
                      <td className="py-4 px-2 text-center font-mono font-bold text-pw-primary">{pts}</td>

                      {!isReadOnly && (
                        <td className="py-4 px-2 text-center">
                          <Button
                            onClick={() => removeTeam(team.id)}
                            variant="ghost"
                            className="h-8 w-8 p-0 text-pw-muted hover:text-pw-danger">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {teams.length === 0 && (
                  <tr>
                    <td colSpan={isReadOnly ? 10 : 11} className="py-12 text-center text-pw-muted">
                      No Competitors registered in standings yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Competitor Registration (Only visible to Admin) */}
        {!isReadOnly && (
          <div className='lg:col-span-4 flex flex-col gap-6'>
            <Card className='card-glow p-6 sm:p-8 space-y-6'>
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
                    className="bg-white/5 border-white/10 h-11"
                  />
                </div>

                <Button
                  onClick={addTeam}
                  className="w-full btn-primary h-11 text-xs font-bold gap-2">
                  <PlusCircle className="h-4 w-4" /> Register Competitor
                </Button>
              </div>
            </Card>

            {/* Quick Stats Summary */}
            <Card className='card-glow p-6 space-y-4'>
              <h4 className="text-xs font-bold uppercase tracking-widest text-pw-muted flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-pw-secondary" /> Standing Rules
              </h4>
              <p className="text-[11px] text-pw-muted leading-relaxed">
                Teams are automatically ranked on point accumulation (3 for a Win, 1 for a Draw, 0 for a Loss). Ties are resolved by Goal Difference (Goals For minus Goals Against), then Goals For.
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
