const fs = require("fs");
const path = require("path");

const dataDir = path.resolve(__dirname, "../../.data");
const storePath = path.join(dataDir, "chat-demo-store.json");

let cachedStore;

function loadDemoStore() {
  if (cachedStore) {
    return cachedStore;
  }

  try {
    const raw = fs.readFileSync(storePath, "utf8");
    cachedStore = normalizeStore(JSON.parse(raw));
  } catch {
    cachedStore = normalizeStore({});
    saveDemoStore(cachedStore);
  }

  return cachedStore;
}

function saveDemoStore(store = cachedStore) {
  cachedStore = normalizeStore(store || {});
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(storePath, `${JSON.stringify(cachedStore, null, 2)}\n`);
}

function normalizeStore(store) {
  return {
    users: Array.isArray(store.users) ? store.users : [],
    conversations: Array.isArray(store.conversations) ? store.conversations : [],
    messages: store.messages && typeof store.messages === "object" ? store.messages : {}
  };
}

module.exports = {
  loadDemoStore,
  saveDemoStore
};
