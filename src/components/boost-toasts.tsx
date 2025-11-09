"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Zap } from "lucide-react";

interface BoostToast {
  id: number;
  amount: number;
  name: string;
}

interface BoostToastsProps {
  toasts: BoostToast[];
  showBoostPopup: { amount: number; name?: string } | null;
}

export default function BoostToasts({
  toasts,
  showBoostPopup,
}: BoostToastsProps) {
  return (
    <>
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((b) => (
            <Alert key={b.id} className="bg-white border-green-300">
              <AlertTitle className="flex items-center gap-2 text-green-700">
                <Zap size={16} /> Boost!
              </AlertTitle>
              <AlertDescription className="text-sm">
                {b.name} sent {b.amount}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {showBoostPopup && (
        <div className="fixed top-4 right-4 z-50">
          <Alert className="bg-white border-green-300">
            <AlertTitle className="flex items-center gap-2 text-green-700">
              <Zap size={16} /> Boost!
            </AlertTitle>
            <AlertDescription className="text-sm">
              {showBoostPopup.name || "Viewer"} sent {showBoostPopup.amount}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
}

