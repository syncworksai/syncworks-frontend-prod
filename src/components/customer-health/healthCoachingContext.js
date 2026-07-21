// src/components/customer-health/healthCoachingContext.js

export const HEALTH_COACHING_CONTEXT_KEY = "sw_customer_health_coaching_context_v1";
export const HEALTH_SAVED_GYMS_KEY = "sw_customer_health_saved_gyms_v1";
export const HEALTH_MEASUREMENT_SETTINGS_KEY = "sw_customer_health_measurement_settings_v1";

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function readLocalJson(key, fallback) {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key, value) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Coaching context persistence must never block Health.
  }
}

export function defaultSavedGyms() {
  return [
    {
      id: "home",
      name: "Home",
      type: "home",
      active: true,
      equipment: ["Bodyweight"],
      dumbbell_max_lb: "",
      notes: "",
      last_used_at: "",
    },
  ];
}

export function defaultMeasurementSettings() {
  return {
    weight: { enabled: true, frequency_days: 7, last_logged_at: "" },
    waist: { enabled: true, frequency_days: 14, last_logged_at: "" },
    progress_photos: { enabled: true, frequency_days: 30, last_logged_at: "" },
    blood_pressure: {
      enabled: false,
      frequency_days: 7,
      last_logged_at: "",
      entry_mode: "manual",
    },
    resting_heart_rate: {
      enabled: false,
      frequency_days: 7,
      last_logged_at: "",
      entry_mode: "manual",
    },
  };
}

export function defaultHealthCoachingContext() {
  return {
    version: 1,
    updated_at: new Date().toISOString(),
    identity: {
      primary_goal: "General fitness",
      secondary_goals: [],
      goal_detail: "",
      target_weight: "",
      target_date: "",
      experience: "Beginner",
      training_days: "3",
      preferred_session_minutes: "30",
    },
    coaching_preferences: {
      audio_mode: "essential",
      voice_preference: "female",
      voice_locale_preference: "en-AU",
      coaching_tone: "balanced",
      motivation_frequency: "occasional",
      explanation_detail: "standard",
      ask_before_changes: true,
      spoken_change_proposals: true,
      captions_enabled: true,
    },
    nutrition_preferences: {
      allergies: [],
      intolerances: [],
      dietary_preferences: [],
      disliked_foods: [],
      weekly_food_budget: "",
      household_size: "1",
      cooking_time_minutes: "",
      preferred_stores: [],
      preferred_restaurants: [],
    },
    health_constraints: {
      active_pain_areas: [],
      resolved_pain_areas: [],
      limitations: "",
      avoid_movements: "",
      medical_clearance: "Not needed",
    },
    current_location: {
      location_id: "home",
      location_name: "Home",
      location_type: "home",
      selected_at: "",
      equipment_override: [],
    },
    daily_state: {
      ymd: "",
      workout_status: "not_started",
      workout_location_id: "",
      protein_remaining: null,
      water_remaining: null,
      steps_remaining: null,
      missing_meals: [],
      next_best_action: "",
    },
    integration_status: {
      apple_health: "manual_available",
      google_fit: "manual_available",
      device_sync_message:
        "Automatic device linking is coming soon. Manual entry is available now.",
      sync_assistant_ready: true,
    },
    source_profile_updated_at: "",
  };
}

function mergeContext(base, saved) {
  const safeSaved = safeObject(saved);

  return {
    ...base,
    ...safeSaved,
    identity: { ...base.identity, ...safeObject(safeSaved.identity) },
    coaching_preferences: {
      ...base.coaching_preferences,
      ...safeObject(safeSaved.coaching_preferences),
    },
    nutrition_preferences: {
      ...base.nutrition_preferences,
      ...safeObject(safeSaved.nutrition_preferences),
      allergies: safeArray(safeSaved?.nutrition_preferences?.allergies),
      intolerances: safeArray(safeSaved?.nutrition_preferences?.intolerances),
      dietary_preferences: safeArray(
        safeSaved?.nutrition_preferences?.dietary_preferences
      ),
      disliked_foods: safeArray(safeSaved?.nutrition_preferences?.disliked_foods),
      preferred_stores: safeArray(
        safeSaved?.nutrition_preferences?.preferred_stores
      ),
      preferred_restaurants: safeArray(
        safeSaved?.nutrition_preferences?.preferred_restaurants
      ),
    },
    health_constraints: {
      ...base.health_constraints,
      ...safeObject(safeSaved.health_constraints),
      active_pain_areas: safeArray(
        safeSaved?.health_constraints?.active_pain_areas
      ),
      resolved_pain_areas: safeArray(
        safeSaved?.health_constraints?.resolved_pain_areas
      ),
    },
    current_location: {
      ...base.current_location,
      ...safeObject(safeSaved.current_location),
      equipment_override: safeArray(
        safeSaved?.current_location?.equipment_override
      ),
    },
    daily_state: {
      ...base.daily_state,
      ...safeObject(safeSaved.daily_state),
      missing_meals: safeArray(safeSaved?.daily_state?.missing_meals),
    },
    integration_status: {
      ...base.integration_status,
      ...safeObject(safeSaved.integration_status),
    },
  };
}

export function readHealthCoachingContext() {
  return mergeContext(
    defaultHealthCoachingContext(),
    readLocalJson(HEALTH_COACHING_CONTEXT_KEY, {})
  );
}

export function writeHealthCoachingContext(context) {
  const next = {
    ...mergeContext(defaultHealthCoachingContext(), context),
    updated_at: new Date().toISOString(),
  };

  writeLocalJson(HEALTH_COACHING_CONTEXT_KEY, next);
  return next;
}

export function readSavedGyms() {
  const saved = readLocalJson(HEALTH_SAVED_GYMS_KEY, defaultSavedGyms());
  return safeArray(saved).length ? safeArray(saved) : defaultSavedGyms();
}

export function writeSavedGyms(gyms) {
  const next = safeArray(gyms);
  writeLocalJson(
    HEALTH_SAVED_GYMS_KEY,
    next.length ? next : defaultSavedGyms()
  );
}

export function readMeasurementSettings() {
  const saved = safeObject(
    readLocalJson(HEALTH_MEASUREMENT_SETTINGS_KEY, {})
  );
  const defaults = defaultMeasurementSettings();
  const next = {};

  for (const [key, value] of Object.entries(defaults)) {
    next[key] = { ...value, ...safeObject(saved[key]) };
  }

  return next;
}

export function writeMeasurementSettings(settings) {
  const saved = safeObject(settings);
  const defaults = defaultMeasurementSettings();
  const next = {};

  for (const [key, value] of Object.entries(defaults)) {
    next[key] = { ...value, ...safeObject(saved[key]) };
  }

  writeLocalJson(HEALTH_MEASUREMENT_SETTINGS_KEY, next);
}

export function syncProfileIntoCoachingContext(profile = {}) {
  const current = readHealthCoachingContext();
  const safeProfile = safeObject(profile);

  return writeHealthCoachingContext({
    ...current,
    identity: {
      ...current.identity,
      primary_goal: safeProfile.primary_goal || current.identity.primary_goal,
      goal_detail: safeProfile.goal_detail || current.identity.goal_detail,
      target_weight: safeProfile.target_weight || current.identity.target_weight,
      experience: safeProfile.experience || current.identity.experience,
      training_days: safeProfile.training_days || current.identity.training_days,
      preferred_session_minutes:
        safeProfile.preferred_time ||
        current.identity.preferred_session_minutes,
    },
    coaching_preferences: {
      ...current.coaching_preferences,
      coaching_tone: String(
        safeProfile.coaching_intensity ||
          current.coaching_preferences.coaching_tone
      ).toLowerCase(),
    },
    health_constraints: {
      ...current.health_constraints,
      limitations:
        safeProfile.limitations || current.health_constraints.limitations,
      avoid_movements:
        safeProfile.avoid_movements ||
        current.health_constraints.avoid_movements,
      medical_clearance:
        safeProfile.medical_clearance ||
        current.health_constraints.medical_clearance,
    },
    source_profile_updated_at: new Date().toISOString(),
  });
}

export function ensureHealthCoachingContext(profile = {}) {
  const context = syncProfileIntoCoachingContext(profile);

  if (!readLocalJson(HEALTH_SAVED_GYMS_KEY, null)) {
    writeSavedGyms(defaultSavedGyms());
  }

  if (!readLocalJson(HEALTH_MEASUREMENT_SETTINGS_KEY, null)) {
    writeMeasurementSettings(defaultMeasurementSettings());
  }

  return context;
}
