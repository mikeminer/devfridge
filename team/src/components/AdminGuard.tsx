import type { ReactNode } from "react";

type Props = {
  isAdmin: boolean;
  connected: boolean;
  children: ReactNode;
};

export function AdminGuard({ isAdmin, connected, children }: Props) {
  if (!connected || !isAdmin) return null;
  return <>{children}</>;
}
