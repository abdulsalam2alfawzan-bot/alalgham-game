import type { Team } from "@/types/game";

export function getNextTeamTurn(teams: Pick<Team, "id" | "order">[], currentTeamId?: string) {
  const orderedTeams = [...teams].sort((left, right) => left.order - right.order);
  if (!orderedTeams.length) {
    return undefined;
  }

  if (!currentTeamId) {
    return orderedTeams[0];
  }

  const currentIndex = orderedTeams.findIndex((team) => team.id === currentTeamId);
  return orderedTeams[(currentIndex + 1) % orderedTeams.length] ?? orderedTeams[0];
}
