let LAST_SNIP = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // 1️⃣ Start snipping
  if (msg.action === "startSnip") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;

      if (
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://")
      ) {
        console.error("Cannot inject into this page");
        return;
      }

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
    });
  }

  // 2️⃣ Capture and crop
  if (msg.action === "captureFull") {
    const { x, y, width, height, scale } = msg.coords;

    chrome.tabs.captureVisibleTab(
      sender.tab.windowId,
      { format: "png" },
      async (dataUrl) => {
        if (!dataUrl) return;

        const blob = await (await fetch(dataUrl)).blob();
        const bitmap = await createImageBitmap(blob);

        const canvas = new OffscreenCanvas(width * scale, height * scale);
        const ctx = canvas.getContext("2d");

        ctx.drawImage(
          bitmap,
          x * scale,
          y * scale,
          width * scale,
          height * scale,
          0,
          0,
          width * scale,
          height * scale
        );

        const croppedBlob = await canvas.convertToBlob({ type: "image/png" });

        const reader = new FileReader();
        reader.onload = () => {
          LAST_SNIP = reader.result;

          chrome.windows.create({
            url: chrome.runtime.getURL("preview.html"),
            type: "popup",
            width: 600,
            height: 500
          });
        };

        reader.readAsDataURL(croppedBlob);
      }
    );
  }

  // 3️⃣ Preview page requests image (FIXED PART)
  if (msg.action === "getLastSnip") {
    sendResponse(LAST_SNIP);
    return true; // 🔴 REQUIRED in MV3
  }
});
