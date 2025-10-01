import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useMemo,
  useState,
} from "react";

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  language: string;
  consent: boolean;
  accessToken?: string;
}

export interface LocalAuthState {
  userId: string; // anonymous or Firebase UID
  email: string;
  provider: "local" | "firebase";
  password?: string; // only for local encrypted history
}

interface UserSessionContextValue {
  user: UserProfile | null;
  setUser: Dispatch<SetStateAction<UserProfile | null>>;
  assessmentId: string | null;
  setAssessmentId: Dispatch<SetStateAction<string | null>>;
  clearSession: () => void;
  auth: LocalAuthState | null;
  setAuth: Dispatch<SetStateAction<LocalAuthState | null>>;
}

const UserSessionContext = createContext<UserSessionContextValue | undefined>(
  undefined,
);

export const UserSessionProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [auth, setAuth] = useState<LocalAuthState | null>(null);

  const clearSession = () => {
    setUser(null);
    setAssessmentId(null);
    setAuth(null);
  };

  const value = useMemo(
    () => ({
      user,
      setUser,
      assessmentId,
      setAssessmentId,
      clearSession,
      auth,
      setAuth,
    }),
    [user, assessmentId, auth],
  );

  return (
    <UserSessionContext.Provider value={value}>
      {children}
    </UserSessionContext.Provider>
  );
};

export const useUserSession = () => {
  const context = useContext(UserSessionContext);
  if (!context) {
    throw new Error("useUserSession must be used within a UserSessionProvider");
  }
  return context;
};
