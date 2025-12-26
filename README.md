# Chrome Snipping Tool Extension 🖌️

![License](https://img.shields.io/badge/License-MIT-green.svg) ![Chrome](https://img.shields.io/badge/Platform-Chrome-blue.svg)

A **lightweight Chrome extension** for capturing, editing, and annotating screenshots directly in the browser. Inspired by the Windows Snipping Tool, it allows users to snip a selected area, annotate it, and download or copy the image.  

---

## Table of Contents
- [Features](#features)  
- [Tech Stack](#tech-stack)  
- [Folder Structure](#folder-structure)  
- [Usage](#usage)  
- [Planned Enhancements](#planned-enhancements)  
- [License](#license)  

---

## Features ✅

### 1. Screenshot Capture
- Capture a **selected area** of the current tab.
- Works on most web pages (excluding `chrome://` and extension pages).
- Uses Chrome MV3 `chrome.scripting.executeScript` API for content injection.

### 2. Preview & Editing Panel
- Opens a **popup editor** (`preview.html`) after capture.
- Displays the snipped image on a **canvas**.
- Toolbar with interactive options:
  - **Download** and **Copy** image
  - **Draw** freehand lines
  - **Line** tool
  - **Arrow** tool
  - **Crop** tool
  - **Undo / Redo**
  - **Clear all edits**
  - Change **color** and **brush size**

### 3. Interactive Drawing & Annotation
- Objects include **freehand paths**, **lines**, and **arrows**.
- Each object has:
  - **Resizable handles** (green squares)
  - **Rotation handle** (orange circle above object)
- Handles appear **only on selected objects**.
- Undo/redo functionality for all objects and crop.

### 4. Cropping
- Free-form crop area drawing.
- Adjust crop area **before applying**.
- Apply crop to **update base image**, preserving history.

### 5. Toolbar Enhancements
- Selected tool is **highlighted** for clarity.
- Toolbar is **draggable** anywhere in the editor.
- Brush color and size can be adjusted dynamically.

---

## Tech Stack 🛠️
- **Chrome Extensions MV3**
- **HTML / CSS / JavaScript**
- **Canvas API** for drawing and editing
- **Chrome APIs**: `scripting`, `downloads`, `clipboardWrite`

---

## Folder Structure 📂

snipping-tool-extension/
- background.js      # Handles capture and messaging
- content.js         # Injects snipping overlay into the page
- popup.html         # Toolbar to trigger snip
- popup.js           # Popup button logic
- preview.html       # Editor UI for captured image
- preview.js         # Canvas drawing, annotation, crop, rotation
- manifest.json      # Chrome extension manifest
- README.md          # Project documentation


