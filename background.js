const MENU_ID = "quickapply-save-selection";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Save selection to QuickApply Clipboard",
    contexts: ["selection"]
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText) return;

  const { snippets = [] } = await chrome.storage.local.get("snippets");
  snippets.unshift({
    id: crypto.randomUUID(),
    title: info.selectionText.trim().slice(0, 48) || "Saved selection",
    value: info.selectionText.trim(),
    category: "Inbox",
    kind: "text",
    favorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceUrl: tab?.url || ""
  });
  await chrome.storage.local.set({ snippets });

  if (tab?.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});
