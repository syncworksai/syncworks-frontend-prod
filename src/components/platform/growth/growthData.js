export const EDITABLE_STATUSES = ["NEW", "QUALIFIED", "NURTURING", "WON", "LOST"];

export const DEMO_LEADS = [
  { id: "demo-1", name: "Roofing Lead", source: "Organic", status: "NEW", stage: "NEW" },
  { id: "demo-2", name: "HVAC Commercial Prospect", source: "Paid Search", status: "QUALIFIED", stage: "QUALIFIED" },
  { id: "demo-3", name: "Property Mgmt Referral", source: "Referral", status: "NURTURING", stage: "NURTURING" },
  { id: "demo-4", name: "Plumbing Contract", source: "Outbound", status: "WON", stage: "WON" },
];

export const CHANNELS = [
  { key: "facebook", name: "Facebook", short: "FB", description: "Run lead-ad follow-up and comment capture automations.", oauth: true },
  { key: "instagram", name: "Instagram", short: "IG", description: "Trigger DM responders and nurture sequences from engagement.", oauth: true },
  { key: "google_business", name: "Google Business", short: "GB", description: "Capture local-intent leads and automate review nudges.", oauth: true },
  { key: "youtube", name: "YouTube", short: "YT", description: "Publish video snippets and route CTA traffic into SyncWorks.", oauth: true },
  { key: "tiktok", name: "TikTok", short: "TT", description: "Queue short-form campaign clips and track inquiry volume.", oauth: true },
  { key: "x", name: "X", short: "X", description: "Publish timely updates and drive reply/DM engagement flows.", oauth: true },
  { key: "linkedin", name: "LinkedIn", short: "LI", description: "Share trust-building posts for B2B and property management audiences.", oauth: true },
  { key: "pinterest", name: "Pinterest", short: "P", description: "Distribute evergreen visual content and drive site intent traffic.", oauth: true },
  { key: "snapchat", name: "Snapchat", short: "SC", description: "Test geo-targeted story creative and short-lifecycle promotions.", oauth: true },
  { key: "nextdoor", name: "Nextdoor", short: "ND", description: "Reach neighborhood audiences for local service visibility.", oauth: true },
  { key: "truth_social", name: "Truth Social", short: "TS", description: "Publish brand-safe updates and monitor audience interactions.", oauth: true },
  { key: "threads", name: "Threads", short: "TH", description: "Post conversational updates and route responses to nurture flows.", oauth: true },
  { key: "email", name: "Email", short: "EM", description: "Available now: manual/free channel for lifecycle follow-up.", oauth: false, alwaysAvailable: true },
  { key: "sms_twilio_planned", name: "SMS / Twilio planned", short: "SMS", description: "Planned: SMS/Twilio disabled until compliance/legal setup is approved.", oauth: false, planned: true },
];