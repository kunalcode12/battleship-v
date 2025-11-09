"use client";
import BattleshipGame from "@/components/battleship-game";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

export default function Home() {
  const searchParams = useSearchParams();
  const authToken = searchParams.get("authToken") || undefined;
  localStorage.setItem("authToken", authToken || "");

  return (
    <main className="min-h-screen flex flex-col items-center p-4 bg-slate-100">
      <Suspense fallback={<p>Loading game...</p>}>
        <BattleshipGame authToken={authToken} />
      </Suspense>
    </main>
  );
}
