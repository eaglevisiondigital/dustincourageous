import { supabase } from "./supabase";

function detectPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad/.test(ua)) return "ipad";
  if (/iphone|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "web";
}

function detectChannel() {
  const params = new URLSearchParams(window.location.search);
  const explicit = params.get("app") || params.get("dc_app_channel");
  const allowed = ["web","goodbarber","ios_native","android_native","pwa","other"];

  if (explicit && allowed.includes(explicit)) {
    localStorage.setItem("dc_app_channel", explicit);
    return explicit;
  }

  const stored = localStorage.getItem("dc_app_channel");
  if (stored && allowed.includes(stored)) return stored;

  if (window.matchMedia?.("(display-mode: standalone)")?.matches) {
    return "pwa";
  }

  return "web";
}

function getInstallationKey() {
  const existing = localStorage.getItem("dc_installation_key");
  if (existing) return existing;

  const generated = crypto.randomUUID();
  localStorage.setItem("dc_installation_key", generated);
  return generated;
}

export async function registerCurrentInstallation() {
  if (typeof window === "undefined") return;

  const installationKey = getInstallationKey();
  const appChannel = detectChannel();
  const platform = detectPlatform();

  const capabilities = {
    notifications_api: "Notification" in window,
    service_worker: "serviceWorker" in navigator,
    standalone: Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches)
  };

  const { error } = await supabase.rpc("register_app_installation", {
    p_installation_key: installationKey,
    p_app_channel: appChannel,
    p_platform: platform,
    p_app_version: import.meta.env.VITE_APP_VERSION || undefined,
    p_device_name: navigator.platform || undefined,
    p_capabilities: capabilities,
    p_metadata: {
      href_origin: window.location.origin,
      user_agent_family: platform
    }
  });

  if (error) {
    console.warn("Unable to register Adventure Club installation", error);
  }
}
