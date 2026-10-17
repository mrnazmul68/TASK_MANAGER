"use client";

import { useState } from "react";

const letters = "TASK_VAULT";

const colors = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F43F5E",
];

export default function Home() {
  const [colorIndex, setColorIndex] = useState(0);

  const changeColors = () => {
    setColorIndex((prev) => (prev + 1) % colors.length);
  };

  return (
    <div className="flex flex-col min-h-screen justify-center items-center gap-6 p-10">
      <h1 className="text-4xl font-bold">
        {letters.split("").map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            style={{
              color: colors[(index + colorIndex) % colors.length],
            }}
          >
            {letter}
          </span>
        ))}
      </h1>

      <button
        onClick={changeColors}
        className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700"
      >
        Change Colors
      </button>
    </div>
  );
}
