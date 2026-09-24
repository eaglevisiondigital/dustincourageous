(() => {
  const endpoint = "https://vrixketvinzhsfwwcqiu.supabase.co/functions/v1/public-site-form-v2";

  function statusNode(form) {
    let node = form.querySelector(".dc-form-status");
    if (!node) {
      node = document.createElement("p");
      node.className = "form-note dc-form-status";
      node.setAttribute("role", "status");
      node.setAttribute("aria-live", "polite");
      form.appendChild(node);
    }
    return node;
  }

  function setStatus(form, message, kind) {
    const node = statusNode(form);
    node.textContent = message;
    node.dataset.kind = kind || "";
  }

  async function submit(form) {
    const type = form.dataset.dcBackendForm;
    if (!type) return;

    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.textContent : "";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    const data = new FormData(form);
    const honeypot = String(data.get("bot-field") || "");
    const base = {
      form_type: type,
      source_page: window.location.pathname,
      bot_field: honeypot,
      website: ""
    };

    let payload;

    if (type === "adventure_club_waitlist") {
      const consentInput = form.querySelector('input[name="parent-consent"]');
      const consentText = consentInput?.closest("label")?.textContent?.trim() || "";
      payload = {
        ...base,
        parent_guardian_name: String(data.get("parent-name") || "").trim(),
        email: String(data.get("email") || "").trim(),
        child_first_name: String(data.get("child-first-name") || "").trim(),
        child_age: String(data.get("child-age") || "").trim(),
        parent_guardian_consent: data.get("parent-consent") === "yes",
        consent_text: consentText
      };
    } else if (type === "contact") {
      payload = {
        ...base,
        name: String(data.get("name") || "").trim(),
        email: String(data.get("email") || "").trim(),
        message: String(data.get("message") || "").trim()
      };
    } else {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "We could not submit the form. Please try again.");
      }

      form.reset();
      setStatus(form, result.message || "Thank you. Your information was received.", "success");
    } catch (error) {
      setStatus(
        form,
        error instanceof Error ? error.message : "We could not submit the form. Please try again.",
        "error"
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  }

  document.querySelectorAll("form[data-dc-backend-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void submit(form);
    });
  });
})();
