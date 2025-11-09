"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { RefreshCw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import GameBoard from "@/components/game-board";
import ShipDock from "@/components/ship-dock";
import ScoreBoard from "@/components/score-board";
import ItemDropCelebrationPopup, {
  type ItemStat,
} from "@/components/item-drop-celebration-popup";
import ArenaStatusPanel from "@/components/arena-status-panel";
import GameResultPopup from "@/components/game-result-popup";
import BoostToasts from "@/components/boost-toasts";
import GameSettings from "@/components/game-settings";
import type { Ship, Cell, GameState, Difficulty } from "@/lib/types";
import {
  generateEmptyBoard,
  placeShipsRandomly,
  isValidPlacement,
} from "@/lib/game-utils";
import { useSearchParams } from "next/navigation";
import {
  ArenaGameService,
  type GameState as ArenaGameState,
} from "@/lib/arenaGameService";

// Detect touch devices
const isTouchDevice = () => {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
};

// Item types enum
export enum ItemType {
  BOMB = "Bomb",
  SONAR_PING = "Sonar Ping",
  RADAR_PING = "Radar Ping",
  GUIDED_MISSILE = "Guided Missile",
  // Add more item types here as needed
}

// Package item types enum
export enum PackageItemType {
  RAPID_FIRE = "Rapid Fire",
  REPAIR_DRONE = "Repair Drone",
  // Add more package item types here as needed
}

interface BattleshipGameProps {
  authToken?: string;
}

export default function BattleshipGame({ authToken }: BattleshipGameProps) {
  const [gameState, setGameState] = useState<GameState>("setup");
  const [playerBoard, setPlayerBoard] = useState<Cell[][]>(
    generateEmptyBoard()
  );
  const [computerBoard, setComputerBoard] = useState<Cell[][]>(
    generateEmptyBoard()
  );
  const [revealedComputerBoard, setRevealedComputerBoard] = useState<Cell[][]>(
    generateEmptyBoard()
  );
  const [ships, setShips] = useState<Ship[]>([
    {
      id: 1,
      name: "Carrier",
      size: 5,
      placed: false,
      orientation: "horizontal",
      hits: 0,
      sunk: false,
    },
    {
      id: 2,
      name: "Battleship",
      size: 4,
      placed: false,
      orientation: "horizontal",
      hits: 0,
      sunk: false,
    },
    {
      id: 3,
      name: "Cruiser",
      size: 3,
      placed: false,
      orientation: "horizontal",
      hits: 0,
      sunk: false,
    },
    {
      id: 4,
      name: "Submarine",
      size: 3,
      placed: false,
      orientation: "horizontal",
      hits: 0,
      sunk: false,
    },
    {
      id: 5,
      name: "Destroyer",
      size: 2,
      placed: false,
      orientation: "horizontal",
      hits: 0,
      sunk: false,
    },
  ]);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [score, setScore] = useState(0);
  const [markEmptyCells, setMarkEmptyCells] = useState(true);
  const [compactChat, setCompactChat] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [message, setMessage] = useState("Place your ships on the grid.");
  const [gameResult, setGameResult] = useState<"win" | "lose" | null>(null);
  const [playerTurn, setPlayerTurn] = useState(true);
  const [highScores, setHighScores] = useState<
    { difficulty: Difficulty; score: number }[]
  >([]);
  const [showPopup, setShowPopup] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [movesUsed, setMovesUsed] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const params = searchParams.get("wallet");

  // Arena Arcade integration state
  const arenaServiceRef = useRef<ArenaGameService | null>(null);
  const [arenaGameState, setArenaGameState] = useState<ArenaGameState | null>(
    null
  );
  const [statusLabel, setStatusLabel] = useState<
    "pending" | "live" | "completed" | "stopped"
  >("pending");
  const [arenaCountdown, setArenaCountdown] = useState<number | null>(null);
  const [currentCycle, setCurrentCycle] = useState<number | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState<number | null>(null);
  const [showArenaPanel, setShowArenaPanel] = useState(false);
  const [arenaLoader, setArenaLoader] = useState(false);
  const [monitorEvents, setMonitorEvents] = useState<
    { type: string; data: unknown; timestamp: Date }[]
  >([]);
  const [monitorBoosts, setMonitorBoosts] = useState<
    Array<{ amount: number; name: string; at: Date }>
  >([]);
  const [lastGameEvent, setLastGameEvent] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [showBoostPopup, setShowBoostPopup] = useState<{
    amount: number;
    name?: string;
  } | null>(null);
  const [boostToasts, setBoostToasts] = useState<
    Array<{ id: number; amount: number; name: string }>
  >([]);
  const [megaOverlay, setMegaOverlay] = useState(false);
  const [uiPulse, setUiPulse] = useState(false);
  const [gameSessionEndedNotification, setGameSessionEndedNotification] =
    useState(false);
  const [itemDropCelebration, setItemDropCelebration] = useState<{
    itemName: string;
    purchaserUsername: string;
    targetPlayerName?: string;
    effect: string;
    points: number;
    image?: string;
    description?: string;
    stats?: ItemStat[];
    cost?: number;
  } | null>(null);
  const [blastedCells, setBlastedCells] = useState<
    Array<{ row: number; col: number; isHit: boolean; isPlayerBoard?: boolean }>
  >([]);
  const [sonarPingCells, setSonarPingCells] = useState<
    Array<{
      row: number;
      col: number;
      hasShip: boolean;
      isPlayerBoard?: boolean;
    }>
  >([]);
  const [sonarPingCenter, setSonarPingCenter] = useState<{
    row: number;
    col: number;
    isPlayerBoard?: boolean;
  } | null>(null);
  const [radarPingCells, setRadarPingCells] = useState<
    Array<{
      row: number;
      col: number;
      hasShip: boolean;
      isPlayerBoard?: boolean;
    }>
  >([]);
  const [radarPingLine, setRadarPingLine] = useState<{
    type: "row" | "column";
    index: number;
    isPlayerBoard?: boolean;
    shipCount: number;
  } | null>(null);
  const [guidedMissile, setGuidedMissile] = useState<{
    targets: Array<{
      targetRow: number;
      targetCol: number;
      adjacentRow?: number;
      adjacentCol?: number;
      isHit: boolean;
      isAnimating: boolean;
    }>;
    isPlayerBoard?: boolean;
  } | null>(null);
  const [itemDrops, setItemDrops] = useState<
    Array<{
      itemName: string;
      purchaserUsername: string;
      effect: string;
      cost: number;
      timestamp: Date;
      image?: string;
    }>
  >([]);
  const [rapidFireActive, setRapidFireActive] = useState<{
    playerName: string;
    shotsRemaining: number;
    isPlayerBoard: boolean;
  } | null>(null);
  const rapidFireShotsRef = useRef<number>(0); // Track shots remaining synchronously
  const [extraShotConfetti, setExtraShotConfetti] = useState<{
    row: number;
    col: number;
    isPlayerBoard: boolean;
  } | null>(null);
  const [repairDrone, setRepairDrone] = useState<{
    isActive: boolean;
    targetBoard: "player" | "computer";
    shipId: number;
    oldPosition: Array<{ row: number; col: number }>;
    newPosition: Array<{ row: number; col: number }> | null;
  } | null>(null);

  const hitSound = useRef<HTMLAudioElement | null>(null);
  const missSound = useRef<HTMLAudioElement | null>(null);
  const sinkSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);
  const loseSound = useRef<HTMLAudioElement | null>(null);

  // Initialize audio elements and game
  useEffect(() => {
    if (typeof window !== "undefined") {
      hitSound.current = new Audio("/sounds/hit.mp3");
      missSound.current = new Audio("/sounds/miss.mp3");
      sinkSound.current = new Audio("/sounds/sink.mp3");
      winSound.current = new Audio("/sounds/win.mp3");
      loseSound.current = new Audio("/sounds/lose.mp3");
    }

    // Load high scores from localStorage
    const savedScores = localStorage.getItem("battleshipHighScores");
    if (savedScores) {
      setHighScores(JSON.parse(savedScores));
    }
  }, []);

  // Setup Arena service lifecycle
  useEffect(() => {
    arenaServiceRef.current = new ArenaGameService();
    return () => {
      arenaServiceRef.current?.disconnect();
      arenaServiceRef.current = null;
    };
  }, []);

  // Attach Arena socket event handlers
  useEffect(() => {
    const arena = arenaServiceRef.current;
    if (!arena) return;

    arena.onArenaCountdownStarted = (data: unknown) => {
      setStatusLabel("pending");
      setArenaCountdown(60);
      setMonitorEvents((prev) => [
        ...prev,
        { type: "arena_countdown_started", data, timestamp: new Date() },
      ]);
    };

    arena.onCountdownUpdate = (data: unknown) => {
      const d = (data as { secondsRemaining?: number }) || {};
      setArenaCountdown(d.secondsRemaining ?? null);
      setMonitorEvents((prev) => [
        ...prev,
        { type: "countdown_update", data, timestamp: new Date() },
      ]);
    };

    arena.onArenaBegins = (data: unknown) => {
      setStatusLabel("live");
      setMonitorEvents((prev) => [
        ...prev,
        { type: "arena_begins", data, timestamp: new Date() },
      ]);
    };

    arena.onPlayerBoostActivated = (data: unknown) => {
      // track in monitorBoosts instead of a single lastBoost
      setMonitorEvents((prev) => [
        ...prev,
        { type: "player_boost_activated", data, timestamp: new Date() },
      ]);

      const raw = (data as Record<string, unknown>) || {};
      const boostAmount =
        Number(
          (raw["boostAmount"] ?? raw["currentCyclePoints"]) as
            | number
            | string
            | undefined
        ) || 0;
      const boosterName = (raw["boosterUsername"] ??
        raw["playerName"] ??
        "Viewer") as string;

      setShowBoostPopup({ amount: boostAmount, name: boosterName });
      setBoostToasts((prev) => [
        ...prev,
        { id: Date.now(), amount: boostAmount, name: boosterName },
      ]);
      setMonitorBoosts((prev) =>
        [
          ...prev,
          { amount: boostAmount, name: boosterName, at: new Date() },
        ].slice(-20)
      );

      applyBoostEffects(boostAmount);
    };

    arena.onBoostCycleUpdate = (data: unknown) => {
      const d = (data as Record<string, unknown>) || {};
      setCurrentCycle((d["currentCycle"] as number | undefined) ?? null);
      setTimeUntilReset((d["timeUntilReset"] as number | undefined) ?? null);
      setMonitorEvents((prev) => [
        ...prev,
        { type: "boost_cycle_update", data, timestamp: new Date() },
      ]);
    };

    arena.onBoostCycleComplete = (data: unknown) => {
      setMonitorEvents((prev) => [
        ...prev,
        { type: "boost_cycle_complete", data, timestamp: new Date() },
      ]);
    };

    arena.onPackageDrop = (data: unknown) => {
      const dropData = (data as Record<string, unknown>) || {};
      console.log("Package Drop:", dropData);

      // Extract package information
      const playerPackageDrops =
        (dropData["playerPackageDrops"] as Array<Record<string, unknown>>) ||
        [];

      if (playerPackageDrops.length > 0) {
        const packageDrop = playerPackageDrops[0];
        const eligiblePackages =
          (packageDrop["eligiblePackages"] as Array<Record<string, unknown>>) ||
          [];

        if (eligiblePackages.length > 0) {
          const packageInfo = eligiblePackages[0];
          const packageName = (packageInfo["name"] ||
            "Unknown Package") as string;
          const playerName = (packageDrop["playerName"] || "Someone") as string;
          const playerPoints = (packageDrop["playerPoints"] || 0) as number;
          const packageImage = packageInfo["image"] as string | undefined;
          const packageDescription = (packageInfo["type"] || "") as string;
          const stats =
            (packageInfo["stats"] as Array<Record<string, unknown>>) || [];
          const cost = (packageInfo["cost"] || 0) as number;

          // Format stats for display
          const formattedStats = stats.map((stat) => ({
            name: (stat["name"] as string) || "",
            currentValue: (stat["currentValue"] as number) || 0,
            maxValue: (stat["maxValue"] as number) || 100,
            description: (stat["description"] as string) || "",
          }));

          const effect =
            formattedStats.length > 0 ? formattedStats[0].name : "Effect";
          const effectValue =
            formattedStats.length > 0 ? formattedStats[0].currentValue : 0;
          // For Rapid Fire, always use 6 shots
          const rapidFireShots =
            packageName === PackageItemType.RAPID_FIRE ||
            packageName.toLowerCase() === "rapid fire" ||
            packageName.toLowerCase().includes("rapid")
              ? 6
              : effectValue || 1;

          // Show celebration popup for package drop
          setItemDropCelebration({
            itemName: packageName,
            purchaserUsername: playerName,
            targetPlayerName: playerName, // Package is for the player who earned it
            effect: `${effect} (${effectValue})`,
            points: playerPoints,
            image: packageImage,
            description: packageDescription,
            stats: formattedStats,
            cost,
          });

          // Apply package effects based on package name
          console.log("Package dropped:", packageName, "Effect:", effect);

          // Determine target board based on playerName
          // If playerName is "Computer", apply effect on computer's turn (computer gets extra shot)
          // If playerName is "Human", apply effect on player's turn (player gets extra shot)
          const isComputerPackage = playerName?.toLowerCase() === "computer";
          const targetBoard = isComputerPackage ? "computer" : "player";
          console.log(
            "Target board:",
            targetBoard,
            "based on playerName:",
            playerName
          );

          // Check by package/item name
          if (
            packageName === PackageItemType.RAPID_FIRE ||
            packageName.toLowerCase() === "rapid fire" ||
            packageName.toLowerCase().includes("rapid") ||
            effect.toLowerCase().includes("shot") ||
            effect.toLowerCase().includes("immediate")
          ) {
            console.log(
              "Rapid Fire package detected, applying effect for",
              targetBoard
            );
            // Small delay to ensure state is updated
            setTimeout(() => {
              applyRapidFireEffect(targetBoard, rapidFireShots);
            }, 100);
          } else if (
            packageName === PackageItemType.REPAIR_DRONE ||
            packageName.toLowerCase() === "repair drone" ||
            packageName.toLowerCase().includes("repair") ||
            packageName.toLowerCase().includes("drone") ||
            effect.toLowerCase().includes("restore") ||
            effect.toLowerCase().includes("repair") ||
            effect.toLowerCase().includes("heal")
          ) {
            console.log(
              "Repair Drone package detected, applying effect for",
              targetBoard
            );
            // Small delay to ensure state is updated
            setTimeout(() => {
              applyRepairDroneEffect(targetBoard);
            }, 100);
          }
        }
      }

      setMonitorEvents((prev) => [
        ...prev,
        { type: "package_drop", data, timestamp: new Date() },
      ]);
    };

    arena.onImmediateItemDrop = (data: unknown) => {
      const dropData = (data as Record<string, unknown>) || {};

      // Extract item information
      const item = (dropData["item"] as Record<string, unknown>) || {};
      const itemName = (dropData["itemName"] ||
        item["name"] ||
        "Unknown Item") as string;
      const purchaserUsername = (dropData["purchaserUsername"] ||
        "Someone") as string;
      const targetPlayerName = (dropData["targetPlayerName"] ||
        dropData["targetPlayer"]) as string | undefined;
      const cost = (dropData["cost"] || item["price"] || 0) as number;
      const itemImage = (item["image"] || dropData["image"]) as
        | string
        | undefined;
      const itemDescription = (item["description"] || "") as string | undefined;
      const stats = (item["stats"] as Array<Record<string, unknown>>) || [];

      // Format stats for display
      const formattedStats = stats.map((stat) => ({
        name: (stat["name"] as string) || "",
        currentValue: (stat["currentValue"] as number) || 0,
        maxValue: (stat["maxValue"] as number) || 100,
        description: (stat["description"] as string) || "",
      }));

      const effect =
        formattedStats.length > 0 ? formattedStats[0].name : "Effect";
      const effectValue =
        formattedStats.length > 0 ? formattedStats[0].currentValue : 0;

      // Add to item drops history
      const newItemDrop = {
        itemName,
        purchaserUsername,
        effect,
        cost,
        timestamp: new Date(),
        image: itemImage,
      };
      setItemDrops((prev) => [newItemDrop, ...prev].slice(0, 10));

      // Show celebration popup
      setItemDropCelebration({
        itemName,
        purchaserUsername,
        targetPlayerName,
        effect: `${effect} (${effectValue})`,
        points: cost,
        image: itemImage,
        description: itemDescription,
        stats: formattedStats,
        cost,
      });

      // Apply item effects based on item name (using enum)
      console.log("Item dropped:", itemName, "Effect value:", effectValue);
      console.log("Target player name:", targetPlayerName);

      // Determine target board based on targetPlayerName
      // If targetPlayerName is "Computer", apply effect on player board (player gets damaged)
      // If targetPlayerName is "Human", apply effect on computer board (computer gets damaged)
      const isComputerTarget = targetPlayerName?.toLowerCase() === "computer";
      const targetBoard = isComputerTarget ? "player" : "computer";
      console.log(
        "Target board:",
        targetBoard,
        "based on targetPlayerName:",
        targetPlayerName
      );

      // Check by item name first (more reliable)
      if (itemName === ItemType.BOMB || itemName.toLowerCase() === "bomb") {
        console.log(
          "Bomb detected, applying blast effect on",
          targetBoard,
          "board"
        );
        // Small delay to ensure state is updated
        setTimeout(() => {
          applyBlastEffect(effectValue > 0 ? effectValue : 4, targetBoard);
        }, 100);
      } else if (
        itemName === ItemType.SONAR_PING ||
        itemName.toLowerCase() === "sonar ping" ||
        itemName.toLowerCase().includes("sonar")
      ) {
        console.log(
          "Sonar Ping detected, applying sonar ping effect on",
          targetBoard,
          "board"
        );
        // Small delay to ensure state is updated
        setTimeout(() => {
          applySonarPingEffect(targetBoard);
        }, 100);
      } else if (
        itemName === ItemType.RADAR_PING ||
        itemName.toLowerCase() === "radar ping" ||
        itemName.toLowerCase().includes("radar")
      ) {
        console.log(
          "Radar Ping detected, applying radar ping effect on",
          targetBoard,
          "board"
        );
        // Small delay to ensure state is updated
        setTimeout(() => {
          applyRadarPingEffect(targetBoard);
        }, 100);
      } else if (
        effect.toLowerCase().includes("blast") ||
        effect.toLowerCase().includes("bomb")
      ) {
        // Fallback to effect name check
        console.log(
          "Blast effect detected from effect name, applying on",
          targetBoard,
          "board"
        );
        setTimeout(() => {
          applyBlastEffect(effectValue > 0 ? effectValue : 4, targetBoard);
        }, 100);
      } else if (
        itemName === ItemType.GUIDED_MISSILE ||
        effect.toLowerCase().includes("piercer") ||
        effect.toLowerCase().includes("missile") ||
        effect.toLowerCase().includes("guided")
      ) {
        // Fallback to effect name check for guided missile
        console.log(
          "Guided Missile effect detected from effect name, applying on",
          targetBoard,
          "board"
        );
        setTimeout(() => {
          applyGuidedMissileEffect(targetBoard);
        }, 100);
      } else if (
        effect.toLowerCase().includes("recon") ||
        effect.toLowerCase().includes("radar")
      ) {
        // Fallback to effect name check for radar
        console.log(
          "Radar effect detected from effect name, applying on",
          targetBoard,
          "board"
        );
        setTimeout(() => {
          applyRadarPingEffect(targetBoard);
        }, 100);
      } else if (
        effect.toLowerCase().includes("reveal") ||
        effect.toLowerCase().includes("sonar") ||
        effect.toLowerCase().includes("3x3")
      ) {
        // Fallback to effect name check for sonar
        console.log(
          "Sonar effect detected from effect name, applying on",
          targetBoard,
          "board"
        );
        setTimeout(() => {
          applySonarPingEffect(targetBoard);
        }, 100);
      }

      setMonitorEvents((prev) => [
        ...prev,
        { type: "immediate_item_drop", data, timestamp: new Date() },
      ]);
    };

    arena.onEventTriggered = (data: unknown) => {
      const d = (data as Record<string, unknown>) || {};
      const ev = (d["event"] as Record<string, unknown> | undefined) ?? d;
      setLastGameEvent(ev);
      setMonitorEvents((prev) => [
        ...prev,
        { type: "event_triggered", data, timestamp: new Date() },
      ]);
    };

    arena.onGameCompleted = (data: unknown) => {
      setStatusLabel("completed");
      setMonitorEvents((prev) => [
        ...prev,
        { type: "game_completed", data, timestamp: new Date() },
      ]);

      // Show notification and reset arena state to show connect button
      setGameSessionEndedNotification(true);
      setArenaGameState(null);
      setArenaCountdown(null);
      setShowArenaPanel(false);
      setMonitorEvents([]);
      setStatusLabel("pending");
      setCurrentCycle(null);
      setTimeUntilReset(null);
      setMonitorBoosts([]);
      setLastGameEvent(null);
    };

    arena.onGameStopped = (data: unknown) => {
      setStatusLabel("stopped");
      setMonitorEvents((prev) => [
        ...prev,
        { type: "game_stopped", data, timestamp: new Date() },
      ]);

      // Show notification and reset arena state to show connect button
      setGameSessionEndedNotification(true);
      setArenaGameState(null);
      setArenaCountdown(null);
      setShowArenaPanel(false);
      setMonitorEvents([]);
      setStatusLabel("pending");
      setCurrentCycle(null);
      setTimeUntilReset(null);
      setMonitorBoosts([]);
      setLastGameEvent(null);
    };

    return () => {
      if (!arena) return;
      arena.onArenaCountdownStarted = undefined;
      arena.onCountdownUpdate = undefined;
      arena.onArenaBegins = undefined;
      arena.onPlayerBoostActivated = undefined;
      arena.onBoostCycleUpdate = undefined;
      arena.onBoostCycleComplete = undefined;
      arena.onPackageDrop = undefined;
      arena.onImmediateItemDrop = undefined;
      arena.onEventTriggered = undefined;
      arena.onPlayerJoined = undefined;
      arena.onGameCompleted = undefined;
      arena.onGameStopped = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-hide boost banner
  useEffect(() => {
    if (!showBoostPopup) return;
    const t = setTimeout(() => setShowBoostPopup(null), 2000);
    return () => clearTimeout(t);
  }, [showBoostPopup]);

  // Auto-remove stacked boost toasts
  useEffect(() => {
    if (boostToasts.length === 0) return;
    const lastId = boostToasts[boostToasts.length - 1].id;
    const t = setTimeout(() => {
      setBoostToasts((prev) => prev.filter((b) => b.id !== lastId));
    }, 2000);
    return () => clearTimeout(t);
  }, [boostToasts]);

  // Auto-hide game session ended notification
  useEffect(() => {
    if (!gameSessionEndedNotification) return;
    const t = setTimeout(() => setGameSessionEndedNotification(false), 3000);
    return () => clearTimeout(t);
  }, [gameSessionEndedNotification]);

  // Item drop celebration popup close handler
  const closeItemDropCelebration = useCallback(() => {
    setItemDropCelebration(null);
  }, []);

  // Clear blasted cells after animation (handled in applyBlastEffect now)

  // Apply blast effect - randomly reveal cells with real-time animation
  const applyBlastEffect = useCallback(
    (
      cellCount: number = 4,
      targetBoard: "player" | "computer" = "computer"
    ) => {
      console.log(
        "applyBlastEffect called with cellCount:",
        cellCount,
        "targetBoard:",
        targetBoard,
        "gameState:",
        gameState
      );

      // if (gameState !== "playing") {
      //   console.log("Game state is not playing, cannot apply blast effect");
      //   return;
      // }

      // Use current state values directly based on target board
      const isPlayerBoard = targetBoard === "player";
      const currentBoard = isPlayerBoard ? playerBoard : computerBoard;
      const currentRevealed = isPlayerBoard
        ? playerBoard
        : revealedComputerBoard;

      // Get available cells to blast
      const availableCells: Array<{
        r: number;
        c: number;
        hasShip: boolean;
        cell: Cell;
      }> = [];

      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const cell = currentBoard[r][c];
          const rev = currentRevealed[r][c];
          // For player board, check if cell hasn't been hit yet
          // For computer board, check if cell hasn't been revealed yet
          if (isPlayerBoard) {
            if (cell.state === "empty") {
              availableCells.push({ r, c, hasShip: !!cell.shipId, cell });
            }
          } else {
            if (rev.state === "empty") {
              availableCells.push({ r, c, hasShip: !!cell.shipId, cell });
            }
          }
        }
      }

      console.log("Available cells to blast:", availableCells.length);

      if (availableCells.length === 0) {
        console.log("No available cells to blast");
        return;
      }

      // Shuffle and pick random cells
      const shuffled = [...availableCells].sort(() => Math.random() - 0.5);
      const cellsToBlast = shuffled.slice(
        0,
        Math.min(cellCount, availableCells.length)
      );

      console.log("Cells to blast:", cellsToBlast.length, cellsToBlast);

      // Pre-calculate which cells are hits (before animation)
      const hitsData: Array<{
        r: number;
        c: number;
        shipId: number | undefined;
      }> = cellsToBlast
        .filter((cell) => cell.hasShip && cell.cell.shipId)
        .map((cell) => ({
          r: cell.r,
          c: cell.c,
          shipId: cell.cell.shipId,
        }));

      console.log("Hits data:", hitsData);

      // Clear any existing blasted cells first
      setBlastedCells([]);

      // Reveal cells one by one with animation delay for real-time effect
      cellsToBlast.forEach((cell, index) => {
        setTimeout(() => {
          const isHit = cell.hasShip;
          console.log(
            `Blasting cell [${cell.r}, ${cell.c}] on ${targetBoard} board, isHit: ${isHit}`
          );

          if (isPlayerBoard) {
            // Update player board
            setPlayerBoard((prevBoard) => {
              const board = prevBoard.map((row) => row.slice());
              const cellData = currentBoard[cell.r][cell.c];
              board[cell.r][cell.c] = {
                ...cellData,
                state: isHit ? "hit" : "miss",
              };
              return board;
            });
          } else {
            // Update revealed computer board
            setRevealedComputerBoard((prevRev) => {
              const board = prevRev.map((row) => row.slice());
              const cellData = currentBoard[cell.r][cell.c];
              board[cell.r][cell.c] = {
                ...cellData,
                state: isHit ? "hit" : "miss",
              };
              return board;
            });
          }

          // Add to blasted cells for visual effect (ring animation)
          setBlastedCells((prev) => {
            const newBlasted = [
              ...prev,
              { row: cell.r, col: cell.c, isHit, isPlayerBoard },
            ];
            console.log("Blasted cells:", newBlasted);
            return newBlasted;
          });

          // Play sound for this cell
          if (isHit) {
            if (hitSound.current) {
              hitSound.current.currentTime = 0;
              hitSound.current.play().catch(() => {});
            }
          } else {
            if (missSound.current) {
              missSound.current.currentTime = 0;
              missSound.current.play().catch(() => {});
            }
          }

          // After all cells are revealed, update ships
          if (index === cellsToBlast.length - 1) {
            setTimeout(() => {
              console.log(
                "All cells blasted, updating ships on",
                targetBoard,
                "board"
              );

              // Update ships with all hits
              if (hitsData.length > 0) {
                setShips((prevShips) => {
                  const newShips = [...prevShips];
                  for (const hit of hitsData) {
                    if (!hit.shipId) continue;
                    const idx = newShips.findIndex((s) => s.id === hit.shipId);
                    if (idx !== -1) {
                      const updatedHits = newShips[idx].hits + 1;
                      newShips[idx] = { ...newShips[idx], hits: updatedHits };
                      if (updatedHits >= newShips[idx].size) {
                        newShips[idx] = { ...newShips[idx], sunk: true };
                        if (sinkSound.current) {
                          sinkSound.current.currentTime = 0;
                          sinkSound.current.play().catch(() => {});
                        }

                        // Only update score if hitting computer ships
                        if (!isPlayerBoard) {
                          const difficultyMultiplier =
                            difficulty === "easy"
                              ? 1
                              : difficulty === "medium"
                              ? 2
                              : 3;
                          setScore(
                            (prev) =>
                              prev +
                              newShips[idx].size * 10 * difficultyMultiplier
                          );
                        }
                      }
                    }
                  }

                  // Check game over conditions
                  if (isPlayerBoard) {
                    // If player ships are all sunk, player loses
                    const allPlayerShipsSunk = newShips
                      .filter((ship) => ship.id <= 5)
                      .every((ship) => ship.sunk);
                    if (allPlayerShipsSunk) {
                      setTimeout(() => {
                        setGameState("gameover");
                        setGameResult("lose");
                      }, 100);
                    }
                  } else {
                    // If computer ships are all sunk, player wins
                    const allShipsSunk = newShips
                      .filter((ship) => ship.id <= 5)
                      .every((ship) => ship.sunk);
                    if (allShipsSunk) {
                      setTimeout(() => {
                        setGameState("gameover");
                        setGameResult("win");
                      }, 100);
                    }
                  }
                  return newShips;
                });
              }

              const boardName = isPlayerBoard ? "your" : "enemy";
              setMessage(
                `Blast effect activated on ${boardName} board! ${
                  hitsData.length
                } hit(s), ${cellsToBlast.length - hitsData.length} miss(es)`
              );

              // Clear blasted cells visual effect after animation
              setTimeout(() => {
                setBlastedCells([]);
              }, 1500);
            }, 300);
          }
        }, index * 250); // 250ms delay between each cell reveal for real-time effect
      });
    },
    [gameState, revealedComputerBoard, computerBoard, playerBoard, difficulty]
  );

  // Apply sonar ping effect - reveals 3x3 region showing ship locations without hitting
  const applySonarPingEffect = useCallback(
    (targetBoard: "player" | "computer" = "computer") => {
      console.log(
        "applySonarPingEffect called, gameState:",
        gameState,
        "targetBoard:",
        targetBoard
      );

      const isPlayerBoard = targetBoard === "player";
      const currentBoard = isPlayerBoard ? playerBoard : computerBoard;
      const currentRevealed = isPlayerBoard
        ? playerBoard
        : revealedComputerBoard;

      // Find available 3x3 regions (regions that haven't been fully revealed)
      const availableRegions: Array<{
        centerRow: number;
        centerCol: number;
        cells: Array<{ r: number; c: number; hasShip: boolean }>;
      }> = [];

      // Try to find a 3x3 region with at least one unrevealed cell
      for (let centerRow = 1; centerRow < 9; centerRow++) {
        for (let centerCol = 1; centerCol < 9; centerCol++) {
          const cells: Array<{ r: number; c: number; hasShip: boolean }> = [];
          let hasUnrevealed = false;

          // Check 3x3 region around center
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const r = centerRow + dr;
              const c = centerCol + dc;
              const cell = currentBoard[r][c];
              const rev = currentRevealed[r][c];

              // For player board, check if cell hasn't been hit
              // For computer board, check if cell hasn't been revealed
              if (isPlayerBoard) {
                if (cell.state === "empty") {
                  hasUnrevealed = true;
                }
              } else {
                if (rev.state === "empty") {
                  hasUnrevealed = true;
                }
              }
              cells.push({ r, c, hasShip: !!cell.shipId });
            }
          }

          if (hasUnrevealed) {
            availableRegions.push({ centerRow, centerCol, cells });
          }
        }
      }

      if (availableRegions.length === 0) {
        console.log("No available regions for sonar ping");
        return;
      }

      // Pick a random region
      const selectedRegion =
        availableRegions[Math.floor(Math.random() * availableRegions.length)];

      console.log("Sonar ping region selected:", selectedRegion);

      // Set the center for sonar ring animation
      setSonarPingCenter({
        row: selectedRegion.centerRow,
        col: selectedRegion.centerCol,
        isPlayerBoard,
      });

      // Set cells for sonar ping visualization (show which have ships)
      setSonarPingCells(
        selectedRegion.cells.map((cell) => ({
          row: cell.r,
          col: cell.c,
          hasShip: cell.hasShip,
          isPlayerBoard,
        }))
      );

      // Show message
      const shipCount = selectedRegion.cells.filter((c) => c.hasShip).length;
      const boardName = isPlayerBoard ? "your" : "enemy";
      setMessage(
        `Sonar Ping activated on ${boardName} board! Revealed 3x3 region - ${shipCount} cell(s) contain ships.`
      );

      // Clear sonar ping center after ring animation (2 seconds)
      setTimeout(() => {
        setSonarPingCenter(null);
      }, 2000);

      // Clear sonar ping cells after 5 seconds (pulsing border for 5 seconds total)
      setTimeout(() => {
        setSonarPingCells([]);
      }, 5000);
    },
    [gameState, revealedComputerBoard, computerBoard, playerBoard]
  );

  // Apply radar ping effect - reveals ship presence along a row or column
  const applyRadarPingEffect = useCallback(
    (targetBoard: "player" | "computer" = "computer") => {
      console.log(
        "applyRadarPingEffect called, gameState:",
        gameState,
        "targetBoard:",
        targetBoard
      );

      const isPlayerBoard = targetBoard === "player";
      const currentBoard = isPlayerBoard ? playerBoard : computerBoard;
      const currentRevealed = isPlayerBoard
        ? playerBoard
        : revealedComputerBoard;

      // Randomly choose row or column
      const isRow = Math.random() > 0.5;
      const lineIndex = Math.floor(Math.random() * 10);

      console.log(
        `Radar ping scanning ${isRow ? "row" : "column"} ${lineIndex}`
      );

      // Collect cells along the row or column
      const cells: Array<{
        row: number;
        col: number;
        hasShip: boolean;
      }> = [];
      let shipCount = 0;

      for (let i = 0; i < 10; i++) {
        const row = isRow ? lineIndex : i;
        const col = isRow ? i : lineIndex;
        const cell = currentBoard[row][col];
        const rev = currentRevealed[row][col];

        // Check if cell has ship and hasn't been revealed/hit yet
        const hasShip = !!cell.shipId;
        const isRevealed = isPlayerBoard
          ? cell.state !== "empty"
          : rev.state !== "empty";

        if (hasShip) {
          shipCount++;
        }

        // Only show radar ping on cells that haven't been revealed
        if (!isRevealed) {
          cells.push({
            row,
            col,
            hasShip,
          });
        }
      }

      console.log(
        `Radar ping found ${shipCount} ship cell(s) in ${
          isRow ? "row" : "column"
        } ${lineIndex}`
      );

      // Set radar ping line info
      setRadarPingLine({
        type: isRow ? "row" : "column",
        index: lineIndex,
        isPlayerBoard,
        shipCount,
      });

      // Set cells for radar ping visualization
      setRadarPingCells(
        cells.map((cell) => ({
          ...cell,
          isPlayerBoard,
        }))
      );

      // Show message with ship count
      const boardName = isPlayerBoard ? "your" : "enemy";
      const lineName = isRow ? "row" : "column";
      setMessage(
        `Radar Ping activated on ${boardName} board! Scanning ${lineName} ${
          lineIndex + 1
        } - ${shipCount} ship cell(s) detected!`
      );

      // Play ping sound (using miss sound as ping)
      if (missSound.current) {
        missSound.current.currentTime = 0;
        missSound.current.play().catch(() => {});
      }

      // Clear radar ping line after 3 seconds
      setTimeout(() => {
        setRadarPingLine(null);
      }, 3000);

      // Clear radar ping cells after 5 seconds (pulsing border for 5 seconds total)
      setTimeout(() => {
        setRadarPingCells([]);
      }, 5000);
    },
    [gameState, revealedComputerBoard, computerBoard, playerBoard]
  );

  // Apply guided missile effect - 4 high accuracy shots with adjacent reveal on hits
  const applyGuidedMissileEffect = useCallback(
    (targetBoard: "player" | "computer" = "computer") => {
      console.log(
        "applyGuidedMissileEffect called, gameState:",
        gameState,
        "targetBoard:",
        targetBoard
      );

      const isPlayerBoard = targetBoard === "player";
      const currentBoard = isPlayerBoard ? playerBoard : computerBoard;
      const currentRevealed = isPlayerBoard
        ? playerBoard
        : revealedComputerBoard;

      // Find available cells - prefer ship cells for higher accuracy
      const availableCells: Array<{
        r: number;
        c: number;
        hasShip: boolean;
      }> = [];

      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const cell = currentBoard[r][c];
          const rev = currentRevealed[r][c];

          // Check if cell hasn't been revealed/hit yet
          const isRevealed = isPlayerBoard
            ? cell.state !== "empty"
            : rev.state !== "empty";

          if (!isRevealed) {
            availableCells.push({
              r,
              c,
              hasShip: !!cell.shipId,
            });
          }
        }
      }

      if (availableCells.length === 0) {
        console.log("No available cells for guided missile");
        return;
      }

      // Select 4 target cells - prefer ship cells for higher accuracy
      const shipCells = availableCells.filter((cell) => cell.hasShip);
      const shuffled = [...availableCells].sort(() => Math.random() - 0.5);

      // Mix ship cells and random cells (70% preference for ships)
      const targets: Array<{ r: number; c: number; hasShip: boolean }> = [];
      const usedIndices = new Set<number>();

      // First, try to get ship cells
      const shipCellsShuffled = [...shipCells].sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(3, shipCellsShuffled.length); i++) {
        const cell = shipCellsShuffled[i];
        const index = availableCells.findIndex(
          (c) => c.r === cell.r && c.c === cell.c
        );
        if (index !== -1) {
          targets.push(cell);
          usedIndices.add(index);
        }
      }

      // Fill remaining slots with random cells
      for (let i = 0; targets.length < 4 && i < shuffled.length; i++) {
        const cell = shuffled[i];
        const index = availableCells.findIndex(
          (c) => c.r === cell.r && c.c === cell.c
        );
        if (index !== -1 && !usedIndices.has(index)) {
          targets.push(cell);
          usedIndices.add(index);
        }
      }

      const cellsToTarget = targets.slice(
        0,
        Math.min(4, availableCells.length)
      );
      console.log(
        `Guided Missile targeting ${cellsToTarget.length} cells:`,
        cellsToTarget
      );

      // Initialize missile targets with animation state
      const missileTargets = cellsToTarget.map((cell) => ({
        targetRow: cell.r,
        targetCol: cell.c,
        isHit: cell.hasShip,
        isAnimating: true,
      }));

      // Set missile animation state
      setGuidedMissile({
        targets: missileTargets,
        isPlayerBoard,
      });

      // Process each missile with staggered timing for visual effect
      cellsToTarget.forEach((targetCell, index) => {
        const delay = index * 200; // 200ms delay between each missile

        // After missile trail animation (800ms + delay), reveal the target cell
        setTimeout(() => {
          const isHit = targetCell.hasShip;

          // Update board
          if (isPlayerBoard) {
            setPlayerBoard((prevBoard) => {
              const board = prevBoard.map((row) => row.slice());
              const cellData = currentBoard[targetCell.r][targetCell.c];
              board[targetCell.r][targetCell.c] = {
                ...cellData,
                state: isHit ? "hit" : "miss",
              };
              return board;
            });
          } else {
            setRevealedComputerBoard((prevRev) => {
              const board = prevRev.map((row) => row.slice());
              const cellData = currentBoard[targetCell.r][targetCell.c];
              board[targetCell.r][targetCell.c] = {
                ...cellData,
                state: isHit ? "hit" : "miss",
              };
              return board;
            });
          }

          // Play sound
          if (isHit) {
            if (hitSound.current) {
              hitSound.current.currentTime = 0;
              hitSound.current.play().catch(() => {});
            }
          } else {
            if (missSound.current) {
              missSound.current.currentTime = 0;
              missSound.current.play().catch(() => {});
            }
          }

          // Update animation state for this target
          setGuidedMissile((prev) =>
            prev
              ? {
                  ...prev,
                  targets: prev.targets.map((t, i) =>
                    i === index ? { ...t, isAnimating: false } : t
                  ),
                }
              : null
          );

          // If hit, reveal an adjacent cell (critical effect)
          if (isHit) {
            const directions = [
              { r: -1, c: 0 }, // up
              { r: 1, c: 0 }, // down
              { r: 0, c: -1 }, // left
              { r: 0, c: 1 }, // right
            ];

            // Shuffle directions for randomness
            directions.sort(() => Math.random() - 0.5);

            for (const dir of directions) {
              const adjR = targetCell.r + dir.r;
              const adjC = targetCell.c + dir.c;

              // Check if adjacent cell is valid and not revealed
              if (adjR >= 0 && adjR < 10 && adjC >= 0 && adjC < 10) {
                const adjCell = currentBoard[adjR][adjC];
                const adjRev = currentRevealed[adjR][adjC];

                const isAdjRevealed = isPlayerBoard
                  ? adjCell.state !== "empty"
                  : adjRev.state !== "empty";

                if (!isAdjRevealed) {
                  // Reveal adjacent cell after a short delay (flash effect)
                  setTimeout(() => {
                    if (isPlayerBoard) {
                      setPlayerBoard((prevBoard) => {
                        const board = prevBoard.map((row) => row.slice());
                        const adjCellData = currentBoard[adjR][adjC];
                        board[adjR][adjC] = {
                          ...adjCellData,
                          state: adjCellData.shipId ? "hit" : "miss",
                        };
                        return board;
                      });
                    } else {
                      setRevealedComputerBoard((prevRev) => {
                        const board = prevRev.map((row) => row.slice());
                        const adjCellData = currentBoard[adjR][adjC];
                        board[adjR][adjC] = {
                          ...adjCellData,
                          state: adjCellData.shipId ? "hit" : "miss",
                        };
                        return board;
                      });
                    }

                    // Update missile state with adjacent cell for flash effect
                    setGuidedMissile((prev) =>
                      prev
                        ? {
                            ...prev,
                            targets: prev.targets.map((t, i) =>
                              i === index
                                ? {
                                    ...t,
                                    adjacentRow: adjR,
                                    adjacentCol: adjC,
                                  }
                                : t
                            ),
                          }
                        : null
                    );

                    // Play sound for adjacent cell
                    const adjCellData = currentBoard[adjR][adjC];
                    if (adjCellData.shipId) {
                      if (hitSound.current) {
                        hitSound.current.currentTime = 0;
                        hitSound.current.play().catch(() => {});
                      }
                    } else {
                      if (missSound.current) {
                        missSound.current.currentTime = 0;
                        missSound.current.play().catch(() => {});
                      }
                    }

                    // Clear flash effect after 500ms
                    setTimeout(() => {
                      setGuidedMissile((prev) =>
                        prev
                          ? {
                              ...prev,
                              targets: prev.targets.map((t, i) =>
                                i === index
                                  ? {
                                      ...t,
                                      adjacentRow: undefined,
                                      adjacentCol: undefined,
                                    }
                                  : t
                              ),
                            }
                          : null
                      );
                    }, 500);
                  }, 300);

                  break; // Only reveal one adjacent cell per hit
                }
              }
            }
          }
        }, 800 + delay); // Missile trail animation duration + staggered delay
      });

      // Update ships and check game over after all missiles have hit
      setTimeout(() => {
        setShips((prevShips) => {
          const newShips = [...prevShips];
          const hitsData: Array<{
            r: number;
            c: number;
            shipId: number | undefined;
          }> = [];
          const adjacentHitsData: Array<{
            r: number;
            c: number;
            shipId: number | undefined;
          }> = [];

          // Collect all hits
          cellsToTarget.forEach((targetCell) => {
            if (targetCell.hasShip) {
              const shipId = currentBoard[targetCell.r][targetCell.c].shipId;
              hitsData.push({ r: targetCell.r, c: targetCell.c, shipId });

              // Check for adjacent cell hits
              const directions = [
                { r: -1, c: 0 },
                { r: 1, c: 0 },
                { r: 0, c: -1 },
                { r: 0, c: 1 },
              ];
              for (const dir of directions) {
                const adjR = targetCell.r + dir.r;
                const adjC = targetCell.c + dir.c;
                if (adjR >= 0 && adjR < 10 && adjC >= 0 && adjC < 10) {
                  const adjCell = currentBoard[adjR][adjC];
                  // Check if this adjacent cell will be revealed by checking if it's adjacent to any hit target
                  if (adjCell.shipId) {
                    const alreadyAdded = adjacentHitsData.some(
                      (h) => h.r === adjR && h.c === adjC
                    );
                    if (!alreadyAdded) {
                      // Check if this adjacent cell will be revealed by checking if it's in the missile targets' adjacent cells
                      const willBeRevealed = cellsToTarget.some((tc) => {
                        if (!tc.hasShip) return false;
                        const dirs = [
                          { r: -1, c: 0 },
                          { r: 1, c: 0 },
                          { r: 0, c: -1 },
                          { r: 0, c: 1 },
                        ];
                        return dirs.some(
                          (dir) =>
                            tc.r + dir.r === adjR && tc.c + dir.c === adjC
                        );
                      });
                      if (willBeRevealed) {
                        adjacentHitsData.push({
                          r: adjR,
                          c: adjC,
                          shipId: adjCell.shipId,
                        });
                      }
                    }
                  }
                }
              }
            }
          });

          // Update ships with target hits
          for (const hit of hitsData) {
            if (!hit.shipId) continue;
            const hitShipIndex = newShips.findIndex(
              (ship) => ship.id === hit.shipId
            );
            if (hitShipIndex !== -1) {
              const updatedHits = newShips[hitShipIndex].hits + 1;
              newShips[hitShipIndex] = {
                ...newShips[hitShipIndex],
                hits: updatedHits,
              };
              if (updatedHits >= newShips[hitShipIndex].size) {
                newShips[hitShipIndex] = {
                  ...newShips[hitShipIndex],
                  sunk: true,
                };
                if (sinkSound.current) {
                  sinkSound.current.currentTime = 0;
                  sinkSound.current.play().catch(() => {});
                }

                // Only update score if hitting computer ships
                if (!isPlayerBoard) {
                  const difficultyMultiplier =
                    difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
                  setScore(
                    (prev) =>
                      prev +
                      newShips[hitShipIndex].size * 10 * difficultyMultiplier
                  );
                }
              }
            }
          }

          // Update ships with adjacent hits
          for (const adjHit of adjacentHitsData) {
            if (!adjHit.shipId) continue;
            const adjHitShipIndex = newShips.findIndex(
              (ship) => ship.id === adjHit.shipId
            );
            if (adjHitShipIndex !== -1) {
              const adjUpdatedHits = newShips[adjHitShipIndex].hits + 1;
              newShips[adjHitShipIndex] = {
                ...newShips[adjHitShipIndex],
                hits: adjUpdatedHits,
              };
              if (adjUpdatedHits >= newShips[adjHitShipIndex].size) {
                newShips[adjHitShipIndex] = {
                  ...newShips[adjHitShipIndex],
                  sunk: true,
                };
                if (sinkSound.current) {
                  sinkSound.current.currentTime = 0;
                  sinkSound.current.play().catch(() => {});
                }

                // Only update score if hitting computer ships
                if (!isPlayerBoard) {
                  const difficultyMultiplier =
                    difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
                  setScore(
                    (prev) =>
                      prev +
                      newShips[adjHitShipIndex].size * 10 * difficultyMultiplier
                  );
                }
              }
            }
          }

          // Check game over conditions
          if (isPlayerBoard) {
            const allPlayerShipsSunk = newShips
              .filter((ship) => ship.id <= 5)
              .every((ship) => ship.sunk);
            if (allPlayerShipsSunk) {
              setTimeout(() => {
                setGameState("gameover");
                setGameResult("lose");
              }, 100);
            }
          } else {
            const allShipsSunk = newShips
              .filter((ship) => ship.id <= 5)
              .every((ship) => ship.sunk);
            if (allShipsSunk) {
              setTimeout(() => {
                setGameState("gameover");
                setGameResult("win");
              }, 100);
            }
          }

          return newShips;
        });

        const hitCount = cellsToTarget.filter((c) => c.hasShip).length;
        const boardName = isPlayerBoard ? "your" : "enemy";
        setMessage(
          `Guided Missile salvo! ${hitCount} hit(s) on ${boardName} board!${
            hitCount > 0 ? " Critical strikes revealed adjacent cells!" : ""
          }`
        );

        // Clear missile state completely after all effects
        setTimeout(() => {
          setGuidedMissile(null);
        }, 1500);
      }, 800 + (cellsToTarget.length - 1) * 200 + 600); // Wait for all missiles + adjacent reveals
    },
    [gameState, revealedComputerBoard, computerBoard, playerBoard, difficulty]
  );

  // Apply repair drone effect - restores 1 hit point to a damaged ship and moves it
  const applyRepairDroneEffect = useCallback(
    (targetBoard: "player" | "computer") => {
      console.log(
        "applyRepairDroneEffect called, gameState:",
        gameState,
        "targetBoard:",
        targetBoard
      );

      // Only work if game is playing and not ended
      // if (gameState !== "playing" || gameResult !== null) {
      //   console.log(
      //     "Game is not in playing state or already ended, cannot apply repair drone"
      //   );
      //   return;
      // }

      const isPlayerBoard = targetBoard === "player";

      // Read current board states directly (may be slightly stale, but we count hits from board cells which is accurate)
      const currentBoard = isPlayerBoard ? playerBoard : computerBoard;
      const currentRevealedBoard = isPlayerBoard
        ? playerBoard
        : revealedComputerBoard;

      // Get ship IDs that are actually on the target board
      const shipIdsOnBoard = new Set<number>();
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const cell = currentBoard[r][c];
          if (cell.shipId) {
            shipIdsOnBoard.add(cell.shipId);
          }
        }
      }

      console.log("Ship IDs on target board:", Array.from(shipIdsOnBoard));
      console.log(
        "All ships state:",
        ships.map((s) => ({
          id: s.id,
          name: s.name,
          hits: s.hits,
          sunk: s.sunk,
        }))
      );

      // Filter ships that are on the target board and check their hit status from the board
      const damagedShips: Array<{
        ship: Ship;
        hitCells: Array<{ row: number; col: number }>;
        hitCount: number;
      }> = [];

      // Check each ship on the board by counting hits from the actual board cells
      shipIdsOnBoard.forEach((shipId) => {
        const ship = ships.find((s) => s.id === shipId);
        if (!ship) {
          console.log(`Ship ${shipId} not found in ships array`);
          return;
        }

        // Count hits on this ship by checking the actual board cells
        const hitCells: Array<{ row: number; col: number }> = [];

        for (let r = 0; r < 10; r++) {
          for (let c = 0; c < 10; c++) {
            const cell = currentBoard[r][c];
            if (cell.shipId === shipId) {
              // For player board, check if cell state is "hit" on playerBoard
              // For computer board, check if cell state is "hit" on revealedComputerBoard
              if (isPlayerBoard) {
                // Player board: check if cell state is "hit"
                if (cell.state === "hit") {
                  hitCells.push({ row: r, col: c });
                }
              } else {
                // Computer board: check revealedComputerBoard for hits
                const revealedCell = currentRevealedBoard[r][c];
                if (revealedCell.state === "hit") {
                  hitCells.push({ row: r, col: c });
                }
              }
            }
          }
        }

        const hitCount = hitCells.length;
        console.log(
          `Ship ${shipId} (${ship.name}): ${hitCount} hits (from board) out of ${ship.size} cells, sunk from state: ${ship.sunk}, hits from state: ${ship.hits}`
        );

        // A ship is damaged if it has hits > 0 but hits < size (not sunk)
        // Check if sunk by verifying if all cells are hit
        const allCellsHit = hitCount >= ship.size;
        const isSunk = allCellsHit || ship.sunk;

        if (hitCount > 0 && hitCount < ship.size && !isSunk) {
          damagedShips.push({ ship, hitCells, hitCount });
          console.log(
            `✓ Found damaged ship: ${ship.name} with ${hitCount} hits (counted from board cells)`
          );
        }
      });

      console.log("Total damaged ships found:", damagedShips.length);

      if (damagedShips.length === 0) {
        console.log("No damaged ships found to repair");
        setMessage(
          `Repair Drone activated on ${
            isPlayerBoard ? "your" : "enemy"
          } board! No damaged ships to repair.`
        );
        return;
      }

      // Pick a random damaged ship to repair
      const shipToRepairData =
        damagedShips[Math.floor(Math.random() * damagedShips.length)];
      const shipToRepair = shipToRepairData.ship;
      const actualHitCount = shipToRepairData.hitCount;

      console.log(
        "Repairing ship:",
        shipToRepair.name,
        "Hit cells from board:",
        actualHitCount,
        "Ship size:",
        shipToRepair.size
      );

      // Find all cells occupied by this ship
      const oldShipCells: Array<{ row: number; col: number }> = [];
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          if (currentBoard[r][c].shipId === shipToRepair.id) {
            oldShipCells.push({ row: r, col: c });
          }
        }
      }

      if (oldShipCells.length === 0) {
        console.log("Could not find ship cells on board");
        return;
      }

      // Determine current orientation based on ship cells
      const firstCell = oldShipCells[0];
      const secondCell = oldShipCells[1];
      const isHorizontal = firstCell.row === secondCell.row;
      const currentOrientation = isHorizontal ? "horizontal" : "vertical";

      // Remove the ship from the board temporarily
      const boardWithoutShip = currentBoard.map((row) =>
        row.map((cell) => {
          if (cell.shipId === shipToRepair.id) {
            return { state: "empty" as const };
          }
          return { ...cell };
        })
      );

      // Find a new valid position for the ship
      let newPosition: Array<{ row: number; col: number }> | null = null;
      let newRow = -1;
      let newCol = -1;
      let newOrientation: "horizontal" | "vertical" = currentOrientation;
      let attempts = 0;
      const maxAttempts = 200;

      // Try to find a valid new position (try both orientations)
      const orientationsToTry: Array<"horizontal" | "vertical"> = [
        currentOrientation,
        currentOrientation === "horizontal" ? "vertical" : "horizontal",
      ];

      while (attempts < maxAttempts && !newPosition) {
        attempts++;

        // Try different orientations
        const tryOrientation = orientationsToTry[attempts % 2];

        // Random position
        newRow = Math.floor(Math.random() * 10);
        newCol = Math.floor(Math.random() * 10);

        // Check if placement is valid
        if (
          isValidPlacement(
            boardWithoutShip,
            newRow,
            newCol,
            shipToRepair.size,
            tryOrientation
          )
        ) {
          newOrientation = tryOrientation;
          newPosition = [];
          for (let i = 0; i < shipToRepair.size; i++) {
            const r = tryOrientation === "horizontal" ? newRow : newRow + i;
            const c = tryOrientation === "horizontal" ? newCol + i : newCol;
            if (r >= 0 && r < 10 && c >= 0 && c < 10) {
              newPosition.push({ row: r, col: c });
            }
          }
          break;
        }
      }

      if (!newPosition || newPosition.length !== shipToRepair.size) {
        console.log("Could not find a valid new position for the ship");
        setMessage(
          `Repair Drone activated on ${
            isPlayerBoard ? "your" : "enemy"
          } board! Could not find a valid position to relocate ship.`
        );
        return;
      }

      // Start repair drone animation
      setRepairDrone({
        isActive: true,
        targetBoard,
        shipId: shipToRepair.id,
        oldPosition: oldShipCells,
        newPosition: null, // Will be set after animation
      });

      // Store values for the setTimeout callback
      const repairShipId = shipToRepair.id;
      const repairShipName = shipToRepair.name;
      const repairHitCount = actualHitCount;
      const repairNewPosition = newPosition;
      const repairNewOrientation = newOrientation;
      const repairIsPlayerBoard = isPlayerBoard;

      // After animation delay (1.5 seconds for drone to fly), move and repair the ship
      setTimeout(() => {
        setRepairDrone((prev) =>
          prev
            ? {
                ...prev,
                newPosition: repairNewPosition,
              }
            : null
        );

        // Update the board with the ship in its new position
        if (repairIsPlayerBoard) {
          setPlayerBoard((prevBoard) => {
            const newBoard = prevBoard.map((row) =>
              row.map((cell) => {
                // Remove old ship cells (but keep hit/miss states if they exist)
                if (cell.shipId === repairShipId) {
                  // If it was a hit, convert it to a miss (healed) - remove the hit marker
                  if (cell.state === "hit") {
                    return { state: "miss" as const };
                  }
                  return { state: "empty" as const };
                }
                return { ...cell };
              })
            );

            // Place ship in new position (only on empty cells)
            repairNewPosition.forEach(({ row, col }) => {
              // Only place on empty cells, don't overwrite hits/misses
              if (newBoard[row][col].state === "empty") {
                newBoard[row][col] = {
                  state: "empty" as const,
                  shipId: repairShipId,
                };
              }
            });

            return newBoard;
          });
        } else {
          setComputerBoard((prevBoard) => {
            const newBoard = prevBoard.map((row) =>
              row.map((cell) => {
                // Remove old ship cells
                if (cell.shipId === repairShipId) {
                  return { state: "empty" as const };
                }
                return { ...cell };
              })
            );

            // Place ship in new position (only on empty cells that haven't been revealed)
            repairNewPosition.forEach(({ row, col }) => {
              // Only place on empty cells
              if (newBoard[row][col].state === "empty") {
                newBoard[row][col] = {
                  state: "empty" as const,
                  shipId: repairShipId,
                };
              }
            });

            return newBoard;
          });
        }

        // Update ship: reduce hits by 1 based on actual hit count from board, update orientation
        setShips((prevShips) => {
          const newShips = prevShips.map((ship) => {
            if (ship.id === repairShipId) {
              // Use the actual hit count from board, subtract 1
              const newHits = Math.max(0, repairHitCount - 1);
              console.log(
                `Updating ship ${ship.name}: hits ${repairHitCount} -> ${newHits}`
              );
              return {
                ...ship,
                hits: newHits,
                orientation: repairNewOrientation,
                sunk:
                  newHits === 0
                    ? false
                    : newHits >= ship.size
                    ? true
                    : ship.sunk, // Update sunk status
              };
            }
            return ship;
          });
          return newShips;
        });

        const boardName = repairIsPlayerBoard ? "your" : "enemy";
        setMessage(
          `Repair Drone activated! ${repairShipName} on ${boardName} board has been repaired and relocated!`
        );

        // Clear repair drone animation after a delay
        setTimeout(() => {
          setRepairDrone(null);
        }, 2000);
      }, 1500); // Animation duration
    },
    [gameState, playerBoard, computerBoard, revealedComputerBoard, ships]
  );

  // Apply rapid fire effect - grants immediate extra shot(s)
  const applyRapidFireEffect = useCallback(
    (targetBoard: "player" | "computer", shots: number = 1) => {
      console.log(
        "applyRapidFireEffect called, gameState:",
        gameState,
        "targetBoard:",
        targetBoard,
        "shots:",
        shots
      );

      // if (gameState !== "playing") {
      //   console.log(
      //     "Game state is not playing, cannot apply rapid fire effect"
      //   );
      //   return;
      // }

      const isPlayerBoard = targetBoard === "player";
      const playerName = isPlayerBoard ? "Human" : "Computer";

      // Activate rapid fire for the target player
      rapidFireShotsRef.current = shots; // Set ref value synchronously FIRST
      console.log(
        `Rapid Fire activated: ${shots} shots for ${playerName}, ref set to ${rapidFireShotsRef.current}`
      );
      setRapidFireActive({
        playerName,
        shotsRemaining: shots,
        isPlayerBoard,
      });

      const boardName = isPlayerBoard ? "your" : "enemy";
      setMessage(
        `Rapid Fire activated! ${boardName === "your" ? "You" : "Enemy"} get${
          shots > 1 ? "" : "s"
        } ${shots} immediate extra shot${shots > 1 ? "s" : ""}!`
      );

      // If it's for the player and it's currently player's turn, grant the shot immediately
      if (isPlayerBoard && playerTurn) {
        // The extra shot will be available on the next click
        // The handleCellClick will check for rapidFireActive and allow the extra shot
      } else if (!isPlayerBoard && !playerTurn) {
        // If it's for computer and it's computer's turn, grant computer an extra shot
        setTimeout(() => {
          computerTurn();
        }, 1000);
      }

      // Clear rapid fire after shots are used (will be cleared in handleCellClick/computerTurn)
      // Note: rapidFireShotsRef is already set above
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameState, playerTurn]
  );

  // BOOST EFFECTS
  const applyBoostEffects = (amount: number) => {
    if (amount <= 0) return;
    // Base points equal to amount
    setScore((prev) => prev + amount);
    if (amount > 50) {
      // Mega boost: reveal up to 3 random cells (prefer ships), plus overlay
      setMegaOverlay(true);
      setTimeout(() => setMegaOverlay(false), 1500);
      revealMultipleCells(3);
      setMessage("Mega boost activated! Scouting enemy grid...");
    } else if (amount === 50) {
      // Reveal one random ship cell (as a hit)
      revealOneShipCell();
      setMessage("Boost 50! Critical hit revealed.");
    } else if (amount === 25) {
      // Mark one random empty cell as verified (hint)
      setUiPulse(true);
      setTimeout(() => setUiPulse(false), 800);
      markOneVerifiedEmpty();
      setMessage("Boost 25! Tactical hint revealed.");
    }
  };

  const pickRandomFrom = <T,>(items: T[]): T | null => {
    if (!items.length) return null;
    return items[Math.floor(Math.random() * items.length)] as T;
  };

  const markOneVerifiedEmpty = () => {
    const candidates: Array<{ r: number; c: number }> = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const cell = revealedComputerBoard[r][c];
        if (cell.state === "empty" && !cell.verified) {
          candidates.push({ r, c });
        }
      }
    }
    const pick = pickRandomFrom(candidates);
    if (!pick) return;
    setRevealedComputerBoard((prev) => {
      const board = prev.map((row) => row.slice());
      board[pick.r][pick.c] = { ...board[pick.r][pick.c], verified: true };
      return board;
    });
  };

  const revealOneShipCell = () => {
    const shipCells: Array<{ r: number; c: number }> = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const comp = computerBoard[r][c];
        const rev = revealedComputerBoard[r][c];
        if (comp.shipId && rev.state === "empty") {
          shipCells.push({ r, c });
        }
      }
    }
    const pick = pickRandomFrom(shipCells);
    if (!pick) return;
    forceHitOnComputer(pick.r, pick.c);
  };

  const revealMultipleCells = (count: number) => {
    const unknownCells: Array<{ r: number; c: number; hasShip: boolean }> = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const comp = computerBoard[r][c];
        const rev = revealedComputerBoard[r][c];
        if (rev.state === "empty") {
          unknownCells.push({ r, c, hasShip: !!comp.shipId });
        }
      }
    }
    const shipsFirst = unknownCells
      .filter((x) => x.hasShip)
      .concat(unknownCells.filter((x) => !x.hasShip));
    const picks: Array<{ r: number; c: number; asHit: boolean }> = [];
    let remaining = count;
    for (const cell of shipsFirst) {
      if (remaining <= 0) break;
      picks.push({ r: cell.r, c: cell.c, asHit: cell.hasShip });
      remaining -= 1;
    }
    if (picks.length === 0) return;
    setRevealedComputerBoard((prev) => {
      const board = prev.map((row) => row.slice());
      for (const p of picks) {
        const comp = computerBoard[p.r][p.c];
        board[p.r][p.c] = { ...comp, state: p.asHit ? "hit" : "miss" };
      }
      return board;
    });
    const anyHits = picks.filter((p) => p.asHit);
    if (anyHits.length > 0) {
      setShips((prevShips) => {
        const newShips = [...prevShips];
        for (const p of anyHits) {
          const comp = computerBoard[p.r][p.c];
          if (!comp.shipId) continue;
          const idx = newShips.findIndex((s) => s.id === comp.shipId);
          if (idx !== -1) {
            const updatedHits = newShips[idx].hits + 1;
            newShips[idx] = { ...newShips[idx], hits: updatedHits };
            if (updatedHits >= newShips[idx].size) {
              newShips[idx] = { ...newShips[idx], sunk: true };
            }
          }
        }
        return newShips;
      });
      playSound(hitSound.current);
    }
  };

  const forceHitOnComputer = (row: number, col: number) => {
    const computerCell = computerBoard[row][col];
    if (!computerCell.shipId) return;
    setRevealedComputerBoard((prev) => {
      const board = prev.map((r) => r.slice());
      board[row][col] = { ...computerCell, state: "hit" };
      return board;
    });
    playSound(hitSound.current);
    setShips((prevShips) => {
      const newShips = [...prevShips];
      const hitShipIndex = newShips.findIndex(
        (ship) => ship.id === computerCell.shipId
      );
      if (hitShipIndex !== -1) {
        const updatedHits = newShips[hitShipIndex].hits + 1;
        const sunk = updatedHits >= newShips[hitShipIndex].size;
        newShips[hitShipIndex] = {
          ...newShips[hitShipIndex],
          hits: updatedHits,
          sunk,
        };
        if (sunk) {
          playSound(sinkSound.current);
          setMessage(
            `Boost destroyed the enemy's ${newShips[hitShipIndex].name}!`
          );
          const difficultyMultiplier =
            difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
          setScore(
            (prev) =>
              prev + newShips[hitShipIndex].size * 10 * difficultyMultiplier
          );
        }
      }
      if (newShips.filter((ship) => ship.id <= 5).every((ship) => ship.sunk)) {
        endGame("win");
      }
      return newShips;
    });
  };

  const handleStartArena = async () => {
    const arena = arenaServiceRef.current;
    if (!arena) return;
    setArenaLoader(true);
    try {
      const token = authToken || localStorage.getItem("authToken") || "";
      const streamUrl = "https://twitch.tv/empireofbits";
      console.log("Token:", token);
      // console.log("Stream URL:", streamUrl);
      const result = await arena.initializeGame(streamUrl, token);
      setArenaLoader(false);
      if (result.success && result.data) {
        setArenaGameState(result.data);
        setShowArenaPanel(true);
        console.log("Arena Ready", result.data.gameId);
      } else {
        console.error("Arena Init Failed", result.error || "Unknown error");
      }
    } catch (e: unknown) {
      setArenaLoader(false);
      const err = e as { message?: string };
      console.error("Arena Init Error", err?.message || "Failed to initialize");
    }
  };

  const handleDisconnect = () => {
    const arena = arenaServiceRef.current;
    if (!arena || !arenaGameState) return;
    arena.disconnect();
    setArenaGameState(null);
    setArenaCountdown(null);
    setShowArenaPanel(false);
    setMonitorEvents([]);
    setStatusLabel("pending");
    // reset boost monitors
    setLastGameEvent(null);
    setItemDrops([]);
    console.log("Arena Disconnected");
  };

  // Omit stream URL modal for now; updateStream function can be reintroduced with UI later

  useEffect(() => {
    if (params) {
      setUserId(params);
      console.log(params);
      initializeGame(params);
    }
  }, [params]);

  const initializeGame = async (walletAddress: string) => {
    try {
      const response = await fetch(
        "http://localhost:3001/api/v1/games/battleship",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ walletAddress }),
        }
      );

      if (!response.ok) {
        console.error("Failed to initialize game");
      }
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error("Error initializing game:", error);
    }
  };

  const recordGameResult = async (won: boolean) => {
    if (!userId) return;
    const walletAddress = userId;

    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/games/battleship/${walletAddress}/result`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            difficulty,
            won,
            movesUsed,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.pointsEarned;
      } else {
        console.error("Failed to record game result");
      }
    } catch (error) {
      console.error("Error recording game result:", error);
    }

    // Return default points if API call fails
    return won
      ? difficulty === "easy"
        ? 100
        : difficulty === "medium"
        ? 150
        : 200
      : 0;
  };

  // Function to redirect to home with game results
  const redirectToHome = (pointsEarned: number, won: boolean) => {
    const params = new URLSearchParams({
      gameWon: won.toString(),
      gameName: "battleship",
      pointsEarned: pointsEarned.toString(),
    });

    window.location.href = `http://localhost:3000/?${params.toString()}`;
  };

  const playSound = (sound: HTMLAudioElement | null) => {
    if (sound && soundOn) {
      sound.currentTime = 0;
      sound.play().catch((e) => console.error("Error playing sound:", e));
    }
  };

  const randomizeShips = () => {
    const newBoard = generateEmptyBoard();
    const newShips = [...ships].map((ship) => ({
      ...ship,
      placed: false,
      hits: 0,
      sunk: false,
    }));
    const { board, updatedShips } = placeShipsRandomly(newBoard, newShips);
    setPlayerBoard(board);
    setShips(updatedShips);
  };

  const resetGame = () => {
    setGameState("setup");
    setPlayerBoard(generateEmptyBoard());
    setComputerBoard(generateEmptyBoard());
    setRevealedComputerBoard(generateEmptyBoard());
    setShips(
      ships.map((ship) => ({
        ...ship,
        placed: false,
        orientation: "horizontal",
        hits: 0,
        sunk: false,
      }))
    );
    setMessage("Place your ships on the grid.");
    setGameResult(null);
    setPlayerTurn(true);
    setMovesUsed(0);
    setShowPopup(false);
  };

  const startGame = () => {
    // Check if all ships are placed
    if (!ships.every((ship) => ship.placed)) {
      setMessage("You must place all ships before starting the game!");
      return;
    }

    // Setup computer board
    const computerEmptyBoard = generateEmptyBoard();
    const computerShips = ships.map((ship) => ({
      ...ship,
      placed: false,
      hits: 0,
      sunk: false,
    }));
    const { board: newComputerBoard } = placeShipsRandomly(
      computerEmptyBoard,
      computerShips
    );

    setComputerBoard(newComputerBoard);
    setRevealedComputerBoard(generateEmptyBoard());
    setGameState("playing");
    setMessage("Game started! Click on the opponent's grid to fire.");
    setMovesUsed(0);
  };

  const handleCellClick = (row: number, col: number) => {
    if (
      gameState !== "playing" ||
      revealedComputerBoard[row][col].state !== "empty"
    ) {
      return;
    }

    // Check if this is a rapid fire extra shot
    const isRapidFireShot =
      rapidFireActive &&
      rapidFireActive.isPlayerBoard &&
      !playerTurn &&
      rapidFireActive.shotsRemaining > 0;

    // Normal shot requires player turn, rapid fire shot doesn't
    if (!playerTurn && !isRapidFireShot) {
      return;
    }

    // Increment moves counter
    setMovesUsed((prev) => prev + 1);

    // Player's turn
    const newRevealedBoard = [...revealedComputerBoard];
    const computerCell = computerBoard[row][col];

    if (computerCell.shipId) {
      // Hit
      newRevealedBoard[row][col] = { ...computerCell, state: "hit" };
      playSound(hitSound.current);

      // Update ship hits
      const newShips = [...ships];
      const hitShipIndex = newShips.findIndex(
        (ship) => ship.id === computerCell.shipId
      );

      if (hitShipIndex !== -1) {
        newShips[hitShipIndex].hits += 1;

        // Check if ship is sunk
        if (newShips[hitShipIndex].hits === newShips[hitShipIndex].size) {
          newShips[hitShipIndex].sunk = true;
          playSound(sinkSound.current);
          setMessage(`You sunk the enemy's ${newShips[hitShipIndex].name}!`);

          // Add points based on ship size and difficulty
          const difficultyMultiplier =
            difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
          setScore(
            (prev) =>
              prev + newShips[hitShipIndex].size * 10 * difficultyMultiplier
          );
        } else {
          setMessage("Hit!");
        }
      }

      setShips(newShips);
      setRevealedComputerBoard(newRevealedBoard);

      // Show confetti effect on hit during rapid fire
      if (rapidFireActive && rapidFireActive.isPlayerBoard) {
        setExtraShotConfetti({
          row,
          col,
          isPlayerBoard: false,
        });
        setTimeout(() => {
          setExtraShotConfetti(null);
        }, 1000);
      }

      // Check if all computer ships are sunk
      if (newShips.filter((ship) => ship.id <= 5).every((ship) => ship.sunk)) {
        endGame("win");
        return;
      }
    } else {
      // Miss
      newRevealedBoard[row][col] = { ...computerCell, state: "miss" };
      playSound(missSound.current);
      setMessage("Miss! Computer's turn.");
      setRevealedComputerBoard(newRevealedBoard);
    }

    // Handle rapid fire extra shots for player - use ref for accurate tracking
    if (
      rapidFireActive &&
      rapidFireActive.isPlayerBoard &&
      rapidFireShotsRef.current > 0
    ) {
      // Decrement shots using ref (synchronous)
      rapidFireShotsRef.current = rapidFireShotsRef.current - 1;
      const newShotsRemaining = rapidFireShotsRef.current;

      console.log(
        `Player Rapid Fire: ${newShotsRemaining} shots remaining (decremented from ref)`
      );

      if (newShotsRemaining > 0) {
        // Still have shots remaining
        setRapidFireActive({
          ...rapidFireActive,
          shotsRemaining: newShotsRemaining,
        });
        setMessage(
          `Rapid Fire! ${newShotsRemaining} extra shot${
            newShotsRemaining > 1 ? "s" : ""
          } remaining!`
        );
        // Don't change turn, allow another shot
        return;
      } else {
        // No more rapid fire shots
        console.log(
          "Player Rapid Fire complete (0 shots remaining), clearing state"
        );
        rapidFireShotsRef.current = 0; // Reset ref
        setRapidFireActive(null);
        setMessage("Rapid Fire complete! Computer's turn.");
      }
    }

    // Computer's turn (unless rapid fire is still active for player)
    // Check ref value to see if player still has rapid fire shots
    if (
      !rapidFireActive ||
      !rapidFireActive.isPlayerBoard ||
      rapidFireShotsRef.current === 0
    ) {
      setPlayerTurn(false);
      setTimeout(() => computerTurn(), 1000);
    }
  };

  const computerTurn = () => {
    if (gameState !== "playing") {
      console.log("computerTurn: gameState is not playing, exiting");
      return;
    }

    // Check if rapid fire is active for computer - ONLY use ref for accurate count
    const currentShotsRemaining = rapidFireShotsRef.current;
    const isRapidFireActive =
      currentShotsRemaining > 0 &&
      rapidFireActive &&
      !rapidFireActive.isPlayerBoard;

    console.log(
      `computerTurn called - Rapid Fire active: ${isRapidFireActive}, shots remaining (ref): ${currentShotsRemaining}, playerTurn state: ${playerTurn}`
    );

    // Don't check playerTurn here - if computerTurn is called, it's the computer's turn
    // The turn check should happen before calling computerTurn, not inside it

    let row: number = -1,
      col: number = -1;
    let validMove = false;
    const newPlayerBoard = [...playerBoard];

    // Different AI strategies based on difficulty
    if (difficulty === "easy") {
      // Random shots
      while (!validMove) {
        row = Math.floor(Math.random() * 10);
        col = Math.floor(Math.random() * 10);
        if (newPlayerBoard[row][col].state === "empty") {
          validMove = true;
        }
      }
    } else {
      // Medium and Hard: Smarter targeting
      // First, look for hits to target adjacent cells
      const hits = [];
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          if (
            newPlayerBoard[r][c].state === "hit" &&
            !newPlayerBoard[r][c].sunk
          ) {
            hits.push({ r, c });
          }
        }
      }

      if (hits.length > 0 && (difficulty === "hard" || Math.random() > 0.3)) {
        // Target around a hit
        const targetHit = hits[Math.floor(Math.random() * hits.length)];
        const directions = [
          { r: -1, c: 0 }, // up
          { r: 1, c: 0 }, // down
          { r: 0, c: -1 }, // left
          { r: 0, c: 1 }, // right
        ];

        // Shuffle directions for more unpredictable behavior
        directions.sort(() => Math.random() - 0.5);

        let foundTarget = false;
        for (const dir of directions) {
          const newR = targetHit.r + dir.r;
          const newC = targetHit.c + dir.c;

          if (
            newR >= 0 &&
            newR < 10 &&
            newC >= 0 &&
            newC < 10 &&
            newPlayerBoard[newR][newC].state === "empty"
          ) {
            row = newR;
            col = newC;
            foundTarget = true;
            break;
          }
        }

        if (!foundTarget) {
          // If no valid adjacent cells, choose randomly
          while (!validMove) {
            row = Math.floor(Math.random() * 10);
            col = Math.floor(Math.random() * 10);
            if (newPlayerBoard[row][col].state === "empty") {
              validMove = true;
            }
          }
        } else {
          validMove = true;
        }
      } else {
        // Random shot with some intelligence for hard difficulty
        if (difficulty === "hard" && Math.random() > 0.5) {
          // Target cells in a checkerboard pattern for efficiency
          const potentialTargets = [];
          for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 10; c++) {
              if (newPlayerBoard[r][c].state === "empty" && (r + c) % 2 === 0) {
                potentialTargets.push({ r, c });
              }
            }
          }

          if (potentialTargets.length > 0) {
            const target =
              potentialTargets[
                Math.floor(Math.random() * potentialTargets.length)
              ];
            row = target.r;
            col = target.c;
            validMove = true;
          }
        }

        // If no valid move found yet, choose randomly
        if (!validMove) {
          while (!validMove) {
            row = Math.floor(Math.random() * 10);
            col = Math.floor(Math.random() * 10);
            if (newPlayerBoard[row][col].state === "empty") {
              validMove = true;
            }
          }
        }
      }
    }

    // Execute the computer's move
    if (newPlayerBoard[row][col].shipId) {
      // Hit
      newPlayerBoard[row][col].state = "hit";
      playSound(hitSound.current);

      // Update ship hits
      const newShips = [...ships];
      const hitShipIndex = newShips.findIndex(
        (ship) => ship.id === newPlayerBoard[row][col].shipId
      );

      if (hitShipIndex !== -1) {
        newShips[hitShipIndex].hits += 1;

        // Check if ship is sunk
        if (newShips[hitShipIndex].hits === newShips[hitShipIndex].size) {
          newShips[hitShipIndex].sunk = true;

          // Mark all cells of this ship as sunk
          for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 10; c++) {
              if (newPlayerBoard[r][c].shipId === newShips[hitShipIndex].id) {
                newPlayerBoard[r][c].sunk = true;
              }
            }
          }

          playSound(sinkSound.current);
          setMessage(`The enemy sunk your ${newShips[hitShipIndex].name}!`);
        } else {
          setMessage("Your ship was hit! Your turn.");
        }
      }

      setShips(newShips);

      // Check if all player ships are sunk
      if (newShips.filter((ship) => ship.id <= 5).every((ship) => ship.sunk)) {
        setPlayerBoard(newPlayerBoard);
        endGame("lose");
        return;
      }
    } else {
      // Miss
      newPlayerBoard[row][col].state = "miss";
      playSound(missSound.current);
      setMessage("The enemy missed! Your turn.");
    }

    setPlayerBoard(newPlayerBoard);

    // Handle rapid fire extra shots for computer - use ref for accurate tracking
    if (
      rapidFireActive &&
      !rapidFireActive.isPlayerBoard &&
      rapidFireShotsRef.current > 0
    ) {
      // Decrement shots using ref (synchronous)
      rapidFireShotsRef.current = rapidFireShotsRef.current - 1;
      const newShotsRemaining = rapidFireShotsRef.current;

      console.log(
        `Computer Rapid Fire: ${newShotsRemaining} shots remaining (decremented from ref)`
      );

      if (newShotsRemaining > 0) {
        // Still have shots remaining - update state and continue
        setRapidFireActive({
          ...rapidFireActive,
          shotsRemaining: newShotsRemaining,
        });
        setMessage(
          `Enemy Rapid Fire! ${newShotsRemaining} extra shot${
            newShotsRemaining > 1 ? "s" : ""
          } remaining!`
        );
        // Continue computer's turn with rapid fire
        setTimeout(() => computerTurn(), 1000);
        return;
      } else {
        // No more rapid fire shots - clear it and give turn to player
        console.log(
          "Computer Rapid Fire complete (0 shots remaining), clearing state"
        );
        rapidFireShotsRef.current = 0; // Reset ref
        setRapidFireActive(null);
        setMessage("Enemy Rapid Fire complete! Your turn.");
        // Give turn to player
        setTimeout(() => {
          setPlayerTurn(true);
        }, 100);
        return;
      }
    }

    // Normal turn end - give turn to player (no rapid fire active for computer)
    // Always set player turn to true after computer's turn completes
    // unless computer has rapid fire active (which is handled above)
    if (!isRapidFireActive) {
      setPlayerTurn(true);
    }
  };

  const endGame = async (result: "win" | "lose") => {
    setGameState("gameover");
    setGameResult(result);

    if (result === "win") {
      playSound(winSound.current);
      setMessage("Congratulations! You won the game!");

      // Record game result and get earned points
      const earningPoints = await recordGameResult(true);
      setPointsEarned(
        earningPoints || difficulty === "easy"
          ? 100
          : difficulty === "medium"
          ? 150
          : 200
      );

      // Save high score
      const newHighScore = { difficulty, score };
      const newHighScores = [...highScores, newHighScore]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      setHighScores(newHighScores);
      localStorage.setItem(
        "battleshipHighScores",
        JSON.stringify(newHighScores)
      );

      // Show popup
      setShowPopup(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        redirectToHome(
          earningPoints || difficulty === "easy"
            ? 100
            : difficulty === "medium"
            ? 150
            : 200,
          true
        );
      }, 2000);
    } else {
      playSound(loseSound.current);
      setMessage("Game over! The enemy sunk all your ships.");

      // Record loss
      await recordGameResult(false);
      setPointsEarned(0);

      // Show popup
      setShowPopup(true);

      // Redirect after 2 seconds
      setTimeout(() => {
        redirectToHome(0, false);
      }, 2000);
    }
  };

  const placeShip = (
    shipId: number,
    row: number,
    col: number,
    orientation: "horizontal" | "vertical"
  ) => {
    if (gameState !== "setup") return false;

    const shipIndex = ships.findIndex((ship) => ship.id === shipId);
    if (shipIndex === -1) return false;

    const ship = ships[shipIndex];
    const newBoard = [...playerBoard];

    // Check if placement is valid
    if (!isValidPlacement(newBoard, row, col, ship.size, orientation)) {
      return false;
    }

    // Place the ship
    for (let i = 0; i < ship.size; i++) {
      const r = orientation === "horizontal" ? row : row + i;
      const c = orientation === "horizontal" ? col + i : col;

      newBoard[r][c] = {
        state: "empty",
        shipId: ship.id,
      };
    }

    // Update ship as placed
    const newShips = [...ships];
    newShips[shipIndex] = {
      ...ship,
      placed: true,
      orientation,
    };

    setPlayerBoard(newBoard);
    setShips(newShips);
    return true;
  };

  const rotateShip = (shipId: number) => {
    const shipIndex = ships.findIndex((ship) => ship.id === shipId);
    if (shipIndex === -1 || ships[shipIndex].placed) return;

    const newShips = [...ships];
    newShips[shipIndex] = {
      ...newShips[shipIndex],
      orientation:
        newShips[shipIndex].orientation === "horizontal"
          ? "vertical"
          : "horizontal",
    };

    setShips(newShips);
  };

  const removeShip = (shipId: number) => {
    if (gameState !== "setup") return;

    const shipIndex = ships.findIndex((ship) => ship.id === shipId);
    if (shipIndex === -1 || !ships[shipIndex].placed) return;

    // Remove ship from board
    const newBoard = [...playerBoard];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (newBoard[r][c].shipId === shipId) {
          newBoard[r][c] = { state: "empty" };
        }
      }
    }

    // Update ship as not placed
    const newShips = [...ships];
    newShips[shipIndex] = {
      ...ships[shipIndex],
      placed: false,
    };

    setPlayerBoard(newBoard);
    setShips(newShips);
  };

  return (
    <DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend}>
      <div className="w-full max-w-6xl mx-auto font-mono">
        <div className="text-center mb-4">
          <h1 className="text-4xl font-bold mb-1">Battleship</h1>
          {/* <p className="text-sm text-gray-600">45 players online</p> */}
        </div>

        {/* Arena Controls & Monitor */}
        <ArenaStatusPanel
          statusLabel={statusLabel}
          arenaGameState={arenaGameState}
          arenaCountdown={arenaCountdown}
          currentCycle={currentCycle}
          timeUntilReset={timeUntilReset}
          showArenaPanel={showArenaPanel}
          arenaLoader={arenaLoader}
          monitorEvents={monitorEvents}
          monitorBoosts={monitorBoosts}
          lastGameEvent={lastGameEvent}
          itemDrops={itemDrops}
          onStartArena={handleStartArena}
          onDisconnect={handleDisconnect}
        />

        {/* Boost Toasts */}
        <BoostToasts toasts={boostToasts} showBoostPopup={showBoostPopup} />

        {megaOverlay && (
          <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div className="bg-black/50 text-white px-6 py-4 rounded-lg text-2xl font-bold animate-pulse">
              Mega Boost!
            </div>
          </div>
        )}

        {/* Game Session Ended Notification */}
        {gameSessionEndedNotification && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
            <div className="bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg text-lg font-semibold animate-pulse flex items-center gap-2">
              <span>⚠️</span>
              <span>Game Session Ended</span>
            </div>
          </div>
        )}

        {/* Item Drop Celebration Popup - Framer Motion */}
        <AnimatePresence>
          {itemDropCelebration && (
            <ItemDropCelebrationPopup
              itemName={itemDropCelebration.itemName}
              itemImage={itemDropCelebration.image}
              purchaserUsername={itemDropCelebration.purchaserUsername}
              targetPlayerName={itemDropCelebration.targetPlayerName}
              stats={itemDropCelebration.stats}
              cost={itemDropCelebration.cost}
              onClose={closeItemDropCelebration}
            />
          )}
        </AnimatePresence>

        <div className="text-center mb-4">
          <p className="text-lg font-semibold">{message}</p>
        </div>

        {/* Game Result Popup */}
        <GameResultPopup
          show={showPopup}
          gameResult={gameResult}
          pointsEarned={pointsEarned}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Player's board */}
          <div className="flex flex-col items-center">
            <h2 className="text-xl font-bold mb-2">Your grid</h2>
            <GameBoard
              board={playerBoard}
              onCellClick={() => {}}
              isPlayerBoard={true}
              gameState={gameState}
              placeShip={placeShip}
              markEmptyCells={markEmptyCells}
              blastedCells={blastedCells}
              sonarPingCells={sonarPingCells}
              sonarPingCenter={sonarPingCenter}
              radarPingCells={radarPingCells}
              radarPingLine={radarPingLine}
              guidedMissile={guidedMissile}
              rapidFireActive={rapidFireActive}
              extraShotConfetti={extraShotConfetti}
              repairDrone={repairDrone}
            />

            {gameState === "setup" && (
              <div className="mt-4 flex flex-col items-center">
                <ShipDock
                  ships={ships}
                  rotateShip={rotateShip}
                  removeShip={removeShip}
                />
                <div className="flex gap-4 mt-4">
                  <Button
                    onClick={randomizeShips}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Randomize
                  </Button>
                  <Button
                    onClick={resetGame}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RotateCw size={16} />
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Computer's board */}
          <div
            className={`flex flex-col items-center ${
              uiPulse ? "ring-4 ring-yellow-300 rounded-md transition" : ""
            }`}
          >
            <div className="flex flex-col items-center mb-2">
              <h2 className="text-xl font-bold">Opponent</h2>
              {gameState === "setup" && (
                <div className="flex items-center gap-2 mt-1">
                  <RadioGroup
                    value={difficulty}
                    onValueChange={(value) =>
                      setDifficulty(value as Difficulty)
                    }
                    className="flex"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="easy" id="easy" />
                      <Label htmlFor="easy" className="text-sm">
                        easy
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1 mx-2">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium" className="text-sm">
                        medium
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="hard" id="hard" />
                      <Label htmlFor="hard" className="text-sm">
                        hard
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>

            <GameBoard
              board={revealedComputerBoard}
              onCellClick={handleCellClick}
              isPlayerBoard={false}
              gameState={gameState}
              placeShip={() => false}
              markEmptyCells={markEmptyCells}
              blastedCells={blastedCells}
              sonarPingCells={sonarPingCells}
              sonarPingCenter={sonarPingCenter}
              radarPingCells={radarPingCells}
              radarPingLine={radarPingLine}
              guidedMissile={guidedMissile}
              rapidFireActive={rapidFireActive}
              extraShotConfetti={extraShotConfetti}
              repairDrone={repairDrone}
            />

            {gameState === "setup" && (
              <Button
                onClick={startGame}
                className="mt-4 px-8"
                disabled={!ships.every((ship) => ship.placed)}
              >
                Play
              </Button>
            )}

            {gameState === "gameover" && !showPopup && (
              <div className="mt-4 flex flex-col items-center">
                <div
                  className={`text-2xl font-bold mb-2 ${
                    gameResult === "win" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {gameResult === "win" ? "Victory!" : "Defeat!"}
                </div>
                <div className="text-lg">Final Score: {score}</div>
                <Button onClick={resetGame} className="mt-4">
                  Play Again
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Settings and Score */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <GameSettings
            markEmptyCells={markEmptyCells}
            onMarkEmptyCellsChange={setMarkEmptyCells}
            compactChat={compactChat}
            onCompactChatChange={setCompactChat}
            soundOn={soundOn}
            onSoundOnChange={setSoundOn}
          />

          <ScoreBoard score={score} highScores={highScores} />
        </div>

        <footer className="mt-8 text-center text-sm text-gray-500">
          © 2023-2024 Battleship Game
        </footer>
      </div>
    </DndProvider>
  );
}
