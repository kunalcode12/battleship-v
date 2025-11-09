"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Volume2, VolumeX } from "lucide-react";

interface GameSettingsProps {
  markEmptyCells: boolean;
  onMarkEmptyCellsChange: (checked: boolean) => void;
  compactChat: boolean;
  onCompactChatChange: (checked: boolean) => void;
  soundOn: boolean;
  onSoundOnChange: (checked: boolean) => void;
}

export default function GameSettings({
  markEmptyCells,
  onMarkEmptyCellsChange,
  compactChat,
  onCompactChatChange,
  soundOn,
  onSoundOnChange,
}: GameSettingsProps) {
  return (
    <div className="flex flex-col">
      <h3 className="text-lg font-semibold mb-2">Settings:</h3>
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="markEmpty"
            checked={markEmptyCells}
            onCheckedChange={(checked) => onMarkEmptyCellsChange(!!checked)}
          />
          <label htmlFor="markEmpty" className="text-sm font-medium">
            Mark verified empty cells
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="compactChat"
            checked={compactChat}
            onCheckedChange={(checked) => onCompactChatChange(!!checked)}
          />
          <label htmlFor="compactChat" className="text-sm font-medium">
            Compact chat
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="soundOn"
            checked={soundOn}
            onCheckedChange={(checked) => onSoundOnChange(!!checked)}
          />
          <label htmlFor="soundOn" className="text-sm font-medium">
            Sound on
          </label>
          {soundOn ? (
            <Volume2 size={16} className="text-gray-600" />
          ) : (
            <VolumeX size={16} className="text-gray-600" />
          )}
        </div>
      </div>
    </div>
  );
}

