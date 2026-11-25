// Founder-only presentation mapping. Backend worker permissions and dispatch remain authoritative.
export const PILOT_EMAIL = "jacoblord7@outlook.com";
export const PILOT_AGENTS = Object.freeze([
  { id: "executive-female", name: "Sydney", role: "Chief of Staff", workerRole: "chief_of_staff", voiceName: "Terri - Conversational Australian", voiceId: "3F0Z2rlB8b72i7fhQVJ1", photo: "/jarvis-avatars/newvictoria.png", fallbackPhoto: "/jarvis-avatars/Victoria.png" },
  { id: "accounting-female", name: "Olivia", role: "Accounting & Finance", workerRole: "accounting_finance", voiceName: "Mel", voiceId: "S4nguEX1VTAu3fNbnGzT", photo: "/jarvis-avatars/Charlotte.png", fallbackPhoto: "/jarvis-avatars/elizabeth.jpeg" },
  { id: "future-female", name: "Naomi", role: "Marketing Manager", workerRole: "social_media_marketing", voiceName: "Laura", voiceId: "FGY2WhTYpPnrIDTdsKH5", photo: "/jarvis-avatars/naomi.png", fallbackPhoto: "/jarvis-avatars/Elizabeth.png" },
  { id: "executive-male", name: "Scarlett", role: "Sales Manager", workerRole: "sales_manager", voiceName: "Emily", voiceId: "uc7PdIi19FG6Iu2Iqkdc", photo: "/jarvis-avatars/newscarlett.png", fallbackPhoto: "/jarvis-avatars/Scarlett.png" },
  { id: "future-male", name: "Sophia", role: "Research Analyst", workerRole: "research_analyst", voiceName: "Alice", voiceId: "Xb7hH8MSUJpSbSDYk0k2", photo: "/jarvis-avatars/newsophia.png", fallbackPhoto: "/jarvis-avatars/Sophia.png" },
  { id: "property-female", name: "Sarah", role: "Property Assistant", workerRole: "property_manager", voiceName: "Tiffany - Warm, Conversational Narrator", voiceId: "6fLd3vCll0LutxnciLI8", photo: "/jarvis-avatars/Sarah.png", fallbackPhoto: "/jarvis-avatars/Victoria.png" },
  { id: "customer-service", name: "Rebecca", role: "Customer Service", workerRole: "customer_service", photo: "/jarvis-avatars/customersupport1.png", fallbackPhoto: "/jarvis-avatars/Victoria.png" },
]);
export const isFounderPilot = (user) => String(user?.email || "").trim().toLowerCase() === PILOT_EMAIL;
export const getPilotAgentsForUser = (user, defaultAgents) => isFounderPilot(user) ? PILOT_AGENTS : defaultAgents;
export const getPilotVoiceForAgent = (agentId, user) => isFounderPilot(user) ? PILOT_AGENTS.find(agent => agent.id === agentId)?.voiceId || null : null;
