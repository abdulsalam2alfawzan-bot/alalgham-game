"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Board, GameEvent, Player, Question, Room, Team, Turn } from "@/types/game";
import { getSessionPlayerId, readRoomSession } from "@/lib/auth/sessionRole";
import { getBoards, watchBoards } from "./boardService";
import { getRoomEvents, watchRoomEvents } from "./eventService";
import { subscribeLocalRoomUpdates } from "./localStore";
import { getPlayers, watchPlayers } from "./playerService";
import { getQuestions } from "./questionService";
import { getRoom, watchRoom } from "./roomService";
import { getTeams, watchTeams } from "./teamService";
import { getTurns, watchTurns } from "./turnService";

export type LiveRoomState = {
  room: Room | null;
  teams: Team[];
  players: Player[];
  boards: Board[];
  turns: Turn[];
  events: GameEvent[];
  questions: Question[];
  currentTurn?: Turn;
  currentQuestion?: Question;
  actorId?: string;
  loading: boolean;
  syncing: boolean;
  refresh: () => Promise<void>;
};

function getFallbackRoomId(roomId?: string) {
  if (roomId) {
    return roomId;
  }

  const session = readRoomSession();
  return session?.roomId;
}

export function useRoomState(roomId?: string): LiveRoomState {
  const [resolvedRoomId, setResolvedRoomId] = useState<string | undefined>(roomId);
  const [room, setRoom] = useState<Room | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [actorId, setActorId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setResolvedRoomId(roomId);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [roomId]);

  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      const session = readRoomSession();
      const nextRoom = await getRoom(getFallbackRoomId(resolvedRoomId));
      if (!nextRoom) {
        setRoom(null);
        setLoading(false);
        return;
      }

      setResolvedRoomId(nextRoom.id);
      setRoom(nextRoom);
      const [nextTeams, nextPlayers, nextBoards, nextTurns, nextEvents, nextQuestions] = await Promise.all([
        getTeams(nextRoom.id),
        getPlayers(nextRoom.id),
        getBoards(nextRoom.id),
        getTurns(nextRoom.id),
        getRoomEvents(nextRoom.id),
        getQuestions(),
      ]);
      setTeams(nextTeams);
      setPlayers(nextPlayers);
      setBoards(nextBoards);
      setTurns(nextTurns);
      setEvents(nextEvents);
      setQuestions(nextQuestions);
      setActorId(getSessionPlayerId(session));
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [resolvedRoomId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    const targetRoomId = resolvedRoomId ?? room?.id;
    if (!targetRoomId) {
      return;
    }

    const unsubscribers = [
      watchRoom(targetRoomId, (nextRoom) => {
        setRoom(nextRoom ?? null);
        setLoading(false);
      }),
      watchTeams(targetRoomId, setTeams),
      watchPlayers(targetRoomId, setPlayers),
      watchBoards(targetRoomId, setBoards),
      watchTurns(targetRoomId, setTurns),
      watchRoomEvents(targetRoomId, setEvents),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [resolvedRoomId, room?.id]);

  useEffect(() => {
    return subscribeLocalRoomUpdates(() => {
      void refresh();
    });
  }, [refresh]);

  const currentTurn = turns[0];
  const currentQuestion = useMemo(
    () => questions.find((question) => question.id === currentTurn?.questionId) ?? questions[0],
    [currentTurn?.questionId, questions],
  );

  return {
    room,
    teams,
    players,
    boards,
    turns,
    events,
    questions,
    currentTurn,
    currentQuestion,
    actorId,
    loading,
    syncing,
    refresh,
  };
}
