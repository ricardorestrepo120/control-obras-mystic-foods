const NOTIFIED_KEY = "mf_notified_pending_ids";

export const getProfileKey = email => `mf_profile_${email}`;

export const getProfile = email => {
  try { return JSON.parse(localStorage.getItem(getProfileKey(email)) ?? "{}"); }
  catch { return {}; }
};

export const setProfile = (email, data) =>
  localStorage.setItem(getProfileKey(email), JSON.stringify(data));

export const getNotifiedIds = () => {
  try { return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? "[]")); }
  catch { return new Set(); }
};

const saveNotifiedIds = ids =>
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids]));

export const markNotified = id => {
  const ids = getNotifiedIds();
  ids.add(id);
  saveNotifiedIds(ids);
};

// Marks all current checklist IDs as seen to avoid firing notifications on initial load
export const initNotifiedIds = projects => {
  const ids = getNotifiedIds();
  for (const p of projects) {
    for (const item of (p.checklist ?? [])) ids.add(item.id);
  }
  saveNotifiedIds(ids);
};

export const requestNotificationPermission = () => {
  if (!("Notification" in window)) return Promise.resolve(false);
  if (Notification.permission === "granted") return Promise.resolve(true);
  return Notification.requestPermission().then(p => p === "granted");
};

export const notify = (title, body) => {
  if (Notification.permission !== "granted") return;
  try { new Notification(title, { body, icon: "/favicon.ico" }); } catch { /* ignore */ }
};

// Called after each poll — fires notifications for newly assigned checklist items
export const checkAndNotify = (freshProjects, prevProjects, email) => {
  if (!email || !freshProjects.length || !prevProjects.length) return;
  const profile = getProfile(email);
  const userName = profile.name?.trim();
  if (!userName) return;
  if (Notification.permission !== "granted") return;

  const notified = getNotifiedIds();
  const prevMap = new Map(prevProjects.map(p => [p.id, p]));

  for (const fp of freshProjects) {
    const prevProj = prevMap.get(fp.id);
    const prevChecklistMap = new Map((prevProj?.checklist ?? []).map(c => [c.id, c]));

    for (const item of (fp.checklist ?? [])) {
      if (item.done) continue;
      if (notified.has(item.id)) continue;

      const prevItem = prevChecklistMap.get(item.id);
      const isNew = !prevItem;
      const assigneeChanged = prevItem && prevItem.assignee !== item.assignee;

      if ((isNew || assigneeChanged) && item.assignee === userName) {
        markNotified(item.id);
        notify(`Nuevo pendiente asignado: ${item.text}`, fp.name || "Sin nombre");
      }
    }
  }
};
