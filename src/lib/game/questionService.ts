"use client";

import { collection, getDocs, query, where } from "firebase/firestore";
import type { PointValue, Question } from "@/types/game";
import { getFirebaseDb } from "@/lib/firebase/firestore";
import { sanitizeText } from "@/lib/security/inputSafety";
import { readLocalState } from "./localStore";
import { sampleQuestions } from "./mockData";

function normalizeQuestion(question: Question): Question {
  return {
    ...question,
    category: sanitizeText(question.category, 40),
    questionText: sanitizeText(question.questionText, 240),
    correctAnswer: sanitizeText(question.correctAnswer, 120),
    alternativeAnswers: question.alternativeAnswers.map((answer) => sanitizeText(answer, 120)),
  };
}

export async function getQuestions() {
  const db = getFirebaseDb();
  if (db) {
    try {
      const snapshot = await getDocs(collection(db, "questions"));
      const questions = snapshot.docs.map((doc) => ({
        ...(doc.data() as Question),
        id: doc.id,
      }));
      return (questions.length ? questions : sampleQuestions).map(normalizeQuestion);
    } catch (error) {
      console.warn("Firebase questions read failed; using local fallback.", error);
    }
  }

  return (readLocalState().questions.length ? readLocalState().questions : sampleQuestions).map(normalizeQuestion);
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
