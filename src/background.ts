chrome.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab?.id;
  if (tabId === undefined || (message !== "badge:on" && message !== "badge:off")) return;
  const enabled = message === "badge:on";
  void Promise.all([
    chrome.action.setBadgeBackgroundColor({ tabId, color: enabled ? "#25633a" : "#5c6069" }),
    chrome.action.setBadgeText({ tabId, text: enabled ? "ON" : "OFF" }),
  ]).catch(console.error);
});

chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status === "loading") {
    void chrome.action.setBadgeText({ tabId, text: "" }).catch(console.error);
  }
});
