import React, { useState } from "react";
import { Activity, Mail, KeyRound } from "lucide-react";
import { supabase } from "../lib/supabase";

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [infoMsg, setInfoMsg] = useState("");

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");
        setInfoMsg("");
        setIsLoading(true);

        if (!email.endsWith("@rapsodo.com")) {
            setErrorMsg("Access restricted to @rapsodo.com emails only.");
            setIsLoading(false);
            return;
        }

        try {
            if (isSignUp) {
                // Sign Up Logic
                const { error, data } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                if (data.user && !data.session) {
                    setIsSignUp(false); // Switch to Login view
                    setInfoMsg("Signup successful! We sent a confirmation link to your email. Please click it, then sign in here.");
                } else if (data.session) {
                    // Auto logged in
                }
            } else {
                // Sign In Logic
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            console.error("Auth Error:", err);
            setErrorMsg(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            width: "100%",
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(circle at top right, #1e293b, #0f172a)",
            position: "relative",
            overflow: "hidden"
        }}>
            {/* Background elements */}
            <div style={{
                position: "absolute",
                top: "-10%",
                right: "-5%",
                width: "600px",
                height: "600px",
                background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
                borderRadius: "50%",
                zIndex: 0
            }} />

            <div className="glass-card" style={{
                width: "400px",
                padding: "3rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 1,
                boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
            }}>
                <div className="mb-6 flex flex-col items-center">
                    <Activity size={48} className="text-primary mb-4" />
                    <h1 className="text-3xl font-black italic tracking-tighter m-0 flex flex-col items-center leading-none">
                        <span>RAP</span>
                        <span className="text-primary text-sm font-bold tracking-[0.3em] mt-1">ANALYZER</span>
                    </h1>
                </div>

                <p className="text-muted text-sm text-center mb-8" style={{ color: "var(--text-muted)" }}>
                    {isSignUp ? "Create an account to get started." : "Sign in to access advanced analytics."}
                </p>

                {errorMsg && (
                    <div className="w-full bg-red-500/20 text-red-200 p-3 rounded mb-4 text-xs border border-red-500/30">
                        {errorMsg}
                    </div>
                )}

                {infoMsg && (
                    <div className="w-full bg-green-500/20 text-green-200 p-3 rounded mb-4 text-xs border border-green-500/30">
                        {infoMsg}
                    </div>
                )}

                <form onSubmit={handleAuth} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted" style={{ color: "var(--text-muted)" }}>Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@rapsodo.com"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid var(--glass-border)",
                                padding: "0.8rem 1rem",
                                borderRadius: "8px",
                                color: "#fff",
                                outline: "none",
                                fontSize: "0.9rem"
                            }}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted" style={{ color: "var(--text-muted)" }}>Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            minLength={6}
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid var(--glass-border)",
                                padding: "0.8rem 1rem",
                                borderRadius: "8px",
                                color: "#fff",
                                outline: "none",
                                fontSize: "0.9rem"
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary mt-4 flex items-center justify-center gap-2"
                        style={{ width: "100%", padding: "1rem" }}
                    >
                        {isLoading ? (isSignUp ? "Creating..." : "Signing in...") : (
                            <>
                                {isSignUp ? <Mail size={16} /> : <KeyRound size={16} />}
                                {isSignUp ? "CREATE ACCOUNT" : "SIGN IN"}
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setErrorMsg("");
                            setInfoMsg("");
                        }}
                        className="text-xs text-muted hover:text-white mt-2"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', textDecoration: 'underline' }}
                    >
                        {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t w-full text-center" style={{ borderColor: "var(--glass-border)" }}>
                    <span className="text-xs text-muted" style={{ color: "var(--text-muted)" }}>
                        Protected by Rapsodo Security
                    </span>
                </div>
            </div>
        </div>
    );
};
