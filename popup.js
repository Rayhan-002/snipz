document.getElementById("snip").onclick = () => {
    chrome.runtime.sendMessage({ action: "startSnip" });
  };
  