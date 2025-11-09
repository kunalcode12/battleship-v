"use client";

import { useDrop } from "react-dnd";
import type { Cell, GameState } from "@/lib/types";

interface GameBoardProps {
  board: Cell[][];
  onCellClick: (row: number, col: number) => void;
  isPlayerBoard: boolean;
  gameState: GameState;
  placeShip: (
    shipId: number,
    row: number,
    col: number,
    orientation: "horizontal" | "vertical"
  ) => boolean;
  markEmptyCells: boolean;
  blastedCells?: Array<{
    row: number;
    col: number;
    isHit: boolean;
    isPlayerBoard?: boolean;
  }>;
  sonarPingCells?: Array<{
    row: number;
    col: number;
    hasShip: boolean;
    isPlayerBoard?: boolean;
  }>;
  sonarPingCenter?: {
    row: number;
    col: number;
    isPlayerBoard?: boolean;
  } | null;
  radarPingCells?: Array<{
    row: number;
    col: number;
    hasShip: boolean;
    isPlayerBoard?: boolean;
  }>;
  radarPingLine?: {
    type: "row" | "column";
    index: number;
    isPlayerBoard?: boolean;
    shipCount: number;
  } | null;
  guidedMissile?: {
    targets: Array<{
      targetRow: number;
      targetCol: number;
      adjacentRow?: number;
      adjacentCol?: number;
      isHit: boolean;
      isAnimating: boolean;
    }>;
    isPlayerBoard?: boolean;
  } | null;
  rapidFireActive?: {
    playerName: string;
    shotsRemaining: number;
    isPlayerBoard: boolean;
  } | null;
  extraShotConfetti?: {
    row: number;
    col: number;
    isPlayerBoard: boolean;
  } | null;
  repairDrone?: {
    isActive: boolean;
    targetBoard: "player" | "computer";
    shipId: number;
    oldPosition: Array<{ row: number; col: number }>;
    newPosition: Array<{ row: number; col: number }> | null;
  } | null;
}

export default function GameBoard({
  board,
  onCellClick,
  isPlayerBoard,
  gameState,
  placeShip,
  markEmptyCells,
  blastedCells = [],
  sonarPingCells = [],
  sonarPingCenter = null,
  radarPingCells = [],
  radarPingLine = null,
  guidedMissile = null,
  rapidFireActive = null,
  extraShotConfetti = null,
  repairDrone = null,
}: GameBoardProps) {
  const columns = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: "ship",
      drop: (
        item: {
          id: number;
          size: number;
          orientation: "horizontal" | "vertical";
        },
        monitor
      ) => {
        const { x, y } = monitor.getClientOffset() || { x: 0, y: 0 };
        const boardElement = document.getElementById("player-board");
        if (!boardElement) return;

        const rect = boardElement.getBoundingClientRect();
        const cellSize = rect.width / 10;

        // Calculate the cell coordinates
        const col = Math.floor((x - rect.left) / cellSize);
        const row = Math.floor((y - rect.top) / cellSize);

        if (row >= 0 && row < 10 && col >= 0 && col < 10) {
          placeShip(item.id, row, col, item.orientation);
        }
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [placeShip]
  );

  return (
    <div className="relative">
      {/* Rapid Fire Indicator - Two Shot Icon */}
      {rapidFireActive &&
        (rapidFireActive.isPlayerBoard === undefined ||
          rapidFireActive.isPlayerBoard === isPlayerBoard) && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 text-white px-4 py-2 rounded-lg shadow-2xl border-2 border-green-400 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <span className="text-sm font-bold tracking-wider">
                  RAPID FIRE
                </span>
                <div className="h-4 w-px bg-white opacity-50"></div>
                <span className="text-lg font-extrabold">
                  {rapidFireActive.shotsRemaining}
                </span>
                <span className="text-xs font-semibold">
                  shot{rapidFireActive.shotsRemaining !== 1 ? "s" : ""}
                </span>
                <span className="text-lg">⚡</span>
              </div>
            </div>
          </div>
        )}
      {/* Radar Ping Ship Count Display */}
      {radarPingLine &&
        (radarPingLine.isPlayerBoard === undefined ||
          radarPingLine.isPlayerBoard === isPlayerBoard) && (
          <div
            className={`absolute z-50 pointer-events-none ${
              radarPingLine.type === "row"
                ? "left-1/2 -translate-x-1/2"
                : "top-1/2 -translate-y-1/2 -rotate-90 origin-center"
            }`}
            style={{
              [radarPingLine.type === "row" ? "top" : "left"]: `${
                (radarPingLine.index + 1) * 32 + 16
              }px`,
            }}
          >
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white px-3 py-1.5 rounded-lg shadow-2xl border-2 border-blue-400 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider">RADAR</span>
                <div className="h-4 w-px bg-white opacity-50"></div>
                <span className="text-xl font-extrabold">
                  {radarPingLine.shipCount}
                </span>
                <span className="text-xs font-semibold">
                  ship{radarPingLine.shipCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        )}
      <style>{`
        @keyframes sonar-expand {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(3);
            opacity: 0;
          }
        }
        @keyframes radar-sweep {
          0% {
            opacity: 0.3;
            transform: scale(0.98);
          }
          50% {
            opacity: 0.6;
            transform: scale(1);
          }
          100% {
            opacity: 0.3;
            transform: scale(0.98);
          }
        }
        @keyframes missile-trail {
          0% {
            transform: scale(0.5) translateY(-100px);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        @keyframes explosion {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.5);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0.8;
          }
        }
        @keyframes flash-reveal {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
        }
        @keyframes repair-drone-fly {
          0% {
            opacity: 0;
            transform: scale(0.5) translate(0, 0);
          }
          50% {
            opacity: 1;
            transform: scale(1.2) translate(var(--dx), var(--dy));
          }
          100% {
            opacity: 0.8;
            transform: scale(1) translate(var(--dx), var(--dy));
          }
        }
        @keyframes repair-heal {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            opacity: 1;
            transform: scale(1.5);
          }
          100% {
            opacity: 0;
            transform: scale(1);
          }
        }
      `}</style>
      <div className="flex">
        <div className="w-8"></div>
        {columns.map((col) => (
          <div
            key={col}
            className="w-8 h-8 flex items-center justify-center font-bold text-gray-600"
          >
            {col}
          </div>
        ))}
      </div>

      <div
        id={isPlayerBoard ? "player-board" : "computer-board"}
        ref={(node) => {
          if (isPlayerBoard && gameState === "setup") {
            drop(node);
          }
        }}
        className={`relative ${isOver ? "bg-blue-100" : ""}`}
      >
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            <div className="w-8 h-8 flex items-center justify-center font-bold text-gray-600">
              {rowIndex + 1}
            </div>

            {row.map((cell, colIndex) => {
              let cellClass =
                "w-8 h-8 border border-blue-300 flex items-center justify-center relative transition-all duration-300";

              // Check if this cell was just blasted (only show if it's for this board)
              const isBlasted = blastedCells.some(
                (bc) =>
                  bc.row === rowIndex &&
                  bc.col === colIndex &&
                  (bc.isPlayerBoard === undefined ||
                    bc.isPlayerBoard === isPlayerBoard)
              );

              // Check if this cell is in sonar ping region (only show if it's for this board)
              const sonarPingCell = sonarPingCells.find(
                (spc) =>
                  spc.row === rowIndex &&
                  spc.col === colIndex &&
                  (spc.isPlayerBoard === undefined ||
                    spc.isPlayerBoard === isPlayerBoard)
              );
              const isSonarPingCell = !!sonarPingCell;

              // Check if this cell is in radar ping line (only show if it's for this board)
              const radarPingCell = radarPingCells.find(
                (rpc) =>
                  rpc.row === rowIndex &&
                  rpc.col === colIndex &&
                  (rpc.isPlayerBoard === undefined ||
                    rpc.isPlayerBoard === isPlayerBoard)
              );
              const isRadarPingCell = !!radarPingCell;
              const isRadarPingLine =
                radarPingLine &&
                (radarPingLine.isPlayerBoard === undefined ||
                  radarPingLine.isPlayerBoard === isPlayerBoard) &&
                ((radarPingLine.type === "row" &&
                  radarPingLine.index === rowIndex) ||
                  (radarPingLine.type === "column" &&
                    radarPingLine.index === colIndex));

              // Check if this cell is a guided missile target or adjacent cell
              const missileTarget = guidedMissile
                ? guidedMissile.targets.find(
                    (t) =>
                      (guidedMissile.isPlayerBoard === undefined ||
                        guidedMissile.isPlayerBoard === isPlayerBoard) &&
                      t.targetRow === rowIndex &&
                      t.targetCol === colIndex
                  )
                : null;
              const isMissileTarget = !!missileTarget;
              const missileAdjacent = guidedMissile
                ? guidedMissile.targets.find(
                    (t) =>
                      (guidedMissile.isPlayerBoard === undefined ||
                        guidedMissile.isPlayerBoard === isPlayerBoard) &&
                      t.adjacentRow !== undefined &&
                      t.adjacentCol !== undefined &&
                      t.adjacentRow === rowIndex &&
                      t.adjacentCol === colIndex
                  )
                : null;
              const isMissileAdjacent = !!missileAdjacent;

              // Check if this cell is part of repair drone effect
              const isRepairDroneActive =
                repairDrone &&
                repairDrone.isActive &&
                repairDrone.targetBoard ===
                  (isPlayerBoard ? "player" : "computer");
              const isOldRepairPosition = isRepairDroneActive
                ? repairDrone!.oldPosition.some(
                    (pos) => pos.row === rowIndex && pos.col === colIndex
                  )
                : false;
              const isNewRepairPosition = isRepairDroneActive
                ? repairDrone!.newPosition?.some(
                    (pos) => pos.row === rowIndex && pos.col === colIndex
                  )
                : false;
              const isRepairDroneCell =
                isRepairDroneActive &&
                (isOldRepairPosition || isNewRepairPosition) &&
                repairDrone!.shipId === cell.shipId;

              if (cell.state === "hit") {
                cellClass += " bg-red-500";
              } else if (cell.state === "miss") {
                cellClass += " bg-gray-300";
              } else if (cell.shipId && isPlayerBoard) {
                cellClass += " bg-blue-500";
                if (cell.sunk) {
                  cellClass += " bg-red-700";
                }
              }

              // Add blast animation effect - show visual indicator when cell is being blasted
              if (isBlasted) {
                cellClass +=
                  " ring-4 ring-orange-400 ring-opacity-90 animate-pulse";
                // Add a flash effect
                cellClass += " transition-all duration-300";
              }

              // Add sonar ping effect - pulsing border for 5 seconds
              if (isSonarPingCell) {
                cellClass +=
                  " ring-2 ring-cyan-400 ring-opacity-75 animate-pulse";
                // Show background hint if ship is present (lighter blue)
                if (sonarPingCell.hasShip && cell.state === "empty") {
                  cellClass += " bg-cyan-100 bg-opacity-50";
                }
              }

              // Add radar ping effect - highlight row/column with pulsing border
              if (isRadarPingLine) {
                cellClass +=
                  " ring-2 ring-blue-400 ring-opacity-80 animate-pulse";
                // Add background highlight for the entire line
                cellClass += " bg-blue-100 bg-opacity-40";
              }

              // Add radar ping cell effect - show ship presence indicator
              if (isRadarPingCell) {
                cellClass += " ring-1 ring-blue-300 ring-opacity-60";
                // Show stronger indicator if ship is present
                if (radarPingCell.hasShip && cell.state === "empty") {
                  cellClass += " bg-blue-200 bg-opacity-60";
                }
              }

              // Add guided missile target effect - explosion/flash
              if (isMissileTarget && missileTarget?.isAnimating) {
                cellClass +=
                  " ring-4 ring-red-500 ring-opacity-90 animate-pulse";
                cellClass += " bg-red-400 bg-opacity-50";
              } else if (isMissileTarget && !missileTarget?.isAnimating) {
                // After animation, show hit/miss indicator
                cellClass += " ring-2 ring-orange-400 ring-opacity-70";
              }

              // Add guided missile adjacent cell flash effect
              if (isMissileAdjacent) {
                cellClass +=
                  " ring-3 ring-yellow-400 ring-opacity-90 animate-ping";
                cellClass += " bg-yellow-300 bg-opacity-60";
              }

              // Add repair drone healing effect - highlight cells being repaired
              if (isRepairDroneCell) {
                if (isOldRepairPosition && !repairDrone!.newPosition) {
                  // Old position - show drone leaving
                  cellClass +=
                    " ring-2 ring-yellow-400 ring-opacity-80 animate-pulse";
                  cellClass += " bg-yellow-100 bg-opacity-50";
                } else if (isNewRepairPosition) {
                  // New position - show healing effect
                  cellClass +=
                    " ring-3 ring-green-400 ring-opacity-90 animate-pulse";
                  cellClass += " bg-green-200 bg-opacity-60";
                }
              }

              // Add hover effect for computer board during play
              // Show special cursor for rapid fire extra shots
              const isRapidFireActive =
                rapidFireActive &&
                rapidFireActive.isPlayerBoard === !isPlayerBoard &&
                rapidFireActive.shotsRemaining > 0;

              if (
                !isPlayerBoard &&
                gameState === "playing" &&
                cell.state === "empty" &&
                !isBlasted &&
                !isSonarPingCell &&
                !isRadarPingCell &&
                !isMissileTarget &&
                !isMissileAdjacent &&
                !isRepairDroneCell
              ) {
                cellClass += " hover:bg-blue-100 cursor-pointer";
                if (isRapidFireActive) {
                  cellClass += " ring-2 ring-green-400 ring-opacity-60";
                }
              }

              // Mark verified empty cells if enabled
              const isVerifiedEmpty =
                cell.state === "miss" ||
                (markEmptyCells && cell.state === "empty" && cell.verified);

              // Check if this is the sonar ping center cell (only show if it's for this board)
              const isSonarCenterCell =
                sonarPingCenter &&
                sonarPingCenter.row === rowIndex &&
                sonarPingCenter.col === colIndex &&
                (sonarPingCenter.isPlayerBoard === undefined ||
                  sonarPingCenter.isPlayerBoard === isPlayerBoard);

              return (
                <div
                  key={colIndex}
                  className={cellClass}
                  onClick={() => onCellClick(rowIndex, colIndex)}
                >
                  {/* Sonar ring animation - expanding ring from center */}
                  {isSonarCenterCell && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div
                        className="absolute rounded-full border-2 border-cyan-400 w-full h-full"
                        style={{
                          animation: "sonar-expand 2s ease-out",
                        }}
                      />
                    </div>
                  )}

                  {/* Blast effect indicator */}
                  {isBlasted && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-orange-400 text-2xl font-bold animate-ping">
                        💥
                      </span>
                    </div>
                  )}

                  {/* Sonar ping indicator - show ship presence without revealing */}
                  {isSonarPingCell &&
                    cell.state === "empty" &&
                    sonarPingCell.hasShip && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-cyan-600 text-lg font-bold animate-pulse z-20">
                          ⚠
                        </span>
                      </div>
                    )}

                  {/* Radar ping indicator - show ship presence along row/column */}
                  {isRadarPingCell &&
                    cell.state === "empty" &&
                    radarPingCell.hasShip && (
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                        <span className="text-blue-600 text-xl font-bold animate-pulse">
                          ●
                        </span>
                      </div>
                    )}

                  {/* Radar ping line highlight - animated border effect */}
                  {isRadarPingLine && (
                    <div className="absolute inset-0 pointer-events-none z-10">
                      <div
                        className="absolute bg-blue-400 bg-opacity-30 animate-pulse w-full h-full"
                        style={{
                          animation: "radar-sweep 2s ease-in-out",
                        }}
                      />
                    </div>
                  )}

                  {/* Guided Missile Trail Animation */}
                  {isMissileTarget &&
                    missileTarget?.isAnimating &&
                    (guidedMissile?.isPlayerBoard === undefined ||
                      guidedMissile?.isPlayerBoard === isPlayerBoard) && (
                      <div className="absolute inset-0 pointer-events-none z-30">
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{
                            animation: "missile-trail 0.8s ease-out",
                          }}
                        >
                          <span className="text-2xl animate-bounce">🚀</span>
                        </div>
                      </div>
                    )}

                  {/* Guided Missile Hit Explosion */}
                  {isMissileTarget &&
                    !missileTarget?.isAnimating &&
                    missileTarget?.isHit && (
                      <div className="absolute inset-0 pointer-events-none z-25">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span
                            className="text-3xl font-bold animate-ping"
                            style={{
                              animation: "explosion 0.5s ease-out",
                            }}
                          >
                            💥
                          </span>
                        </div>
                      </div>
                    )}

                  {/* Guided Missile Adjacent Cell Flash */}
                  {isMissileAdjacent && (
                    <div className="absolute inset-0 pointer-events-none z-25">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="absolute inset-0 bg-yellow-400 bg-opacity-70 rounded"
                          style={{
                            animation: "flash-reveal 0.5s ease-out",
                          }}
                        />
                        <span className="text-xl font-bold text-yellow-800 relative z-10 animate-pulse">
                          ⚡
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Rapid Fire Extra Shot Confetti Effect */}
                  {extraShotConfetti &&
                    extraShotConfetti.row === rowIndex &&
                    extraShotConfetti.col === colIndex &&
                    (extraShotConfetti.isPlayerBoard === undefined ||
                      extraShotConfetti.isPlayerBoard === isPlayerBoard) && (
                      <div className="absolute inset-0 pointer-events-none z-40">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex gap-1">
                            {[...Array(6)].map((_, i) => (
                              <span
                                key={i}
                                className="text-2xl animate-bounce"
                                style={{
                                  animationDelay: `${i * 0.1}s`,
                                  animationDuration: "1s",
                                }}
                              >
                                🎉
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Repair Drone Animation - Flying from old to new position */}
                  {isRepairDroneActive &&
                    isOldRepairPosition &&
                    repairDrone!.oldPosition.length > 0 &&
                    repairDrone!.oldPosition[0].row === rowIndex &&
                    repairDrone!.oldPosition[0].col === colIndex && (
                      <div className="absolute inset-0 pointer-events-none z-50">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div
                            className="absolute text-3xl"
                            style={{
                              animation: repairDrone!.newPosition
                                ? `repair-drone-fly 1.5s ease-in-out`
                                : "none",
                              transform: repairDrone!.newPosition
                                ? `translate(${
                                    (repairDrone!.newPosition[0].col -
                                      repairDrone!.oldPosition[0].col) *
                                    32
                                  }px, ${
                                    (repairDrone!.newPosition[0].row -
                                      repairDrone!.oldPosition[0].row) *
                                    32
                                  }px)`
                                : "none",
                            }}
                          >
                            🔧
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Repair Drone Healing Effect - At new position */}
                  {isRepairDroneActive &&
                    isNewRepairPosition &&
                    repairDrone!.newPosition &&
                    repairDrone!.newPosition.length > 0 &&
                    repairDrone!.newPosition[0].row === rowIndex &&
                    repairDrone!.newPosition[0].col === colIndex && (
                      <div className="absolute inset-0 pointer-events-none z-50">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div
                            className="absolute text-4xl"
                            style={{
                              animation: "repair-heal 1s ease-out",
                            }}
                          >
                            ✨
                          </div>
                          <div className="absolute text-3xl animate-pulse">
                            🔧
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Show visual indicators - same as manual clicks */}
                  {cell.state === "miss" &&
                    !isBlasted &&
                    (!isSonarPingCell || !sonarPingCell.hasShip) &&
                    (!isRadarPingCell || !radarPingCell.hasShip) &&
                    !isRepairDroneCell && (
                      <span className="text-gray-600 text-lg relative z-10">
                        •
                      </span>
                    )}
                  {cell.state === "hit" && (
                    <span className="text-white font-bold text-xl relative z-10">
                      ×
                    </span>
                  )}
                  {isVerifiedEmpty &&
                    cell.state === "empty" &&
                    !isBlasted &&
                    !isSonarPingCell &&
                    !isRepairDroneCell && (
                      <span className="text-gray-400 text-sm">•</span>
                    )}
                  {isBlasted && cell.state === "miss" && (
                    <span className="text-gray-700 text-lg relative z-10 font-bold">
                      •
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
