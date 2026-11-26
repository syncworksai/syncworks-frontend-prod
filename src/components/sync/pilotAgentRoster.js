// Founder-only presentation mapping. Backend worker permissions and dispatch remain authoritative.
export const PILOT_EMAIL = "jacoblord7@outlook.com";
export const PILOT_AGENTS = Object.freeze([
  { id: "executive-female", name: "Sydney", role: "Chief of Staff", workerRole: "chief_of_staff", voiceName: "Terri - Conversational Australian", voiceId: "3F0Z2rlB8b72i7fhQVJ1", photo: "/jarvis-avatars/newvictoria.png", fallbackPhoto: "/jarvis-avatars/Victoria.png" },
  { id: "technology-research", name: "Yasmine", role: "Technology & Competitive Research", workerRole: "technology_research", voiceName: "Monika Sogam", voiceId: "C3aqZfd4M0h7Ys5tWGIS", photo: "/jarvis-avatars/yasmine.png" },
  { id: "future-female", name: "Naomi", role: "Marketing Manager", workerRole: "social_media_marketing", voiceName: "Laura", voiceId: "FGY2WhTYpPnrIDTdsKH5", photo: "/jarvis-avatars/naomi.png", fallbackPhoto: "/jarvis-avatars/Elizabeth.png" },
  { id: "executive-assistant", name: "Christy", role: "Executive Assistant", workerRole: "executive_assistant", voiceName: "Huda", voiceId: "HHJcozd8AgLT2VmACyDV", photo: "/jarvis-avatars/christy2.png" },
  { id: "business-manager", name: "Whitney", role: "Business Operations", workerRole: "business_manager", voiceName: "Nik - Friendly and informational", voiceId: "NpLMBUIyEqztA0S4OsRV", photo: "/jarvis-avatars/whitney.png", fallbackPhoto: "/jarvis-avatars/Elizabeth.png" },
  { id: "executive-male", name: "Olivia", role: "Sales Manager", workerRole: "sales_manager", voiceName: "Katie - E-Learning & Podcast Host", voiceId: "YyRJWuwyhKdMZRRnm464", photo: "/jarvis-avatars/olivia.png", fallbackPhoto: "/jarvis-avatars/Scarlett.png" },
  { id: "customer-service", name: "Rebecca", role: "Customer Service", workerRole: "customer_service", voiceName: "Veda Sky", voiceId: "PhGlcxxnwzm7i7nwf0Wo", photo: "/jarvis-avatars/customersupport1.png", fallbackPhoto: "/jarvis-avatars/Victoria.png" },
  { id: "quality-assurance", name: "Kylee", role: "Quality Assurance", workerRole: "quality_assurance", voiceName: "Bella", voiceId: "hpp4J3VqNfWAUOO0d1Us", photo: "/jarvis-avatars/kylee.png" },
  { id: "future-male", name: "Sophia", role: "Strategic Research", workerRole: "research_analyst", voiceName: "Alice", voiceId: "Xb7hH8MSUJpSbSDYk0k2", photo: "/jarvis-avatars/newsophia2.png", fallbackPhoto: "/jarvis-avatars/Sophia.png" },
  { id: "property-female", name: "Sarah", role: "Property Assistant", workerRole: "property_manager", voiceName: "Tiffany - Warm, Conversational Narrator", voiceId: "6fLd3vCll0LutxnciLI8", photo: "/jarvis-avatars/Sarah.png", fallbackPhoto: "/jarvis-avatars/Victoria.png" },
  { id: "accounting-female", name: "Finance", role: "Accounting & Finance", workerRole: "accounting_finance", voiceName: "Mel", voiceId: "S4nguEX1VTAu3fNbnGzT", photo: "/jarvis-avatars/Charlotte.png", fallbackPhoto: "/jarvis-avatars/elizabeth.jpeg" },
  { id: "trading-strategy", name: "Axe", role: "Trading & Market Strategy", workerRole: "trading_strategy", voiceName: "John - Real Estate Agent", voiceId: "CqwRTo1yvjqk6u1iJp1j", photo: "/jarvis-avatars/bobby.png" },
]);
export const isFounderPilot = (user) => String(user?.email || "").trim().toLowerCase() === PILOT_EMAIL;
export const getPilotAgentsForUser = (user, defaultAgents) => isFounderPilot(user) ? PILOT_AGENTS : defaultAgents;
export const getPilotVoiceForAgent = (agentId, user) => isFounderPilot(user) ? PILOT_AGENTS.find(agent => agent.id === agentId)?.voiceId || null : null;
