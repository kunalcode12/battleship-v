"use client";

import { type ReactNode } from "react";
import {
  Timer,
  Play,
  Zap,
  Coins,
  Gift,
  Star,
  Users,
  CheckCircle,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameState as ArenaGameState } from "@/lib/arenaGameService";

interface ArenaStatusPanelProps {
  statusLabel: "pending" | "live" | "completed" | "stopped";
  arenaGameState: ArenaGameState | null;
  arenaCountdown: number | null;
  currentCycle: number | null;
  timeUntilReset: number | null;
  showArenaPanel: boolean;
  arenaLoader: boolean;
  monitorEvents: Array<{ type: string; data: unknown; timestamp: Date }>;
  monitorBoosts: Array<{ amount: number; name: string; at: Date }>;
  lastGameEvent: Record<string, unknown> | null;
  itemDrops: Array<{
    itemName: string;
    purchaserUsername: string;
    effect: string;
    cost: number;
    timestamp: Date;
    image?: string;
  }>;
  onStartArena: () => void;
  onDisconnect: () => void;
}

const monitorIcons: Record<string, ReactNode> = {
  arena_countdown_started: <Timer className="text-blue-400" size={16} />,
  countdown_update: <Timer className="text-sky-400" size={16} />,
  arena_begins: <Play className="text-red-400" size={16} />,
  player_boost_activated: <Zap className="text-green-400" size={16} />,
  boost_cycle_update: <Coins className="text-yellow-400" size={16} />,
  boost_cycle_complete: <Gift className="text-emerald-400" size={16} />,
  package_drop: <Gift className="text-blue-400" size={16} />,
  immediate_item_drop: <Gift className="text-pink-400" size={16} />,
  event_triggered: <Star className="text-indigo-400" size={16} />,
  player_joined: <Users className="text-cyan-400" size={16} />,
  game_completed: <CheckCircle className="text-green-400" size={16} />,
  game_stopped: <Pause className="text-gray-400" size={16} />,
};

function statusBoxClass(statusLabel: string) {
  return statusLabel === "live"
    ? "bg-green-100 border-green-400 text-green-800"
    : statusLabel === "pending"
    ? "bg-yellow-50 border-yellow-400 text-yellow-800"
    : statusLabel === "completed"
    ? "bg-blue-50 border-blue-300 text-blue-800"
    : "bg-gray-100 border-gray-400 text-gray-800";
}

export default function ArenaStatusPanel({
  statusLabel,
  arenaGameState,
  arenaCountdown,
  currentCycle,
  timeUntilReset,
  showArenaPanel,
  arenaLoader,
  monitorEvents,
  monitorBoosts,
  lastGameEvent,
  itemDrops,
  onStartArena,
  onDisconnect,
}: ArenaStatusPanelProps) {
  return (
    <div className="mb-4 w-full">
      <div className={`border rounded p-3 ${statusBoxClass(statusLabel)}`}>
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="font-semibold">
            Arena Status: {statusLabel}
            {arenaGameState?.gameId && (
              <span className="ml-2 text-xs opacity-80">
                Game ID: {arenaGameState.gameId}
              </span>
            )}
          </div>
          <div className="text-sm flex items-center gap-4">
            {arenaCountdown !== null && (
              <span className="inline-flex items-center gap-1">
                <Timer size={14} /> {arenaCountdown}s
              </span>
            )}
            {currentCycle !== null && (
              <span className="inline-flex items-center gap-1">
                <Coins size={14} /> Cycle {currentCycle}
              </span>
            )}
            {timeUntilReset !== null && (
              <span className="inline-flex items-center gap-1">
                <Timer size={14} /> Reset in {timeUntilReset}s
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {!arenaGameState && (
              <Button
                size="sm"
                onClick={onStartArena}
                disabled={arenaLoader}
              >
                {arenaLoader ? "Connecting..." : "Start Arena"}
              </Button>
            )}
            {arenaGameState && (
              <Button
                size="sm"
                className="bg-red-700 hover:bg-red-800 text-white"
                onClick={onDisconnect}
              >
                Disconnect
              </Button>
            )}
          </div>
        </div>

        {showArenaPanel && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded border p-2">
              <div className="text-sm font-semibold mb-1">Latest</div>
              <div className="text-xs space-y-1 max-h-28 overflow-auto">
                {monitorEvents
                  .slice(-8)
                  .reverse()
                  .map((ev, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      {monitorIcons[ev.type] || <Star size={14} />}
                      <span className="truncate">{ev.type}</span>
                    </div>
                  ))}
                {monitorEvents.length === 0 && (
                  <div className="text-gray-500">Waiting for events…</div>
                )}
              </div>
            </div>
            <div className="bg-white rounded border p-2">
              <div className="text-sm font-semibold mb-1">Boosts</div>
              <div className="text-xs text-gray-700 space-y-1 max-h-28 overflow-auto">
                {monitorBoosts.length > 0 ? (
                  monitorBoosts
                    .slice(-8)
                    .reverse()
                    .map((b, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Zap className="text-green-500" size={14} />
                        <span className="truncate">
                          {b.name} boosted {b.amount}
                        </span>
                      </div>
                    ))
                ) : (
                  <span className="text-gray-500">No boosts yet</span>
                )}
              </div>
            </div>
            <div className="bg-white rounded border p-2">
              <div className="text-sm font-semibold mb-1">Item Drops</div>
              <div className="text-xs space-y-2 text-gray-700 max-h-28 overflow-auto">
                {itemDrops.length > 0 ? (
                  itemDrops.slice(0, 5).map((drop, idx) => (
                    <div
                      key={idx}
                      className="border-b border-gray-200 pb-1 last:border-0"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Gift className="text-pink-500" size={14} />
                        <span className="font-semibold">{drop.itemName}</span>
                      </div>
                      <div className="text-gray-600 pl-6">
                        <div>By: {drop.purchaserUsername}</div>
                        <div>Effect: {drop.effect}</div>
                        <div className="flex items-center gap-1">
                          <Coins className="text-yellow-600" size={12} />
                          <span>{drop.cost} pts</span>
                        </div>
                        <div className="text-gray-400 text-xs">
                          {drop.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">No items dropped yet</div>
                )}
              </div>
              {lastGameEvent && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <Star className="text-indigo-500" size={14} />
                    <span className="text-xs">Event triggered</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

