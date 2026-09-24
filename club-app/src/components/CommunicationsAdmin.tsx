import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Template = {
  id: string;
  template_key: string;
  name: string;
  notification_type: string;
  title: string;
  body: string;
  deep_link: string | null;
  priority: string;
  default_channels: string[];
  status: string;
  created_at: string;
};

type Campaign = {
  id: string;
  campaign_key: string;
  name: string;
  audience_type: string;
  delivery_channels: string[];
  scheduled_at: string;
  status: string;
  recipients_count: number;
  sent_at: string | null;
  error_message: string | null;
  notification_templates:
    | { name: string; title: string }
    | { name: string; title: string }[]
    | null;
};

type ReminderRule = {
  id: string;
  rule_key: string;
  name: string;
  rule_type: string;
  lead_minutes: number;
  organization_id: string | null;
  group_id: string | null;
  delivery_channels: string[];
  status: string;
  notification_templates:
    | { name: string; title: string }
    | { name: string; title: string }[]
    | null;
};

type Plan = { id: string; name: string; plan_key: string };
type Organization = { id: string; name: string; organization_type: string };
type Group = { id: string; name: string; organization_id: string };
type EventRow = { id: string; title: string; starts_at: string };

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function localDateTimeValue(date = new Date(Date.now() + 15 * 60 * 1000)) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function CommunicationsAdmin({ role }: { role: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState("");

  const [templateName, setTemplateName] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [notificationType, setNotificationType] = useState("family_announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [priority, setPriority] = useState("normal");
  const [templateEmail, setTemplateEmail] = useState(true);
  const [templatePush, setTemplatePush] = useState(true);

  const [campaignName, setCampaignName] = useState("");
  const [campaignKey, setCampaignKey] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [audienceType, setAudienceType] = useState("all_guardians");
  const [planId, setPlanId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [eventId, setEventId] = useState("");
  const [scheduledAt, setScheduledAt] = useState(localDateTimeValue());
  const [emailChannel, setEmailChannel] = useState(true);
  const [pushChannel, setPushChannel] = useState(true);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);

  const [reminderName, setReminderName] = useState("");
  const [reminderKey, setReminderKey] = useState("");
  const [reminderType, setReminderType] = useState("event_upcoming");
  const [reminderTemplateId, setReminderTemplateId] = useState("");
  const [leadHours, setLeadHours] = useState("24");
  const [reminderOrganizationId, setReminderOrganizationId] = useState("");
  const [reminderGroupId, setReminderGroupId] = useState("");
  const [reminderEmail, setReminderEmail] = useState(true);
  const [reminderPush, setReminderPush] = useState(true);

  const canSchedule = ["super_admin", "content_admin", "operations_admin"].includes(role);

  const load = useCallback(async () => {
    setMessage("");

    const [
      templateResult,
      campaignResult,
      reminderResult,
      planResult,
      orgResult,
      groupResult,
      eventResult
    ] = await Promise.all([
      supabase
        .from("notification_templates")
        .select("id,template_key,name,notification_type,title,body,deep_link,priority,default_channels,status,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("notification_campaigns")
        .select("id,campaign_key,name,audience_type,delivery_channels,scheduled_at,status,recipients_count,sent_at,error_message,notification_templates(name,title)")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("notification_reminder_rules")
        .select("id,rule_key,name,rule_type,lead_minutes,organization_id,group_id,delivery_channels,status,notification_templates(name,title)")
        .order("created_at", { ascending: false }),
      supabase
        .from("membership_plans")
        .select("id,name,plan_key")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("organizations")
        .select("id,name,organization_type")
        .eq("status", "active")
        .order("name"),
      supabase
        .from("adventure_groups")
        .select("id,name,organization_id")
        .eq("status", "active")
        .order("name"),
      supabase
        .from("events")
        .select("id,title,starts_at")
        .eq("status", "published")
        .gte("starts_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("starts_at")
        .limit(100)
    ]);

    const error =
      templateResult.error ||
      campaignResult.error ||
      reminderResult.error ||
      planResult.error ||
      orgResult.error ||
      groupResult.error ||
      eventResult.error;

    if (error) {
      setMessage(error.message);
      return;
    }

    const nextTemplates = (templateResult.data ?? []) as Template[];
    const nextPlans = (planResult.data ?? []) as Plan[];
    const nextOrgs = (orgResult.data ?? []) as Organization[];
    const nextGroups = (groupResult.data ?? []) as Group[];
    const nextEvents = (eventResult.data ?? []) as EventRow[];

    setTemplates(nextTemplates);
    setCampaigns((campaignResult.data ?? []) as Campaign[]);
    setReminderRules((reminderResult.data ?? []) as ReminderRule[]);
    setPlans(nextPlans);
    setOrganizations(nextOrgs);
    setGroups(nextGroups);
    setEvents(nextEvents);

    const firstActive = nextTemplates.find((item) => item.status === "active");
    if (!templateId && firstActive) setTemplateId(firstActive.id);
    if (!reminderTemplateId && firstActive) setReminderTemplateId(firstActive.id);
    if (!planId && nextPlans[0]) setPlanId(nextPlans[0].id);
    if (!organizationId && nextOrgs[0]) setOrganizationId(nextOrgs[0].id);
    if (!groupId && nextGroups[0]) setGroupId(nextGroups[0].id);
    if (!eventId && nextEvents[0]) setEventId(nextEvents[0].id);
  }, [templateId, reminderTemplateId, planId, organizationId, groupId, eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeTemplates = useMemo(
    () => templates.filter((item) => item.status === "active"),
    [templates]
  );

  const filteredGroups = useMemo(
    () =>
      organizationId
        ? groups.filter((item) => item.organization_id === organizationId)
        : groups,
    [groups, organizationId]
  );

  const previewAudience = useCallback(async () => {
    if (!canSchedule) {
      setAudienceCount(null);
      return;
    }

    const args = {
      p_audience_type: audienceType,
      p_membership_plan_id: audienceType === "plan_guardians" ? planId || undefined : undefined,
      p_household_id: undefined,
      p_organization_id: audienceType === "organization_guardians" ? organizationId || undefined : undefined,
      p_group_id: audienceType === "group_guardians" ? groupId || undefined : undefined,
      p_event_id: audienceType === "event_guardians" ? eventId || undefined : undefined
    };

    const { data, error } = await supabase.rpc(
      "admin_preview_notification_audience",
      args
    );

    if (error) {
      setAudienceCount(null);
      return;
    }

    setAudienceCount(Number(data ?? 0));
  }, [
    canSchedule,
    audienceType,
    planId,
    organizationId,
    groupId,
    eventId
  ]);

  useEffect(() => {
    void previewAudience();
  }, [previewAudience]);

  async function createTemplate(event: FormEvent) {
    event.preventDefault();
    setWorking("template");
    setMessage("");

    const channels = [
      ...(templateEmail ? ["email"] : []),
      ...(templatePush ? ["push"] : [])
    ];

    const { error } = await supabase.rpc(
      "admin_create_notification_template",
      {
        p_template_key: templateKey || slugify(templateName),
        p_name: templateName.trim(),
        p_notification_type: notificationType.trim(),
        p_title: title.trim(),
        p_body: body.trim(),
        p_deep_link: deepLink.trim() || undefined,
        p_priority: priority,
        p_default_channels: channels
      }
    );

    setWorking("");

    if (error) {
      setMessage(error.message);
      return;
    }

    setTemplateName("");
    setTemplateKey("");
    setTitle("");
    setBody("");
    setDeepLink("");
    setMessage("Notification template created as a draft. Review and activate it through DC Governance.");
    await load();
  }

  async function scheduleCampaign(event: FormEvent) {
    event.preventDefault();

    if (!templateId) {
      setMessage("Choose an active DC-approved notification template.");
      return;
    }

    setWorking("campaign");
    setMessage("");

    const channels = [
      ...(emailChannel ? ["email"] : []),
      ...(pushChannel ? ["push"] : [])
    ];

    const { error } = await supabase.rpc(
      "admin_schedule_notification_campaign",
      {
        p_campaign_key: campaignKey || slugify(campaignName),
        p_name: campaignName.trim(),
        p_template_id: templateId,
        p_audience_type: audienceType,
        p_scheduled_at: new Date(scheduledAt).toISOString(),
        p_delivery_channels: channels,
        p_membership_plan_id:
          audienceType === "plan_guardians" ? planId || undefined : undefined,
        p_household_id: undefined,
        p_organization_id:
          audienceType === "organization_guardians"
            ? organizationId || undefined
            : undefined,
        p_group_id:
          audienceType === "group_guardians" ? groupId || undefined : undefined,
        p_event_id:
          audienceType === "event_guardians" ? eventId || undefined : undefined
      }
    );

    setWorking("");

    if (error) {
      setMessage(error.message);
      return;
    }

    setCampaignName("");
    setCampaignKey("");
    setScheduledAt(localDateTimeValue());
    setMessage("Guardian campaign scheduled. The dispatcher checks due campaigns every five minutes.");
    await load();
    await previewAudience();
  }

  async function createReminderRule(event: FormEvent) {
    event.preventDefault();

    if (!reminderTemplateId) {
      setMessage("Choose an active DC-approved reminder template.");
      return;
    }

    setWorking("reminder");
    setMessage("");

    const channels = [
      ...(reminderEmail ? ["email"] : []),
      ...(reminderPush ? ["push"] : [])
    ];

    const { error } = await supabase.rpc(
      "admin_create_notification_reminder_rule",
      {
        p_rule_key: reminderKey || slugify(reminderName),
        p_name: reminderName.trim(),
        p_rule_type: reminderType,
        p_template_id: reminderTemplateId,
        p_lead_minutes: Math.max(15, Math.round((Number(leadHours) || 24) * 60)),
        p_delivery_channels: channels,
        p_organization_id: reminderOrganizationId || undefined,
        p_group_id: reminderGroupId || undefined
      }
    );

    setWorking("");

    if (error) {
      setMessage(error.message);
      return;
    }

    setReminderName("");
    setReminderKey("");
    setMessage("Automatic reminder rule created.");
    await load();
  }

  async function toggleReminderRule(rule: ReminderRule) {
    if (!canSchedule) return;

    const nextStatus = rule.status === "active" ? "paused" : "active";
    setWorking("rule:" + rule.id);
    setMessage("");

    const { error } = await supabase
      .from("notification_reminder_rules")
      .update({ status: nextStatus })
      .eq("id", rule.id);

    setWorking("");

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(nextStatus === "active" ? "Reminder rule resumed." : "Reminder rule paused.");
    await load();
  }

  async function cancelCampaign(id: string) {
    setWorking("cancel:" + id);
    setMessage("");

    const { error } = await supabase.rpc(
      "admin_cancel_notification_campaign",
      { p_campaign_id: id }
    );

    setWorking("");

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Campaign canceled.");
    await load();
  }

  return (
    <div className="communications-admin">
      {message && <div className="form-message">{message}</div>}

      <section className="communications-hero">
        <div>
          <p className="eyebrow gold">Guardian Communications</p>
          <h2>In-app, email queue & push queue</h2>
          <p>
            Campaigns are sent to guardian accounts only. Message templates must pass DC Governance before they can be scheduled.
          </p>
        </div>
        <div className="communications-audience">
          <strong>{audienceCount ?? "–"}</strong>
          <span>guardian accounts in current audience</span>
        </div>
      </section>

      <div className="admin-two-column">
        <section className="admin-card">
          <p className="eyebrow red">Message Template</p>
          <h2>Create DC-reviewed copy</h2>

          <form className="admin-form" onSubmit={createTemplate}>
            <label>
              Template name
              <input
                required
                value={templateName}
                onChange={(event) => {
                  setTemplateName(event.target.value);
                  if (!templateKey) setTemplateKey(slugify(event.target.value));
                }}
              />
            </label>

            <label>
              Template key
              <input
                required
                value={templateKey}
                onChange={(event) => setTemplateKey(slugify(event.target.value))}
              />
            </label>

            <label>
              Notification type
              <select
                value={notificationType}
                onChange={(event) => setNotificationType(event.target.value)}
              >
                <option value="family_announcement">Family announcement</option>
                <option value="family_event_reminder">Event reminder</option>
                <option value="family_challenge_reminder">Challenge reminder</option>
                <option value="family_faith_reminder">Faith at Home reminder</option>
                <option value="product_update">Product update</option>
                <option value="marketing_campaign">Marketing / offer</option>
              </select>
            </label>

            <label>
              Priority
              <select value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>

            <label className="full">
              Notification title
              <input required value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>

            <label className="full">
              Message
              <textarea required value={body} onChange={(event) => setBody(event.target.value)} />
            </label>

            <label className="full">
              Deep link <span className="optional">(optional)</span>
              <input
                value={deepLink}
                onChange={(event) => setDeepLink(event.target.value)}
                placeholder="/"
              />
            </label>

            <div className="communication-channel-picks full">
              <span>Default external channels</span>
              <label>
                <input
                  type="checkbox"
                  checked={templateEmail}
                  onChange={(event) => setTemplateEmail(event.target.checked)}
                />
                Email queue
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={templatePush}
                  onChange={(event) => setTemplatePush(event.target.checked)}
                />
                Push queue
              </label>
              <small>In-app notification is always created.</small>
            </div>

            <button className="primary-button full" disabled={working === "template"}>
              Create draft template
            </button>
          </form>
        </section>

        <section className="admin-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow gold">Templates</p>
              <h2>DC communication library</h2>
            </div>
            <span className="pill">{templates.length}</span>
          </div>

          <div className="admin-list">
            {templates.map((template) => (
              <article className="communications-template-row" key={template.id}>
                <div>
                  <strong>{template.name}</strong>
                  <small>{template.notification_type.replaceAll("_", " ")}</small>
                  <p>{template.title}</p>
                </div>
                <div>
                  <span className={template.status === "active" ? "status-chip done" : "status-chip"}>
                    {template.status}
                  </span>
                  {template.status === "draft" && (
                    <small>Review in DC Governance</small>
                  )}
                </div>
              </article>
            ))}
            {!templates.length && (
              <p className="muted">No guardian message templates yet.</p>
            )}
          </div>
        </section>
      </div>

      <div className="admin-two-column communications-reminder-section">
        <section className="admin-card">
          <p className="eyebrow gold">Automatic Reminders</p>
          <h2>Event & group challenge reminders</h2>

          {!canSchedule ? (
            <p className="muted">Your role can review reminder rules but cannot create or pause them.</p>
          ) : (
            <form className="admin-form" onSubmit={createReminderRule}>
              <label>
                Rule name
                <input
                  required
                  value={reminderName}
                  onChange={(event) => {
                    setReminderName(event.target.value);
                    if (!reminderKey) setReminderKey(slugify(event.target.value));
                  }}
                />
              </label>

              <label>
                Rule key
                <input
                  required
                  value={reminderKey}
                  onChange={(event) => setReminderKey(slugify(event.target.value))}
                />
              </label>

              <label>
                Reminder type
                <select value={reminderType} onChange={(event) => setReminderType(event.target.value)}>
                  <option value="event_upcoming">Upcoming registered event</option>
                  <option value="group_challenge_due">Incomplete group challenge due</option>
                </select>
              </label>

              <label>
                Lead time in hours
                <input
                  type="number"
                  min="0.25"
                  max="168"
                  step="0.25"
                  value={leadHours}
                  onChange={(event) => setLeadHours(event.target.value)}
                />
              </label>

              <label className="full">
                Active template
                <select
                  required
                  value={reminderTemplateId}
                  onChange={(event) => setReminderTemplateId(event.target.value)}
                >
                  <option value="">Choose DC-approved template</option>
                  {activeTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} · {template.title}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Organization scope <span className="optional">(optional)</span>
                <select
                  value={reminderOrganizationId}
                  onChange={(event) => {
                    setReminderOrganizationId(event.target.value);
                    if (
                      reminderGroupId &&
                      !groups.some(
                        (group) =>
                          group.id === reminderGroupId &&
                          (!event.target.value || group.organization_id === event.target.value)
                      )
                    ) {
                      setReminderGroupId("");
                    }
                  }}
                >
                  <option value="">All approved organizations</option>
                  {organizations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Group scope <span className="optional">(optional)</span>
                <select value={reminderGroupId} onChange={(event) => setReminderGroupId(event.target.value)}>
                  <option value="">All matching groups</option>
                  {groups
                    .filter(
                      (group) =>
                        !reminderOrganizationId ||
                        group.organization_id === reminderOrganizationId
                    )
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                </select>
              </label>

              <div className="communication-channel-picks full">
                <span>External delivery</span>
                <label>
                  <input
                    type="checkbox"
                    checked={reminderEmail}
                    onChange={(event) => setReminderEmail(event.target.checked)}
                  />
                  Email queue
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={reminderPush}
                    onChange={(event) => setReminderPush(event.target.checked)}
                  />
                  Push queue
                </label>
                <small>In-app is always included. Each source event/challenge can trigger only once per guardian per rule.</small>
              </div>

              <button className="secondary-button full" disabled={working === "reminder"}>
                Create reminder rule
              </button>
            </form>
          )}
        </section>

        <section className="admin-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow red">Reminder Rules</p>
              <h2>Active automation</h2>
            </div>
            <span className="pill">{reminderRules.length}</span>
          </div>

          <div className="admin-list">
            {reminderRules.map((rule) => {
              const template = firstRelation(rule.notification_templates);
              return (
                <article className="communications-campaign-row" key={rule.id}>
                  <div>
                    <strong>{rule.name}</strong>
                    <small>
                      {rule.rule_type.replaceAll("_", " ")} · {Math.round(rule.lead_minutes / 60 * 100) / 100} hours before
                    </small>
                    <p>{template?.title}</p>
                  </div>

                  <div className="communications-campaign-status">
                    <span className={rule.status === "active" ? "status-chip done" : "status-chip"}>
                      {rule.status}
                    </span>
                    {canSchedule && rule.status !== "archived" && (
                      <button
                        className="text-button small"
                        disabled={working === "rule:" + rule.id}
                        onClick={() => void toggleReminderRule(rule)}
                      >
                        {rule.status === "active" ? "Pause" : "Resume"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
            {!reminderRules.length && (
              <p className="muted">No automatic reminder rules are configured yet.</p>
            )}
          </div>
        </section>
      </div>

      <div className="admin-two-column">
        <section className="admin-card">
          <p className="eyebrow red">Schedule Campaign</p>
          <h2>Choose guardians & timing</h2>

          {!canSchedule ? (
            <p className="muted">
              Your admin role can review communications but cannot schedule campaigns.
            </p>
          ) : (
            <form className="admin-form" onSubmit={scheduleCampaign}>
              <label>
                Campaign name
                <input
                  required
                  value={campaignName}
                  onChange={(event) => {
                    setCampaignName(event.target.value);
                    if (!campaignKey) setCampaignKey(slugify(event.target.value));
                  }}
                />
              </label>

              <label>
                Campaign key
                <input
                  required
                  value={campaignKey}
                  onChange={(event) => setCampaignKey(slugify(event.target.value))}
                />
              </label>

              <label className="full">
                Active template
                <select
                  required
                  value={templateId}
                  onChange={(event) => setTemplateId(event.target.value)}
                >
                  <option value="">Choose DC-approved template</option>
                  {activeTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} · {template.title}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Audience
                <select
                  value={audienceType}
                  onChange={(event) => setAudienceType(event.target.value)}
                >
                  <option value="all_guardians">All active guardians</option>
                  <option value="plan_guardians">Membership plan guardians</option>
                  <option value="organization_guardians">Organization guardians</option>
                  <option value="group_guardians">Group guardians</option>
                  <option value="event_guardians">Event registrant guardians</option>
                </select>
              </label>

              <label>
                Send at
                <input
                  required
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                />
              </label>

              {audienceType === "plan_guardians" && (
                <label className="full">
                  Membership plan
                  <select value={planId} onChange={(event) => setPlanId(event.target.value)}>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {audienceType === "organization_guardians" && (
                <label className="full">
                  Organization
                  <select
                    value={organizationId}
                    onChange={(event) => setOrganizationId(event.target.value)}
                  >
                    {organizations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.organization_type}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {audienceType === "group_guardians" && (
                <label className="full">
                  Group
                  <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                    {filteredGroups.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {audienceType === "event_guardians" && (
                <label className="full">
                  Event
                  <select value={eventId} onChange={(event) => setEventId(event.target.value)}>
                    {events.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} · {new Date(item.starts_at).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="communication-channel-picks full">
                <span>External delivery</span>
                <label>
                  <input
                    type="checkbox"
                    checked={emailChannel}
                    onChange={(event) => setEmailChannel(event.target.checked)}
                  />
                  Email queue
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={pushChannel}
                    onChange={(event) => setPushChannel(event.target.checked)}
                  />
                  Push queue
                </label>
                <small>
                  In-app is always included. Guardian notification preferences and quiet hours are respected.
                </small>
              </div>

              <div className="communications-preview full">
                <strong>{audienceCount ?? 0}</strong>
                <span>guardian account{audienceCount === 1 ? "" : "s"} currently match this audience</span>
              </div>

              <button
                className="primary-button full"
                disabled={
                  working === "campaign" ||
                  !templateId ||
                  audienceCount === null
                }
              >
                Schedule guardian campaign
              </button>
            </form>
          )}
        </section>

        <section className="admin-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="eyebrow gold">Campaign History</p>
              <h2>Scheduled & delivered</h2>
            </div>
            <span className="pill">{campaigns.length}</span>
          </div>

          <div className="admin-list">
            {campaigns.map((campaign) => {
              const template = firstRelation(campaign.notification_templates);
              return (
                <article className="communications-campaign-row" key={campaign.id}>
                  <div>
                    <strong>{campaign.name}</strong>
                    <small>
                      {campaign.audience_type.replaceAll("_", " ")} · {new Date(campaign.scheduled_at).toLocaleString()}
                    </small>
                    <p>{template?.title}</p>
                    {campaign.error_message && (
                      <em>{campaign.error_message}</em>
                    )}
                  </div>

                  <div className="communications-campaign-status">
                    <span className={campaign.status === "sent" ? "status-chip done" : "status-chip"}>
                      {campaign.status}
                    </span>
                    {campaign.status === "sent" && (
                      <small>{campaign.recipients_count} recipients</small>
                    )}
                    {["draft", "scheduled"].includes(campaign.status) && canSchedule && (
                      <button
                        className="text-button small"
                        disabled={working === "cancel:" + campaign.id}
                        onClick={() => void cancelCampaign(campaign.id)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
            {!campaigns.length && (
              <p className="muted">No guardian campaigns have been scheduled.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
