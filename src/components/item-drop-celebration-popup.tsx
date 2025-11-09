"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Zap, User, Target } from "lucide-react";

export interface ItemStat {
  name: string;
  currentValue: number;
  maxValue: number;
  description: string;
}

interface ItemDropCelebrationPopupProps {
  itemName: string;
  itemImage?: string;
  purchaserUsername?: string;
  targetPlayerName?: string;
  stats?: ItemStat[];
  cost?: number;
  onClose: () => void;
}

export default function ItemDropCelebrationPopup({
  itemName,
  itemImage,
  purchaserUsername,
  targetPlayerName,
  stats,
  cost,
  onClose,
}: ItemDropCelebrationPopupProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 1000); // 1 second duration

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed top-4 right-4 z-[100] pointer-events-none"
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <motion.div
            className="relative border-2 border-pink-400 rounded-lg bg-gradient-to-br from-purple-900/95 via-pink-900/95 to-blue-900/95 p-3 shadow-2xl max-w-xs w-72"
            style={{
              boxShadow:
                "0 0 20px rgba(236, 72, 153, 0.6), inset 0 0 10px rgba(59, 130, 246, 0.3)",
            }}
          >
            {/* Header with icon */}
            <div className="flex items-center gap-2 mb-2">
              <Gift className="text-pink-400 animate-pulse" size={20} />
              <h3 className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                ITEM DROP!
              </h3>
            </div>

            {/* Item Image and Name - Compact */}
            <div className="flex items-center gap-2 mb-2">
              {itemImage && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={itemImage}
                  alt={itemName}
                  className="h-10 w-10 object-contain border border-yellow-400 rounded bg-black/50 p-1"
                />
              )}
              <div className="flex-1">
                <div className="text-sm font-bold text-white truncate">
                  {itemName}
                </div>
                {purchaserUsername && (
                  <div className="text-xs text-cyan-300 flex items-center gap-1">
                    <User size={12} />
                    <span className="truncate">{purchaserUsername}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Target Player - Compact */}
            {targetPlayerName && (
              <div className="text-xs text-green-300 flex items-center gap-1 mb-1">
                <Target size={12} />
                <span>For: {targetPlayerName}</span>
              </div>
            )}

            {/* Cost - Compact */}
            {cost !== undefined && (
              <div className="flex items-center gap-1 text-xs">
                <Zap className="text-yellow-300" size={12} />
                <span className="text-yellow-200 font-bold">{cost} Coins</span>
              </div>
            )}

            {/* Small stats indicator if stats exist */}
            {stats && stats.length > 0 && (
              <div className="text-xs text-purple-300 mt-1">
                {stats.length} stat{stats.length > 1 ? "s" : ""}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

