import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Leaf } from "lucide-react";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setSessionFromEmergent } = useAuth();
  const processed = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = location.hash || window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) {
      navigate("/login", { replace: true });
      return;
    }
    (async () => {
      try {
        await setSessionFromEmergent(m[1]);
        // clear hash
        window.history.replaceState(null, "", window.location.pathname);
        toast.success("Signed in with Google");
        navigate("/dashboard", { replace: true });
      } catch (e) {
        setError(e?.response?.data?.detail || "Sign in failed");
      }
    })();
  }, [location.hash, navigate, setSessionFromEmergent]);

  return (
    <div className="min-h-[60vh] grid place-items-center px-5">
      <div className="card-soft p-10 text-center">
        <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground grid place-items-center mx-auto animate-pulse">
          <Leaf className="w-5 h-5" />
        </div>
        <h2 className="mt-4 font-heading text-xl font-semibold">Completing sign in…</h2>
        <p className="mt-2 text-sm text-muted-foreground">Hang tight, we're setting up your account.</p>
        {error && <p className="mt-4 text-sm text-accent">{error}</p>}
      </div>
    </div>
  );
}
