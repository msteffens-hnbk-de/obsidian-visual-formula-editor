# Obsidian Visual Math Formula Editor (Community Plugin)

An intuitive, visual **KaTeX / LaTeX Formula Editor** for [Obsidian](https://obsidian.md).
Enables quick creation, previewing, and editing of mathematical formulas directly within your Obsidian notes.

---

## ✨ Features

- **Visual Symbol & Formula Catalog**:
  - Calculus & Operators (fractions, roots, exponents, integrals, sums, limits)
  - Greek Symbols ($\alpha, \beta, \gamma, \sigma, \Sigma, \Omega$)
- **Live KaTeX / MathJax Preview**:
  - Real-time rendering as you type
- **Click-to-Edit on Rendered Formulas**:
  - Hover over any rendered formula in your note: a subtle **"Σ Edit"** button appears!
  - Clicking it instantly loads the original formula into the editor and updates it in place.
- **Context Menu & Ribbon Icon**:
  - Sigma symbol in the left Obsidian ribbon
  - Right-click in editor -> *"Edit Formula (Visual Editor)"*
- **Keyboard Shortcuts**:
  - Default: `Mod + Shift + M` (Ctrl+Shift+M on Windows/Linux, Cmd+Shift+M on macOS)
- **Native Theme Design**:
  - Automatically matches any Obsidian theme using Obsidian CSS variables.

---

## 🚀 Quick Installation (In 1 Minute)

1. Download the ZIP archive via **"Download Vault-Ready ZIP"** or download **"main.js"** directly.
2. Navigate to your Obsidian vault directory on your computer:
   ```text
   <Your-Vault>/.obsidian/plugins/obsidian-visual-formula-editor/
   ```
   *(If the folder `.obsidian/plugins` does not exist, create it).*
3. Place the 3 files there:
   ```text
   <Your-Vault>/
   └── .obsidian/
       └── plugins/
           └── obsidian-visual-formula-editor/
               ├── manifest.json
               ├── main.js       <-- Compiled plugin bundle
               └── styles.css
   ```
4. Restart Obsidian (or go to `Settings -> Community plugins -> Reload installed plugins`).
5. Enable the toggle for **"Visual Math Formula Editor"**.
