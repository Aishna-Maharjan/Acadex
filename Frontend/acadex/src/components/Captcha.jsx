import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const RECAPTCHA_SCRIPT_SRC = "https://www.google.com/recaptcha/api.js?render=explicit";

let recaptchaScriptPromise = null;

function loadRecaptchaScript() {
  if (recaptchaScriptPromise) return recaptchaScriptPromise;

  recaptchaScriptPromise = new Promise((resolve, reject) => {
    window.__onRecaptchaLoad = () => resolve();

    const existing = document.querySelector(`script[src^="https://www.google.com/recaptcha/api.js"]`);
    if (existing) {
      if (window.grecaptcha?.render) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `${RECAPTCHA_SCRIPT_SRC}&onload=__onRecaptchaLoad`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA script."));
    document.head.appendChild(script);
  });

  return recaptchaScriptPromise;
}

/**
 * Renders a reCAPTCHA v2 "I'm not a robot" checkbox. Exposes getToken()
 * and reset() via ref so the parent form can pull the token on submit.
 *
 * Renders nothing if VITE_RECAPTCHA_SITE_KEY isn't configured — the parent
 * form should treat a missing token as "not required" in that case.
 */
const Captcha = forwardRef(function Captcha(_props, ref) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    getToken() {
      if (!SITE_KEY || widgetIdRef.current === null || !window.grecaptcha) return null;
      return window.grecaptcha.getResponse(widgetIdRef.current) || null;
    },
    reset() {
      if (!SITE_KEY || widgetIdRef.current === null || !window.grecaptcha) return;
      window.grecaptcha.reset(widgetIdRef.current);
    },
  }));

  useEffect(() => {
    if (!SITE_KEY) return;

    let cancelled = false;

    loadRecaptchaScript().then(() => {
      if (cancelled || !containerRef.current || !window.grecaptcha?.render) return;
      if (widgetIdRef.current !== null) return; // already rendered

      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: SITE_KEY,
      });
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} className="captcha-widget" data-ready={ready} />;
});

export default Captcha;
