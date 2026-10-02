"use client";

import React, { useState, useEffect } from "react";
import { Mail, Lock, User, Chrome, Loader2 } from "lucide-react";
import { loginWithEmail, signUpWithEmail, loginWithGoogle } from "../services/authService";
import "./AuthPage.css";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  useEffect(() => {
    const container = document.querySelector(".auth-container");
    if (!container) return;

    if (isSignUp) {
      container.classList.add("sign-up-mode");
    } else {
      container.classList.remove("sign-up-mode");
    }
    setErrorMsg(null); // Clear errors on switch
  }, [isSignUp]);

  const mapFirebaseError = (error: any) => {
    const code = error?.code || "";
    if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") return "Incorrect email or password.";
    if (code === "auth/email-already-in-use") return "An account with this email already exists.";
    if (code === "auth/weak-password") return "Password must be at least 6 characters.";
    if (code === "auth/invalid-email") return "Please enter a valid email address.";
    if (code === "auth/popup-closed-by-user") return null; // do not show
    return "Something went wrong. Please try again.";
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (!username.trim()) throw new Error("Please provide a username.");
      
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }
      
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      
      if (!hasUppercase || !hasLowercase || !hasNumber) {
        throw new Error("Password must contain at least one uppercase letter, one lowercase letter, and one number.");
      }

      await signUpWithEmail(email, password, username);
    } catch (err: any) {
      if (err.message === "Please provide a username." || err.message.startsWith("Password must")) {
        setErrorMsg(err.message);
      } else {
        const msg = mapFirebaseError(err);
        if (msg) setErrorMsg(msg);
      }
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await loginWithEmail(loginEmail, loginPassword);
    } catch (err: any) {
      const msg = mapFirebaseError(err);
      if (msg) setErrorMsg(msg);
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (isLoading) return;
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      const msg = mapFirebaseError(err);
      if (msg) setErrorMsg(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className={`auth-container ${isSignUp ? "sign-up-mode" : ""}`}>
      <div className="forms-container">
        <div className="signin-signup">
          
          {/* SIGN IN */}
          <form className="sign-in-form" onSubmit={handleSignIn}>
            <h2 className="title">Sign in</h2>

            <div className="input-field">
              <i><Mail size={18} /></i>
              <input
                type="email"
                placeholder="Email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>

            <div className="input-field">
              <i><Lock size={18} /></i>
              <input
                type="password"
                placeholder="Password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>

            {errorMsg && !isSignUp && <p className="error-msg">{errorMsg}</p>}

            <button type="submit" className="btn solid flex items-center justify-center gap-2" disabled={isLoading}>
              {isLoading && !isSignUp ? <Loader2 size={16} className="animate-spin" /> : null}
              Login
            </button>

            <p className="social-text">Or sign in with Google</p>

            <div className="social-media">
              <button type="button" onClick={handleGoogleAuth} className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors" disabled={isLoading}>
                <Chrome size={20} className="text-white" />
              </button>
            </div>
          </form>

          {/* SIGN UP */}
          <form className="sign-up-form" onSubmit={handleSignUp}>
            <h2 className="title">Sign up</h2>

            <div className="input-field">
              <i><User size={18} /></i>
              <input
                type="text"
                placeholder="Username"
                required
                minLength={3}
                maxLength={30}
                pattern=".*\S+.*"
                title="Username must be 3-30 characters and cannot be empty spaces"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="input-field">
              <i><Mail size={18} /></i>
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="input-field">
              <i><Lock size={18} /></i>
              <input
                type="password"
                placeholder="Password"
                required
                minLength={8}
                pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
                title="Password must contain at least 8 characters, including one uppercase letter, one lowercase letter, and one number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {errorMsg && isSignUp && <p className="error-msg">{errorMsg}</p>}

            <button type="submit" className="btn flex items-center justify-center gap-2" disabled={isLoading}>
              {isLoading && isSignUp ? <Loader2 size={16} className="animate-spin" /> : null}
              Sign up
            </button>

            <p className="social-text">Or sign up with Google</p>

            <div className="social-media">
              <button type="button" onClick={handleGoogleAuth} className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors" disabled={isLoading}>
                <Chrome size={20} className="text-white" />
              </button>
            </div>
          </form>

        </div>
      </div>

      <div className="panels-container">
        <div className="panel left-panel">
          <div className="content">
            <h3>New here?</h3>
            <p>Join SkillSwap and start learning, teaching and exchanging skills.</p>
            <button
              className="btn transparent"
              onClick={() => setIsSignUp(true)}
              type="button"
            >
              Sign up
            </button>
          </div>
        </div>

        <div className="panel right-panel">
          <div className="content">
            <h3>One of us?</h3>
            <p>Welcome back to SkillSwap. Sign in to continue your journey.</p>
            <button
              className="btn transparent"
              onClick={() => setIsSignUp(false)}
              type="button"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
