import { compareTwoStrings } from 'string-similarity';

export const isSpeechRecognitionSupported = (): boolean => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

export const createSpeechRecognition = (): any | null => {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;
  
  return recognition;
};

export const speakText = (text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(event);
    
    window.speechSynthesis.speak(utterance);
  });
};

export const findBestMatch = (spokenText: string, options: string[]): { match: string; score: number } | null => {
  const normalizedSpoken = spokenText.toLowerCase().trim();
  
  let bestMatch = { text: '', score: 0 };
  
  for (const option of options) {
    const normalizedOption = option.toLowerCase().trim();
    const similarity = compareTwoStrings(normalizedSpoken, normalizedOption);
    
    if (similarity > bestMatch.score) {
      bestMatch = { text: option, score: similarity };
    }
  }
  
  // Threshold of 0.7 for fuzzy matching
  if (bestMatch.score >= 0.7) {
    return { match: bestMatch.text, score: bestMatch.score };
  }
  
  return null;
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
