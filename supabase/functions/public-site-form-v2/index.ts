import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.1";

const allowedOrigins = [
  "https://dustincourageous.com",
  "https://www.dustincourageous.com",
];

function cors(origin: string | null) {
  const allowed =
    !!origin &&
    (allowedOrigins.includes(origin) ||
      origin === "http://localhost:5173" ||
      origin.endsWith(".netlify.app"));

  return {
    "Access-Control-Allow-Origin": allowed ? origin! : "https://dustincourageous.com",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = cors(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  if (
    origin &&
    !allowedOrigins.includes(origin) &&
    origin !== "http://localhost:5173" &&
    !origin.endsWith(".netlify.app")
  ) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers,
    });
  }

  // Honeypot. A real visitor never fills this.
  if (text(body.website, 200) || text(body.bot_field, 200)) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const connectingIp = forwarded.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") ?? "";
  const ipHash = await sha256(connectingIp);
  const userAgentHash = userAgent ? await sha256(userAgent) : null;

  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const secretKey = secretKeys.default;
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!supabaseUrl || !secretKey) {
    return new Response(JSON.stringify({ error: "Service unavailable" }), {
      status: 503,
      headers,
    });
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const formType = text(body.form_type, 60);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  if (formType === "adventure_club_waitlist") {
    const { count } = await admin
      .from("marketing_leads")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", tenMinutesAgo);

    if ((count ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "Too many submissions. Please try again later." }), {
        status: 429,
        headers,
      });
    }

    const parentName = text(body.parent_guardian_name, 160);
    const email = text(body.email, 254).toLowerCase();
    const childFirstName = text(body.child_first_name, 80);
    const sourcePage = text(body.source_page, 300);
    const consentText = text(body.consent_text, 1000);
    const consent = body.parent_guardian_consent === true;
    const rawAge = body.child_age;
    const childAge =
      rawAge === null || rawAge === undefined || rawAge === ""
        ? null
        : Number(rawAge);

    if (!parentName || !validEmail(email) || !consent) {
      return new Response(JSON.stringify({ error: "Please complete the required parent/guardian fields." }), {
        status: 400,
        headers,
      });
    }

    if (childAge !== null && (!Number.isInteger(childAge) || childAge < 0 || childAge > 18)) {
      return new Response(JSON.stringify({ error: "Please enter a valid child age." }), {
        status: 400,
        headers,
      });
    }

    const { error } = await admin.rpc("capture_marketing_lead", {
      p_lead_type: "adventure_club_waitlist",
      p_source_page: sourcePage || null,
      p_parent_guardian_name: parentName,
      p_email: email,
      p_child_first_name: childFirstName || null,
      p_child_age: childAge,
      p_parent_guardian_consent: true,
      p_marketing_consent: true,
      p_consent_text: consentText || null,
      p_ip_hash: ipHash,
      p_user_agent_hash: userAgentHash,
      p_metadata: {
        submission_source: "dustincourageous.com",
        edge_function: "public-site-form-v2",
      },
    });

    if (error) {
      console.error("marketing lead insert failed", error);
      return new Response(JSON.stringify({ error: "We could not save your request. Please try again." }), {
        status: 500,
        headers,
      });
    }

    return new Response(JSON.stringify({ ok: true, message: "You're on the Adventure Club list!" }), {
      status: 200,
      headers,
    });
  }

  if (formType === "contact") {
    const { count } = await admin
      .from("contact_inquiries")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", tenMinutesAgo);

    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Too many submissions. Please try again later." }), {
        status: 429,
        headers,
      });
    }

    const name = text(body.name, 160);
    const email = text(body.email, 254).toLowerCase();
    const message = text(body.message, 5000);
    const sourcePage = text(body.source_page, 300);

    if (!name || !validEmail(email) || !message) {
      return new Response(JSON.stringify({ error: "Please complete all required fields." }), {
        status: 400,
        headers,
      });
    }

    const { error } = await admin.from("contact_inquiries").insert({
      name,
      email,
      message,
      source_page: sourcePage || null,
      ip_hash: ipHash,
      user_agent_hash: userAgentHash,
      metadata: {
        submission_source: "dustincourageous.com",
        edge_function: "public-site-form",
      },
    });

    if (error) {
      console.error("contact insert failed", error);
      return new Response(JSON.stringify({ error: "We could not send your message. Please try again." }), {
        status: 500,
        headers,
      });
    }

    return new Response(JSON.stringify({ ok: true, message: "Your message has been received." }), {
      status: 200,
      headers,
    });
  }

  return new Response(JSON.stringify({ error: "Unknown form type" }), {
    status: 400,
    headers,
  });
});
