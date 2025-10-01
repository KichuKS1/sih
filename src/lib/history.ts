import { AssessmentResult } from "@/services/api";
import { encryptJson, decryptJson } from "@/lib/crypto";

const KEY = (userId: string) => `ms_history_${userId}`;
const EKEY = (userId: string) => `ms_history_e_${userId}`;

export function saveAssessmentResult(userId: string, result: AssessmentResult) {
  try {
    const arr = loadAssessmentHistory(userId);
    // prevent duplicate entries by assessmentId
    if (!arr.find((r) => r.assessmentId === result.assessmentId)) {
      arr.push(result);
      localStorage.setItem(KEY(userId), JSON.stringify(arr));
    }
  } catch (e) {
    // ignore
  }
}

export function loadAssessmentHistory(userId: string): AssessmentResult[] {
  try {
    const raw = localStorage.getItem(KEY(userId));
    return raw ? (JSON.parse(raw) as AssessmentResult[]) : [];
  } catch {
    return [];
  }
}

export function clearAssessmentHistory(userId: string) {
  try {
    localStorage.removeItem(KEY(userId));
    localStorage.removeItem(EKEY(userId));
  } catch (e) {
    // ignore
  }
}

// Encrypted variants (password is kept only in memory by caller)
export async function saveEncryptedAssessmentResult(
  userId: string,
  result: AssessmentResult,
  password: string,
) {
  try {
    const existing = await loadEncryptedAssessmentHistory(userId, password);
    if (!existing.find((r) => r.assessmentId === result.assessmentId)) {
      existing.push(result);
      const payload = await encryptJson(existing, password);
      localStorage.setItem(EKEY(userId), payload);
    }
  } catch (e) {
    // ignore encryption errors
  }
}

export async function loadEncryptedAssessmentHistory(
  userId: string,
  password: string,
): Promise<AssessmentResult[]> {
  try {
    const raw = localStorage.getItem(EKEY(userId));
    if (!raw) return [];
    return await decryptJson<AssessmentResult[]>(raw, password);
  } catch {
    return [];
  }
}
