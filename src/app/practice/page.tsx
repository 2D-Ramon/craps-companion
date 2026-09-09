"use client";

import { PracticeTable, RotatePrompt } from "@/components/PracticeTable";

export default function PracticePage() {
  return (
    <div className="practice-page h-full min-h-0">
      <div className="practice-portrait">
        <RotatePrompt />
      </div>
      <div className="practice-landscape">
        <PracticeTable />
      </div>
    </div>
  );
}
