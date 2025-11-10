"use client";
import BattleshipGame from "@/components/battleship-game";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function GameWrapper() {
  const searchParams = useSearchParams();
  const authToken = searchParams.get("authToken") || undefined;
  
  if (typeof window !== "undefined") {
    localStorage.setItem("authToken", authToken || "");
  }

  return <BattleshipGame authToken={authToken} />;
}

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center p-4 bg-slate-100">
      <Suspense fallback={<p>Loading game...</p>}>
        <GameWrapper />
      </Suspense>
    </main>
  );
}
