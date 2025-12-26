if (!window.__snippingActive) {
    window.__snippingActive = true;
  
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.2);
      cursor: crosshair;
      z-index: 999999;
    `;
    document.body.appendChild(overlay);
  
    const box = document.createElement("div");
    box.style.cssText = `
      position: absolute;
      border: 2px dashed #fff;
      background: rgba(255,255,255,0.2);
    `;
    overlay.appendChild(box);
  
    let startX = null;
    let startY = null;
  
    overlay.onmousedown = (e) => {
      startX = e.clientX;
      startY = e.clientY;
      box.style.left = startX + "px";
      box.style.top = startY + "px";
    };
  
    overlay.onmousemove = (e) => {
      if (startX === null) return;
  
      box.style.left = Math.min(startX, e.clientX) + "px";
      box.style.top = Math.min(startY, e.clientY) + "px";
      box.style.width = Math.abs(e.clientX - startX) + "px";
      box.style.height = Math.abs(e.clientY - startY) + "px";
    };
  
    overlay.onmouseup = () => {
      const coords = {
        x: box.offsetLeft,
        y: box.offsetTop,
        width: box.offsetWidth,
        height: box.offsetHeight,
        scale: window.devicePixelRatio
      };
  
      document.body.removeChild(overlay);
      window.__snippingActive = false;
      
      // wait for DOM to repaint (CRITICAL)
      requestAnimationFrame(() => {
        setTimeout(() => {
          chrome.runtime.sendMessage({
            action: "captureFull",
            coords
          });
        }, 0);
      });
      
    };
  }
  