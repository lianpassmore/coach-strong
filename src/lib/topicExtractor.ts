/**
 * Keyword-based topic classifier for Coach Strong conversations.
 * No LLM — runs in the webhook handler at zero extra cost.
 *
 * Each key is a display label; the array is the list of substrings
 * that must appear in the lowercased user transcript to match.
 */

export const TOPIC_KEYWORDS: Record<string, string[]> = {
  "Sleep & Recovery":      ["sleep", "rest", "tired", "fatigue", "insomnia", "waking up", "nap", "exhausted", "wind down", "can't sleep"],
  "Nutrition & Eating":    ["eat", "food", "nutrition", "diet", "meal", "calories", "protein", "sugar", "snack", "hungry", "hydration", "water intake", "fasting"],
  "Exercise & Movement":   ["exercise", "workout", "training", "gym", "walk", "run", "weights", "lifting", "movement", "strength"],
  "Stress & Anxiety":      ["stress", "anxious", "anxiety", "overwhelmed", "panic", "worry", "worried", "nervous", "pressure", "burnout"],
  "Energy & Motivation":   ["energy", "motivation", "motivated", "sluggish", "drive", "inspired", "momentum", "low energy"],
  "Menopause & Hormones":  ["menopause", "perimenopause", "peri", "hormones", "hot flash", "hot flush", "hrt", "cycle", "period"],
  "Mindset & Confidence":  ["confidence", "mindset", "self-worth", "self-doubt", "believe in", "capable", "empower"],
  "Work & Life Balance":   ["work", "job", "career", "busy", "balance", "deadline", "colleague", "office", "travel"],
  "Relationships & Family":["relationship", "family", "partner", "husband", "wife", "kids", "children", "friend", "social"],
  "Habits & Routines":     ["habit", "routine", "consistency", "schedule", "daily", "morning routine", "evening ritual"],
  "Goals & Progress":      ["goal", "progress", "achieve", "success", "milestone", "target", "aim", "plan"],
  "Body Image & Weight":   ["weight", "body image", "fat", "thin", "appearance", "pounds", "kilos", "body confidence"],
  "Injury & Pain":         ["injury", "pain", "sore", "ache", "physio", "knee", "back", "shoulder", "recovery"],
  "Guilt & Self-Judgment": ["guilt", "guilty", "shame", "ashamed", "failed", "failure", "blame", "disappoint", "judg"],
};

/**
 * Returns a deduplicated list of topic labels found in the given text.
 * Only returns topics with at least one keyword match.
 */
export function extractTopics(userTranscriptText: string): string[] {
  const lower = userTranscriptText.toLowerCase();
  return Object.entries(TOPIC_KEYWORDS)
    .filter(([, keywords]) => keywords.some(kw => lower.includes(kw)))
    .map(([topic]) => topic);
}
