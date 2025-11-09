"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface GameResultPopupProps {
  show: boolean;
  gameResult: "win" | "lose" | null;
  pointsEarned: number;
}

export default function GameResultPopup({
  show,
  gameResult,
  pointsEarned,
}: GameResultPopupProps) {
  if (!show || !gameResult) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <Alert className="max-w-md w-full bg-white p-6 rounded-lg shadow-lg text-center">
        <AlertTitle
          className={`text-2xl font-bold ${
            gameResult === "win" ? "text-green-600" : "text-red-600"
          }`}
        >
          {gameResult === "win" ? "Victory!" : "Defeat!"}
        </AlertTitle>
        <AlertDescription className="mt-4">
          {gameResult === "win" ? (
            <div className="text-xl">
              You earned <span className="font-bold">{pointsEarned}</span>{" "}
              points!
            </div>
          ) : (
            <div className="text-xl">Better luck next time!</div>
          )}
          <div className="mt-2 text-sm text-gray-500">
            Redirecting in 2 seconds...
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

