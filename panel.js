const DEFAULT_SNIPPETS = [];
const FILE_DB_NAME = "quickapply-files";
const FILE_STORE_NAME = "files";
const ALLOWED_FILE_EXTENSIONS = ["pdf", "doc", "docx"];

const state = { snippets: [], query: "", category: "All" };
const els = Object.fromEntries([
  "addButton", "uploadButton", "fileInput", "emptyAddButton", "searchInput", "categoryFilters", "resultCount",
  "snippetList", "emptyState", "editorDialog", "editorForm", "dialogTitle",
  "snippetId", "titleInput", "categoryInput", "customCategoryWrap",
  "customCategoryInput", "valueInput", "favoriteInput", "closeDialog",
  "cancelButton", "exportButton", "importButton", "importInput", "toast"
].map((id) => [id, document.getElementById(id)]));

async function initialize() {
  const stored = await chrome.storage.local.get("snippets");
  state.snippets = Array.isArray(stored.snippets) ? stored.snippets : DEFAULT_SNIPPETS;
  if (!stored.snippets) await persist();
  bindEvents();
  render();
}

function bindEvents() {
  els.addButton.addEventListener("click", () => openEditor());
  els.uploadButton.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", uploadFiles);
  els.emptyAddButton.addEventListener("click", () => openEditor());
  els.closeDialog.addEventListener("click", closeEditor);
  els.cancelButton.addEventListener("click", closeEditor);
  els.categoryInput.addEventListener("change", () => {
    els.customCategoryWrap.hidden = els.categoryInput.value !== "__custom";
  });
  els.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderList();
  });
  els.editorForm.addEventListener("submit", saveFromEditor);
  els.exportButton.addEventListener("click", exportSnippets);
  els.importButton.addEventListener("click", () => els.importInput.click());
  els.importInput.addEventListener("change", importSnippets);
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      els.searchInput.focus();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
      event.preventDefault();
      openEditor();
    }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.snippets) {
      state.snippets = changes.snippets.newValue || [];
      render();
    }
  });
}

function render() {
  renderCategories();
  renderList();
}

function categories() {
  return [...new Set(state.snippets.map((item) => item.category).filter(Boolean))].sort();
}

function renderCategories() {
  const options = ["All", "Favorites", ...categories()];
  if (!options.includes(state.category)) state.category = "All";
  els.categoryFilters.replaceChildren(...options.map((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip${state.category === category ? " active" : ""}`;
    button.textContent = category;
    button.addEventListener("click", () => {
      state.category = category;
      render();
    });
    return button;
  }));
}

function filteredSnippets() {
  return state.snippets
    .filter((item) => state.category === "All" || (state.category === "Favorites" ? item.favorite : item.category === state.category))
    .filter((item) => !state.query || `${item.title} ${item.value || ""} ${item.fileName || ""} ${item.category}`.toLowerCase().includes(state.query))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || new Date(b.updatedAt) - new Date(a.updatedAt));
}

function renderList() {
  const items = filteredSnippets();
  els.resultCount.textContent = `${items.length} saved item${items.length === 1 ? "" : "s"}`;
  els.emptyState.hidden = items.length > 0;
  els.snippetList.hidden = items.length === 0;
  els.snippetList.replaceChildren(...items.map(createCard));
}

function createCard(item) {
  const card = document.createElement("article");
  const isFile = item.kind === "file";
  card.className = `snippet-card${isFile ? " file-card" : ""}`;

  const top = document.createElement("div");
  top.className = "card-top";
  const heading = document.createElement("div");
  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = item.title;
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = item.category || "Uncategorized";
  heading.append(title, badge);
  const favorite = iconButton(item.favorite ? "★" : "☆", "favorite", () => toggleFavorite(item.id));
  favorite.classList.toggle("active", item.favorite);
  favorite.title = item.favorite ? "Remove from favorites" : "Add to favorites";
  top.append(heading, favorite);

  const preview = document.createElement("p");
  preview.className = "preview";
  preview.textContent = isFile ? item.fileName : item.value;

  const actions = document.createElement("div");
  actions.className = "card-actions";
  const primaryAction = document.createElement("button");
  primaryAction.type = "button";
  primaryAction.className = "copy-button";
  primaryAction.textContent = isFile ? "Download" : "Copy";
  primaryAction.addEventListener("click", () => isFile ? downloadFile(item) : copySnippet(item.value));
  const remove = iconButton("Delete", "delete", () => deleteSnippet(item.id));
  if (isFile) {
    const meta = document.createElement("p");
    meta.className = "file-meta";
    meta.textContent = `${fileTypeLabel(item.fileName)} · ${formatFileSize(item.fileSize)}`;
    actions.append(primaryAction, remove);
    card.append(top, preview, meta, actions);
    return card;
  }
  const edit = iconButton("Edit", "edit", () => openEditor(item));
  actions.append(primaryAction, edit, remove);

  card.append(top, preview, actions);
  return card;
}

function iconButton(text, className, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-button ${className}`;
  button.textContent = text;
  button.addEventListener("click", handler);
  return button;
}

function openEditor(item = null) {
  els.editorForm.reset();
  els.snippetId.value = item?.id || "";
  els.titleInput.value = item?.title || "";
  els.valueInput.value = item?.value || "";
  els.favoriteInput.checked = Boolean(item?.favorite);
  els.dialogTitle.textContent = item ? "Edit snippet" : "Add snippet";
  els.customCategoryWrap.hidden = true;

  const knownOptions = [...els.categoryInput.options].map((option) => option.value);
  if (item?.category && !knownOptions.includes(item.category)) {
    els.categoryInput.value = "__custom";
    els.customCategoryInput.value = item.category;
    els.customCategoryWrap.hidden = false;
  } else {
    els.categoryInput.value = item?.category || "Contact";
  }
  els.editorDialog.showModal();
  els.titleInput.focus();
}

function closeEditor() { els.editorDialog.close(); }

async function saveFromEditor(event) {
  event.preventDefault();
  const id = els.snippetId.value || crypto.randomUUID();
  const existing = state.snippets.find((item) => item.id === id);
  const category = els.categoryInput.value === "__custom"
    ? els.customCategoryInput.value.trim()
    : els.categoryInput.value;
  if (!category) return showToast("Enter a category name");

  const item = {
    id,
    title: els.titleInput.value.trim(),
    value: els.valueInput.value.trim(),
    category,
    favorite: els.favoriteInput.checked,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceUrl: existing?.sourceUrl || ""
  };
  state.snippets = existing
    ? state.snippets.map((snippet) => snippet.id === id ? item : snippet)
    : [item, ...state.snippets];
  await persist();
  closeEditor();
  showToast(existing ? "Snippet updated" : "Snippet saved");
}

async function toggleFavorite(id) {
  state.snippets = state.snippets.map((item) => item.id === id ? { ...item, favorite: !item.favorite, updatedAt: new Date().toISOString() } : item);
  await persist();
}

async function deleteSnippet(id) {
  const item = state.snippets.find((snippet) => snippet.id === id);
  if (!item || !confirm(`Delete “${item.title}”?`)) return;
  if (item.kind === "file") await deleteFileBlob(item.fileId);
  state.snippets = state.snippets.filter((snippet) => snippet.id !== id);
  await persist();
  showToast("Snippet deleted");
}

async function copySnippet(value) {
  await navigator.clipboard.writeText(value);
  showToast("Copied to clipboard");
}

function openFileDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FILE_DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(FILE_STORE_NAME, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withFileStore(mode, operation) {
  const db = await openFileDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILE_STORE_NAME, mode);
    const request = operation(transaction.objectStore(FILE_STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

async function uploadFiles(event) {
  const files = [...(event.target.files || [])];
  event.target.value = "";
  if (!files.length) return;

  const accepted = files.filter((file) => ALLOWED_FILE_EXTENSIONS.includes(file.name.split(".").pop()?.toLowerCase()));
  if (accepted.length !== files.length) showToast("Only PDF, DOC, and DOCX files are supported");
  if (!accepted.length) return;

  const uploadedItems = [];
  try {
    for (const file of accepted) {
      const fileId = crypto.randomUUID();
      await withFileStore("readwrite", (store) => store.put({ id: fileId, blob: file }));
      const now = new Date().toISOString();
      uploadedItems.push({
        id: crypto.randomUUID(), kind: "file", fileId,
        fileName: file.name, fileType: file.type, fileSize: file.size,
        title: file.name, value: "", category: "Documents", favorite: false,
        createdAt: now, updatedAt: now, sourceUrl: ""
      });
    }
    state.snippets = [...uploadedItems, ...state.snippets];
    await persist();
    showToast(`${uploadedItems.length} file${uploadedItems.length === 1 ? "" : "s"} uploaded`);
  } catch {
    showToast("Could not store one or more files");
  }
}

async function downloadFile(item) {
  try {
    const record = await withFileStore("readonly", (store) => store.get(item.fileId));
    if (!record?.blob) throw new Error("Missing file");
    const url = URL.createObjectURL(record.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = item.fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("File downloaded");
  } catch {
    showToast("This file is no longer available");
  }
}

async function deleteFileBlob(fileId) {
  if (!fileId) return;
  await withFileStore("readwrite", (store) => store.delete(fileId));
}

function fileTypeLabel(fileName = "") {
  return fileName.split(".").pop()?.toUpperCase() || "FILE";
}

function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

async function persist() {
  await chrome.storage.local.set({ snippets: state.snippets });
  render();
}

function exportSnippets() {
  const textSnippets = state.snippets.filter((item) => item.kind !== "file");
  const blob = new Blob([JSON.stringify({ version: 1, snippets: textSnippets }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `quickapply-snippets-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Text snippets exported");
}

async function importSnippets(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const incoming = Array.isArray(parsed) ? parsed : parsed.snippets;
    if (!Array.isArray(incoming)) throw new Error("Invalid format");
    const normalized = incoming.filter((item) => item.title && item.value).map((item) => ({
      id: item.id || crypto.randomUUID(),
      title: String(item.title),
      value: String(item.value),
      category: String(item.category || "Inbox"),
      kind: "text",
      favorite: Boolean(item.favorite),
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceUrl: String(item.sourceUrl || "")
    }));
    const byId = new Map([...state.snippets, ...normalized].map((item) => [item.id, item]));
    state.snippets = [...byId.values()];
    await persist();
    showToast(`${normalized.length} snippets imported`);
  } catch {
    showToast("Could not import that file");
  } finally {
    event.target.value = "";
  }
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1800);
}

initialize();
