import { create } from 'zustand';

export const useSurveyStore = create((set, get) => ({
  currentQuestionIndex: 0,
  answers: {},
  setAnswer: (questionKey, value) =>
    set((state) => ({
      answers: { ...state.answers, [questionKey]: value },
    })),
  nextQuestion: () =>
    set((state) => ({
      currentQuestionIndex: Math.min(state.currentQuestionIndex + 1, 99), // dinamik sınır
    })),
  prevQuestion: () =>
    set((state) => ({
      currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0),
    })),
  getAnswer: (key) => get().answers[key],
}));
