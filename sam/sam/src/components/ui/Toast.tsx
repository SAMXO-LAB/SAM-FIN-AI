"use client";
import { CircleCheck, CircleAlert } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState } from "react";

type Toast = { id: number; msg: string; tone: "ok" | "err" };
const Ctx = createContext<(msg: string, tone?: "ok" | "err") => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [t, setT] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((msg: string, tone: "ok" | "err" = "ok") => {
    clearTimeout(timer.current);
    setT({ id: Date.now(), msg, tone });
    timer.current = setTimeout(() => setT(null), 3200);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {t && (
        <div key={t.id} className="toast g4" role="status">
          <span className={t.tone === "ok" ? "ok" : "neg-t"}>{t.tone === "ok" ? <CircleCheck size={18} /> : <CircleAlert size={18} />}</span>
          <span>{t.msg}</span>
          <span style={{ width: 4 }} />
        </div>
      )}
    </Ctx.Provider>
  );
}
