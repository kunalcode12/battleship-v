import { useState, useEffect } from "react";
import { ArenaGameService, GameState } from "@/lib/arenaGameService";
import { Scanlines } from "./scanlines";
import { GlitchText } from "./glitch-text";
import { AnimatedText } from "./animated-text";
import {
  Trophy,
  Zap,
  Gift,
  Timer,
  Users,
  Star,
  Pause,
  Play,
  Coins,
  CheckCircle,
} from "lucide-react";

interface WebSocketEventHandlerProps {
  gameService: ArenaGameService;
  gameState: GameState;
}

const eventIcons: Record<string, any> = {
  arena_countdown_started: <Timer className="text-blue-400" size={22} />, // blue
  countdown_update: <Timer className="text-sky-400" size={22} />, // blue
  arena_begins: <Play className="text-red-400 animate-pulse" size={22} />, // red
  player_boost_activated: (
    <Zap className="text-green-400 animate-pulse" size={22} />
  ), // green
  boost_cycle_update: <Coins className="text-yellow-300" size={22} />, // yellow
  boost_cycle_complete: (
    <Gift className="text-emerald-400 animate-bounce" size={22} />
  ), // emerald
  package_drop: <Gift className="text-blue-400 animate-bounce" size={22} />, // blue
  immediate_item_drop: (
    <Gift className="text-pink-400 animate-pulse" size={22} />
  ),
  event_triggered: <Star className="text-indigo-400 animate-spin" size={22} />, // indigo
  player_joined: <Users className="text-cyan-400" size={22} />, // cyan
  game_completed: (
    <CheckCircle className="text-green-400 animate-pulse" size={22} />
  ), // green
  game_stopped: <Pause className="text-gray-400 animate-pulse" size={22} />,
};

export default function WebSocketEventHandler({
  gameService,
  gameState,
}: WebSocketEventHandlerProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [arenaActive, setArenaActive] = useState(false);
  const [boostData, setBoostData] = useState<any>(null);
  const [packageDrops, setPackageDrops] = useState<any[]>([]);
  const [gameEvents, setGameEvents] = useState<any[]>([]);

  useEffect(() => {
    gameService.onArenaCountdownStarted = (data) => {
      setEvents((prev) => [
        ...prev,
        { type: "arena_countdown_started", data, timestamp: new Date() },
      ]);
    };
    gameService.onCountdownUpdate = (data) => {
      setCountdown(data.secondsRemaining);
      setEvents((prev) => [
        ...prev,
        { type: "countdown_update", data, timestamp: new Date() },
      ]);
    };
    gameService.onArenaBegins = (data) => {
      setArenaActive(true);
      setEvents((prev) => [
        ...prev,
        { type: "arena_begins", data, timestamp: new Date() },
      ]);
    };
    gameService.onPlayerBoostActivated = (data) => {
      setBoostData(data);
      setEvents((prev) => [
        ...prev,
        { type: "player_boost_activated", data, timestamp: new Date() },
      ]);
    };
    gameService.onBoostCycleUpdate = (data) => {
      setEvents((prev) => [
        ...prev,
        { type: "boost_cycle_update", data, timestamp: new Date() },
      ]);
    };
    gameService.onBoostCycleComplete = (data) => {
      setEvents((prev) => [
        ...prev,
        { type: "boost_cycle_complete", data, timestamp: new Date() },
      ]);
    };
    gameService.onPackageDrop = (data) => {
      setPackageDrops((prev) => [...prev, ...data.packages]);
      setEvents((prev) => [
        ...prev,
        { type: "package_drop", data, timestamp: new Date() },
      ]);
    };
    gameService.onImmediateItemDrop = (data) => {
      setEvents((prev) => [
        ...prev,
        { type: "immediate_item_drop", data, timestamp: new Date() },
      ]);
    };
    gameService.onEventTriggered = (data) => {
      setGameEvents((prev) => [...prev, data.event]);
      setEvents((prev) => [
        ...prev,
        { type: "event_triggered", data, timestamp: new Date() },
      ]);
    };
    gameService.onPlayerJoined = (data) => {
      setEvents((prev) => [
        ...prev,
        { type: "player_joined", data, timestamp: new Date() },
      ]);
    };
    gameService.onGameCompleted = (data) => {
      setEvents((prev) => [
        ...prev,
        { type: "game_completed", data, timestamp: new Date() },
      ]);
    };
    gameService.onGameStopped = (data) => {
      setEvents((prev) => [
        ...prev,
        { type: "game_stopped", data, timestamp: new Date() },
      ]);
    };
  }, [gameService]);

  // Custom ticker animation (replace marquee)
  const tickerEvents = events.slice(-5);

  return (
    <div className="arcade-bg relative max-w-6xl mx-auto mt-6 px-2 py-4 rounded-xl border-8 border-yellow-400 neon-glow bg-gray-900 bg-opacity-90 arcade-dashboard overflow-hidden">
      <Scanlines />
      <div className="flex flex-col gap-3 ">
        {/* Top ticker */}
        <div
          className="w-full bg-black bg-opacity-80 border-b-2 border-yellow-400 py-2 px-3 flex items-center text-lg font-pixel tracking-[0.2em] text-yellow-300 animate-pulse gap-2 overflow-x-hidden"
          style={{ position: "relative", height: "2.85em" }}
        >
          <span className="mr-2 text-pink-400">LIVE:</span>
          <div
            style={{
              display: "inline-block",
              whiteSpace: "nowrap",
              animation: "ticker 12s linear infinite",
            }}
          >
            {tickerEvents.map((event, idx) => (
              <span key={idx} className="mx-5">
                {event.type.replace(/_/g, " ").toUpperCase()} ●
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 ">
          {/* Game Status */}
          <div className="rounded-lg neon-card bg-black/70 border-2 border-pink-400 p-4 flex flex-col gap-4">
            <div className="text-xl text-neon-pink font-pixel mb-1">
              <GlitchText text="GAME STATUS" />
            </div>
            <div className="text-gray-100 font-mono">
              <div>
                Game ID:{" "}
                <span className="text-yellow-200">{gameState.gameId}</span>
              </div>
              <div>
                Status: <span className="text-white">{gameState.status}</span>
              </div>
              <div className="flex gap-2 items-center">
                Arena Active:
                <span
                  className={arenaActive ? "text-green-400" : "text-red-400"}
                >
                  {arenaActive ? "Yes" : "No"}
                </span>
                <Zap
                  size={18}
                  className={arenaActive ? "animate-pulse" : "opacity-20"}
                />
              </div>
              {countdown !== null && (
                <div>
                  Countdown:{" "}
                  <span className="text-blue-400 font-bold">{countdown}s</span>
                </div>
              )}
            </div>
          </div>
          {/* Boosts */}
          <div className="rounded-lg neon-card bg-black/80 border-2 border-green-400 p-4 flex flex-col gap-3">
            <div className="text-xl text-green-400 font-pixel">
              <GlitchText text="BOOSTS" />
            </div>
            {boostData ? (
              <div className="text-white font-mono text-base flex flex-col gap-1">
                <div>
                  Player:{" "}
                  <span className="text-yellow-200">
                    {boostData.playerName}
                  </span>
                </div>
                <div>
                  Amount:{" "}
                  <span className="text-green-300 font-bold">
                    +{boostData.boostAmount}
                  </span>
                </div>
                <div>
                  Total Points:{" "}
                  <span className="text-blue-200">
                    {boostData.playerTotalPoints}
                  </span>
                </div>
                <div>
                  Coins Spent:{" "}
                  <span className="text-red-400">
                    -{boostData.arenaCoinsSpent}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-gray-400">No boosts yet</div>
            )}
          </div>
          {/* Drops */}
          <div className="rounded-lg neon-card bg-black/80 border-2 border-blue-400 p-4 flex flex-col gap-2">
            <div className="text-xl text-blue-400 font-pixel">
              <GlitchText text="NEW DROPS" />
            </div>
            {packageDrops.length ? (
              packageDrops.slice(-3).map((pkg, idx) => (
                <div
                  key={idx}
                  className="bg-blue-800/50 rounded p-2 mb-2 border border-blue-200 shadow-lg"
                >
                  <div className="text-yellow-200 font-bold">{pkg.name}</div>
                  <div className="text-pink-200 text-sm">Type: {pkg.type}</div>
                  <div className="text-gray-200 text-xs">Cost: {pkg.cost}</div>
                </div>
              ))
            ) : (
              <div className="text-gray-400">No drops yet</div>
            )}
          </div>
        </div>

        {/* LIVE EVENTS LOG */}
        <div className="mt-5 rounded-xl overflow-hidden border-2 border-yellow-400">
          <div className="bg-black px-4 py-2 border-b border-yellow-400 text-lg font-pixel text-yellow-300 tracking-widest">
            EVENT LOG
          </div>
          <div className="max-h-80 overflow-y-auto live-events-ticker px-1 py-1 bg-black/70 ">
            {events
              .slice(-20)
              .reverse()
              .map((event, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 neon-glow p-3 mb-1 bg-opacity-50 bg-gray-800 rounded border-b border-gray-700 animate-fadeIn"
                >
                  {eventIcons[event.type] || (
                    <Star className="text-pink-200" size={16} />
                  )}
                  <span className="text-pink-400 font-mono text-xs">
                    {event.type.replace(/_/g, " ").toUpperCase()}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <pre className="flex-1 text-xs text-white bg-black/40 rounded px-2 py-1 ml-2 overflow-x-auto">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              ))}
          </div>
        </div>
      </div>
      {/* Flicker animation for CRT effect (optional, could be a div with flicker anim on top) */}
      <div className="absolute inset-0 pointer-events-none z-20">
        <div className="flicker mixed-blend-overlay"></div>
      </div>
      {/* Add the ticker CSS inline for demo */}
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-40%); }
        }
      `}</style>
    </div>
  );
}
