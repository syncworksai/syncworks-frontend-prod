// src/components/requests/new-request/requestCategoryResolver.js

function safeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

function categoryId(category) {
  const value = Number(category?.id ?? category?.pk);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parentId(category) {
  const raw =
    category?.parent_id ??
    category?.parent ??
    category?.parentId ??
    null;

  if (raw && typeof raw === "object") return categoryId(raw);

  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value) {
  return normalize(value).replace(/\s+/g, "");
}

export function buildLeafCategoryIndex(rawCategories) {
  const categories = safeList(rawCategories).filter(
    (category) => category?.is_active !== false
  );

  const parentIds = new Set(
    categories.map(parentId).filter(Boolean)
  );

  const leaves = categories.filter((category) => {
    const id = categoryId(category);
    return id && !parentIds.has(id);
  });

  const byKey = new Map();
  const byName = new Map();
  const byCompact = new Map();

  leaves.forEach((category) => {
    const key = normalize(category?.key || category?.slug || "");
    const name = normalize(category?.name || category?.label || "");
    const path = normalize(
      category?.path ||
        category?.category_path ||
        category?.full_path ||
        ""
    );

    if (key) byKey.set(key, category);
    if (name) byName.set(name, category);

    [key, name, path].filter(Boolean).forEach((value) => {
      byCompact.set(compact(value), category);
    });
  });

  return { leaves, byKey, byName, byCompact };
}

export function resolveCatalogServiceCategory(service, categoryIndex) {
  if (!service || !categoryIndex) return null;

  const candidates = [
    service.key,
    service.categoryKey,
    service.label,
    `${service.categoryLabel || ""} ${service.label || ""}`,
  ]
    .map(normalize)
    .filter(Boolean);

  for (const candidate of candidates) {
    const direct =
      categoryIndex.byKey.get(candidate) ||
      categoryIndex.byName.get(candidate) ||
      categoryIndex.byCompact.get(compact(candidate));

    if (direct) return direct;
  }

  const serviceTerms = new Set(
    [
      service.key,
      service.label,
      ...(Array.isArray(service.searchTerms) ? service.searchTerms : []),
    ]
      .flatMap((value) => normalize(value).split(" "))
      .filter((word) => word.length >= 4)
  );

  let best = null;
  let bestScore = 0;

  categoryIndex.leaves.forEach((category) => {
    const haystack = normalize(
      `${category?.key || ""} ${category?.name || ""} ${
        category?.path || category?.category_path || ""
      }`
    );

    let score = 0;
    serviceTerms.forEach((term) => {
      if (haystack.includes(term)) score += 1;
    });

    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  });

  return bestScore >= 2 ? best : null;
}

export function attachResolvedCategory(service, categoryIndex) {
  const category = resolveCatalogServiceCategory(service, categoryIndex);

  if (!category) {
    return {
      ...service,
      categoryId: null,
      exactCategoryResolved: false,
      backendCategory: null,
    };
  }

  return {
    ...service,
    categoryId: categoryId(category),
    exactCategoryResolved: true,
    backendCategory: category,
    backendCategoryKey: category?.key || "",
    backendCategoryName: category?.name || "",
    backendCategoryPath:
      category?.path ||
      category?.category_path ||
      category?.full_path ||
      "",
  };
}
