import { useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { ADMIN_WALLET } from "../config/constants";
import { buildAdminMessage, encodeBase58 } from "../lib/auth";
import { addMember, removeMember, type TeamMember, type Socials } from "../lib/api";

type UseAdminProps = {
  publicKey: PublicKey | null;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  onUpdate: () => void;
};

export function useAdmin({ publicKey, signMessage, onUpdate }: UseAdminProps) {
  const isAdmin = publicKey?.toBase58() === ADMIN_WALLET;

  const add = useCallback(
    async (wallet: string, role: string, tier: number, displayName: string | null, socials?: Socials | null) => {
      if (!publicKey || !isAdmin) throw new Error("Not admin");
      const message = buildAdminMessage("add", wallet, { tier, role });
      const msgBytes = new TextEncoder().encode(message);
      const sigBytes = await signMessage(msgBytes);
      const signature = encodeBase58(sigBytes);
      await addMember(
        { wallet, role, tier, displayName, avatar: null, socials: socials ?? null },
        signature,
        message,
        publicKey.toBase58()
      );
      onUpdate();
    },
    [publicKey, isAdmin, signMessage, onUpdate]
  );

  const remove = useCallback(
    async (wallet: string) => {
      if (!publicKey || !isAdmin) throw new Error("Not admin");
      const message = buildAdminMessage("remove", wallet);
      const msgBytes = new TextEncoder().encode(message);
      const sigBytes = await signMessage(msgBytes);
      const signature = encodeBase58(sigBytes);
      await removeMember(wallet, signature, message, publicKey.toBase58());
      onUpdate();
    },
    [publicKey, isAdmin, signMessage, onUpdate]
  );

  const edit = useCallback(
    async (wallet: string, role: string, tier: number, displayName: string | null, socials?: Socials | null) => {
      if (!publicKey || !isAdmin) throw new Error("Not admin");
      const message = buildAdminMessage("edit", wallet, { tier, role });
      const msgBytes = new TextEncoder().encode(message);
      const sigBytes = await signMessage(msgBytes);
      const signature = encodeBase58(sigBytes);
      await addMember(
        { wallet, role, tier, displayName, avatar: null, socials: socials ?? null },
        signature,
        message,
        publicKey.toBase58()
      );
      onUpdate();
    },
    [publicKey, isAdmin, signMessage, onUpdate]
  );

  return { isAdmin, add, remove, edit };
}

export type { TeamMember };
