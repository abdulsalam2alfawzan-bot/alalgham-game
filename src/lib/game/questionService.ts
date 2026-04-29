"use client";

import { collection, getDocs, query, where } from "firebase/firestore";
import type { PointValue, Question } from "@/types/game";
import { getFirebaseDb } from "@/lib/firebase/firestore";
import { readLocalState } from "./localStore";
import { sampleQuestions } from "./mockData";

export async function getQuestions() {
  const db = getFirebaseDb();
  if (db) {
    try {
      const snapshot = await getDocs(collection(db, "questions"));
      const questions = snapshot.docs.map((doc) => ({
        ...(doc.data() as Question),
        id: doc.id,
      }));
      return questions.length ? questions : sampleQuestions;
    } catch (error) {
      console.warn("Firebase questions read failed; using local fallback.", error);
    }
  }

  return readLocalState().questions.length ? readLocalState().questions : sampleQuestions;
}

export async function getQuestionsForValue(pointValue: PointValue) {
  const db = getFirebaseDb();
  if (db) {
    try {
      const snapshot = await getDocs(
        query(collection(db, "questions"), where("pointValue", "==", pointValue)),
      );
      const questions = snapshot.docs.map((doc) => ({
        ...(doc.data() as Question),
        id: doc.id,
      }));
      if (questions.length) {
        return questions;
      }
    } catch (error) {
      console.warn("Firebase question filtered read failed; using local fallback.", error);
    }
  }

  return (await getQuestions()).filter((question) => question.pointValue === pointValue);
}
