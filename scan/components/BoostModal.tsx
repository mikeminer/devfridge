"use client";

import { useState } from "react";
import BoostSubscribe from "./BoostSubscribe";

export default function BoostModal({ mint }: { mint: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="fridge-key" onClick={() => setOpen(true)}>
        Boost
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/80 p-4">
          <div className="w-full max-w-lg">
            <div className="mb-2 flex justify-end">
              <button type="button" className="fridge-key" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <BoostSubscribe fixedMint={mint} compact />
          </div>
        </div>
      )}
    </>
  );
}
