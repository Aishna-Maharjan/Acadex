import { useEffect, useRef, useState } from "react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let gsiScriptPromise = null;

function loadGoogleScript() {
  if (gsiScriptPromise) return gsiScriptPromise;

  gsiScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      if (window.google?.accounts?.id) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Sign-In script."));
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}

/**
 * Renders Google's own "Sign in with Google" button and calls onCredential
 * with the raw ID token once the user completes the flow.
 *
 * Renders nothing if VITE_GOOGLE_CLIENT_ID isn't configured, so the app
 * works fine without a Google Cloud project set up.
 */
export default function GoogleSignInButton({ onCredential, text = "signin_with" }) {
  const buttonRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id || !buttonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredential(response.credential),
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          width: 360,
          text,
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [onCredential, text]);

  if (!GOOGLE_CLIENT_ID || failed) return null;

  return <div ref={buttonRef} className="google-signin-button" />;
}
