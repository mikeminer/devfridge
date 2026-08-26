import { SCAN_API_URL } from "../config/constants";

export type Socials = {
  x?: string;
  github?: string;
  telegram?: string;
  discord?: string;
  farcaster?: string;
  pumpfun?: string;
};

export type TeamMember = {
  wallet: string;
  role: string;
  tier: 1 | 2 | 3 | 4 | 5;
  displayName: string | null;
  avatar: string | null;
  socials?: Socials | null;
  addedAt: number;
};

export async function fetchTeam(): Promise<TeamMember[]> {
  const res = await fetch(`${SCAN_API_URL}/api/team`);
  if (!res.ok) throw new Error(`Failed to fetch team: ${res.status}`);
  const data = (await res.json()) as { members: TeamMember[] };
  return data.members;
}

export async function addMember(
  member: { wallet: string; role: string; tier: number; displayName: string | null; avatar: string | null; socials?: Socials | null },
  signature: string,
  message: string,
  signer: string
): Promise<TeamMember[]> {
  const res = await fetch(`${SCAN_API_URL}/api/team`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...member, signature, message, signer }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error?: string }).error || `POST failed: ${res.status}`);
  }
  const data = (await res.json()) as { members: TeamMember[] };
  return data.members;
}

export async function removeMember(
  wallet: string,
  signature: string,
  message: string,
  signer: string
): Promise<TeamMember[]> {
  const res = await fetch(`${SCAN_API_URL}/api/team/${wallet}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ signature, message, signer }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error?: string }).error || `DELETE failed: ${res.status}`);
  }
  const data = (await res.json()) as { members: TeamMember[] };
  return data.members;
}
