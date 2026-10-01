/* ==========================================================================
   Obsidian Visual Math Formula Editor - Bundled main.js
   Ready-to-use for Obsidian Vaults (Desktop & Mobile)
   ========================================================================== */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// main.ts
var main_exports = {};
__export(main_exports, {
  FormulaEditorModal: () => FormulaEditorModal,
  MATH_DOM_SELECTOR: () => MATH_DOM_SELECTOR,
  default: () => VisualFormulaEditorPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  defaultMode: "block",
  enableFloatingHoverButton: false,
  // Standardmäßig aus, um störende Buttons an oberster Position oder im Read-Modus zu verhindern
  enableRibbonIcon: true,
  enableStatusBarItem: true,
  enableContextMenu: true,
  enableDirectClickEdit: true
};
function stripFormulaDelimiters(raw) {
  let s = (raw || "").replace(/Σ\s*(?:Bearbeiten|Edit)/gi, "").trim();
  if (s.startsWith("$$") && s.endsWith("$$") && s.length >= 4) {
    return s.slice(2, -2).trim();
  }
  if (s.startsWith("$") && s.endsWith("$") && s.length >= 2) {
    return s.slice(1, -1).trim();
  }
  return s;
}
var MATH_DOM_SELECTOR = "mjx-container, .math, .math-block, .math-inline, .cm-math, .cm-math-block, .katex, .MathJax, [data-formula-editor-latex]";
var VisualFormulaEditorPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "settings");
    __publicField(this, "floatingButtonEl", null);
    __publicField(this, "hoveredMathEl", null);
    __publicField(this, "hoveredFormulaData", null);
    __publicField(this, "hideButtonTimeout", null);
  }
  async onload() {
    console.log("[VisualFormulaEditorPlugin] Loaded successfully (v1.0.8 - Table Formula Edit & Native Cell Coexistence)");
    await this.loadSettings();
    if (this.settings.enableFloatingHoverButton) {
      this.initFloatingHoverButton();
    }
    if (this.settings.enableStatusBarItem) {
      const statusBarItem = this.addStatusBarItem();
      statusBarItem.createSpan({ text: "\u03A3 Formula Editor" });
      statusBarItem.title = "Open Visual Formula Editor (Shortcut: Mod+Shift+M)";
      statusBarItem.addClass("mod-clickable");
      statusBarItem.style.cursor = "pointer";
      statusBarItem.style.fontWeight = "500";
      statusBarItem.addEventListener("click", () => {
        this.openEditorFromCurrentContext();
      });
    }
    if (this.settings.enableRibbonIcon) {
      this.addRibbonIcon("sigma", "Open Formula Editor (Mod+Shift+M)", () => {
        this.openEditorFromCurrentContext();
      });
    }
    this.addCommand({
      id: "open-visual-formula-editor",
      name: "Open Visual Formula Editor (Edit current formula or insert new)",
      editorCallback: (editor, view) => {
        this.openEditorForView(editor, view);
      },
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "M" }]
    });
    this.addCommand({
      id: "insert-inline-math",
      name: "Insert Inline Formula ($...$)",
      editorCallback: (editor) => {
        new FormulaEditorModal(this.app, this, editor, "", false).open();
      },
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "I" }]
    });
    this.addCommand({
      id: "insert-block-math",
      name: "Insert Block Formula ($$...$$)",
      editorCallback: (editor) => {
        new FormulaEditorModal(this.app, this, editor, "", true).open();
      },
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "B" }]
    });
    if (this.settings.enableContextMenu) {
      this.registerEvent(
        this.app.workspace.on("editor-menu", (menu, editor) => {
          const selection = editor.getSelection();
          const cursor = editor.getCursor();
          const line = editor.getLine(cursor.line);
          const formulaMatch = this.detectFormulaUnderCursor(line, cursor.ch);
          menu.addItem((item) => {
            item.setTitle(formulaMatch ? "Edit Formula (Visual Editor)" : "Insert Formula (Visual Editor)").setIcon("sigma").onClick(() => {
              if (formulaMatch) {
                new FormulaEditorModal(
                  this.app,
                  this,
                  editor,
                  formulaMatch.latex,
                  formulaMatch.isBlock,
                  formulaMatch.range,
                  formulaMatch.latex,
                  void 0,
                  formulaMatch.raw
                ).open();
              } else if (selection) {
                new FormulaEditorModal(
                  this.app,
                  this,
                  editor,
                  selection,
                  selection.includes("\\\\") || selection.length > 30
                ).open();
              } else {
                new FormulaEditorModal(this.app, this, editor, "", true).open();
              }
            });
          });
        })
      );
    }
    if (this.settings.enableDirectClickEdit) {
      this.registerDomEvent(document, "click", (evt) => {
        var _a;
        const activeView = this.getActiveMarkdownView();
        if (!activeView || ((_a = activeView.getMode) == null ? void 0 : _a.call(activeView)) === "preview") return;
        const target = evt.target;
        if (!target) return;
        if (this.floatingButtonEl && this.floatingButtonEl.contains(target)) return;
        if (target.closest("table, .cm-table-widget, .table-wrapper, .table-editor, .markdown-rendered table")) {
          const directMath = target.closest(MATH_DOM_SELECTOR);
          if (!directMath) return;
        }
        const mathEl = this.getTopMathContainer(target);
        if (mathEl) {
          const formulaData = this.getFormulaFromMathElement(mathEl, activeView);
          if (formulaData && formulaData.latex && formulaData.latex.trim().length > 0) {
            evt.preventDefault();
            evt.stopPropagation();
            new FormulaEditorModal(
              this.app,
              this,
              activeView.editor,
              formulaData.latex,
              formulaData.isBlock,
              void 0,
              formulaData.latex,
              formulaData.range,
              formulaData.raw
            ).open();
          }
        }
      });
    }
    this.registerMarkdownPostProcessor((element, context) => {
      const allMath = Array.from(element.querySelectorAll(".math, .math-inline, .math-block, mjx-container, .katex"));
      const topMath = allMath.filter((el) => !allMath.some((p) => p !== el && p.contains(el)));
      if (topMath.length === 0) return;
      const sectionInfo = context && typeof context.getSectionInfo === "function" ? context.getSectionInfo(element) : null;
      const formulas = [];
      if (sectionInfo && sectionInfo.text) {
        const lines = sectionInfo.text.split("\n");
        const sectionText = lines.slice(sectionInfo.lineStart, sectionInfo.lineEnd + 1).join("\n");
        const mathRegex = /(\$\$[\s\S]*?\$\$|(?<![\$\\])\$(?!\$)([^\$\n]+?)(?<![\$\\])\$(?!\$))/g;
        let match;
        while ((match = mathRegex.exec(sectionText)) !== null) {
          const raw = match[0];
          const isBlock = raw.startsWith("$$");
          formulas.push({
            latex: isBlock ? raw.slice(2, -2).trim() : raw.slice(1, -1).trim(),
            isBlock,
            raw
          });
        }
      }
      topMath.forEach((topEl, idx) => {
        const f = formulas[idx];
        if (f) {
          topEl.setAttribute("data-formula-editor-latex", f.latex);
          topEl.setAttribute("data-formula-editor-block", String(f.isBlock));
          topEl.setAttribute("data-formula-editor-raw", f.raw);
        }
      });
    });
    this.addSettingTab(new FormulaEditorSettingTab(this.app, this));
  }
  onunload() {
    console.log("[VisualFormulaEditorPlugin] Unloaded");
    if (this.floatingButtonEl && this.floatingButtonEl.parentElement) {
      this.floatingButtonEl.remove();
    }
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  /**
   * Findet den echten Mathe-Container für ein beliebiges DOM-Element (schließt Tabellen und sonstige Widgets strikt aus)
   */
  getTopMathContainer(target) {
    if (!target) return null;
    if (target.closest("table, .cm-table-widget, .table-wrapper, .table-editor, .markdown-rendered table")) {
      const directMath = target.closest(MATH_DOM_SELECTOR);
      if (!directMath) {
        return null;
      }
      return directMath;
    }
    if (target.closest(".callout, .cm-callout, pre, code:not(.cm-math)")) {
      const directMath = target.closest(MATH_DOM_SELECTOR);
      if (!directMath) return null;
      return directMath;
    }
    let el = target.closest(MATH_DOM_SELECTOR);
    if (!el) {
      const embed = target.closest(".cm-embed-block");
      if (embed) {
        if (embed.classList.contains("cm-table-widget") || embed.querySelector("table")) {
          return null;
        }
        if (embed.classList.contains("cm-math-block")) {
          el = embed;
        } else {
          const innerMath = embed.querySelector(MATH_DOM_SELECTOR);
          if (innerMath) {
            el = innerMath;
          } else {
            return null;
          }
        }
      } else {
        return null;
      }
    }
    while (el && el.parentElement && !el.parentElement.matches("td, th, table, tr, tbody, thead")) {
      const parentMath = el.parentElement.closest(MATH_DOM_SELECTOR);
      if (parentMath && parentMath !== el) {
        el = parentMath;
      } else {
        break;
      }
    }
    return el;
  }
  /**
   * Gibt den aktuell aktiven MarkdownView zurück
   */
  getActiveMarkdownView() {
    const activeView = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    if (activeView) return activeView;
    const activeLeaf = this.app.workspace.activeLeaf;
    if (activeLeaf && activeLeaf.view instanceof import_obsidian.MarkdownView) {
      return activeLeaf.view;
    }
    const leaves = this.app.workspace.getLeavesOfType("markdown");
    if (leaves.length > 0 && leaves[0].view instanceof import_obsidian.MarkdownView) {
      return leaves[0].view;
    }
    return null;
  }
  /**
   * Initialisiert den schwebenden "Σ Bearbeiten" Button direkt an der Formel
   */
  initFloatingHoverButton() {
    const btn = document.createElement("div");
    btn.className = "formula-editor-floating-badge";
    btn.innerHTML = '<span style="color:#fbbf24;font-weight:bold;margin-right:4px;font-size:11px;">\u03A3</span> Edit';
    btn.title = "Edit formula in visual editor";
    btn.style.cssText = `
      position: fixed;
      display: none;
      z-index: 999999;
      background: var(--background-secondary-alt, #262626);
      color: var(--text-normal, #f4f4f5);
      border: 1px solid var(--interactive-accent, #7c3aed);
      border-radius: 4px;
      padding: 2px 7px;
      font-size: 11px;
      font-weight: 600;
      font-family: var(--font-ui, sans-serif);
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.35);
      align-items: center;
      user-select: none;
      pointer-events: auto;
      transition: background 0.15s ease;
    `;
    btn.addEventListener("mouseenter", () => {
      if (this.hideButtonTimeout) clearTimeout(this.hideButtonTimeout);
      btn.style.display = "inline-flex";
      btn.style.background = "var(--interactive-accent, #7c3aed)";
      btn.style.color = "#ffffff";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = "var(--background-secondary-alt, #262626)";
      btn.style.color = "var(--text-normal, #f4f4f5)";
      this.hideButton(true);
    });
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (this.hoveredMathEl) {
        this.openEditorFromTarget(this.hoveredMathEl);
        this.hideButton(true);
      }
    });
    document.body.appendChild(btn);
    this.floatingButtonEl = btn;
    this.registerDomEvent(document, "mouseover", (evt) => {
      var _a;
      const activeView = this.getActiveMarkdownView();
      if (!activeView || ((_a = activeView.getMode) == null ? void 0 : _a.call(activeView)) === "preview") {
        this.hideButton(true);
        return;
      }
      const target = evt.target;
      if (!target) return;
      if (btn.contains(target)) return;
      if (target.closest("table, .cm-table-widget, .table-wrapper, .table-editor")) {
        const directMath = target.closest(MATH_DOM_SELECTOR);
        if (!directMath) {
          this.hideButton(true);
          return;
        }
      }
      const mathEl = this.getTopMathContainer(target);
      if (mathEl) {
        const innerVisual = mathEl.querySelector("mjx-container, .math-block, .math-inline, .katex") || mathEl;
        const rect = innerVisual.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top >= 40 && rect.top <= window.innerHeight - 40) {
          if (this.hideButtonTimeout) clearTimeout(this.hideButtonTimeout);
          this.hoveredMathEl = mathEl;
          const top = rect.top - 24;
          const left = Math.max(12, rect.left);
          btn.style.top = `${top}px`;
          btn.style.left = `${left}px`;
          btn.style.display = "inline-flex";
        }
      } else {
        this.hideButton();
      }
    });
  }
  hideButton(immediate = false) {
    if (immediate) {
      if (this.floatingButtonEl) this.floatingButtonEl.style.display = "none";
      this.hoveredMathEl = null;
      this.hoveredFormulaData = null;
      return;
    }
    if (this.hideButtonTimeout) clearTimeout(this.hideButtonTimeout);
    this.hideButtonTimeout = setTimeout(() => {
      if (this.floatingButtonEl) {
        this.floatingButtonEl.style.display = "none";
      }
      this.hoveredMathEl = null;
      this.hoveredFormulaData = null;
    }, 200);
  }
  /**
   * Öffnet den Formeleditor aus der aktuellen Notiz (Cursor-basiert)
   */
  openEditorFromCurrentContext() {
    const activeView = this.getActiveMarkdownView();
    if (!activeView) {
      new import_obsidian.Notice("Bitte \xF6ffnen Sie zuerst eine Markdown-Notiz!");
      return;
    }
    this.openEditorForView(activeView.editor, activeView);
  }
  /**
   * Öffnet den Formeleditor für einen Editor
   */
  openEditorForView(editor, view) {
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    const formulaMatch = this.detectFormulaUnderCursor(line, cursor.ch);
    const selection = editor.getSelection();
    if (formulaMatch) {
      new FormulaEditorModal(
        this.app,
        this,
        editor,
        formulaMatch.latex,
        formulaMatch.isBlock,
        formulaMatch.range,
        formulaMatch.latex,
        void 0,
        formulaMatch.raw
      ).open();
      return;
    }
    if (selection && selection.trim().length > 0) {
      let selText = selection.trim();
      let isBlockSel = true;
      if (selText.startsWith("$$") && selText.endsWith("$$") && selText.length >= 4) {
        selText = selText.slice(2, -2).trim();
        isBlockSel = true;
      } else if (selText.startsWith("$") && selText.endsWith("$") && selText.length >= 2) {
        selText = selText.slice(1, -1).trim();
        isBlockSel = false;
      }
      new FormulaEditorModal(this.app, this, editor, selText, isBlockSel, void 0, selText).open();
      return;
    }
    const fullText = editor.getValue();
    const cursorOffset = editor.posToOffset(cursor);
    const foundNear = this.findFormulaAroundPos(fullText, cursorOffset);
    if (foundNear && cursorOffset >= foundNear.fromOffset && cursorOffset <= foundNear.toOffset) {
      new FormulaEditorModal(
        this.app,
        this,
        editor,
        foundNear.latex,
        foundNear.isBlock,
        void 0,
        foundNear.latex,
        {
          from: editor.offsetToPos(foundNear.fromOffset),
          to: editor.offsetToPos(foundNear.toOffset)
        },
        foundNear.raw
      ).open();
      return;
    }
    new FormulaEditorModal(this.app, this, editor, "", true).open();
  }
  /**
   * Öffnet den Editor für ein geklicktes Element.
   * Ermittelt IMMER die spezifische Formel dieses Elements.
   */
  openEditorFromTarget(mathEl) {
    const activeView = this.getActiveMarkdownView();
    const editor = activeView ? activeView.editor : void 0;
    const formulaData = this.getFormulaFromMathElement(mathEl, activeView);
    if (formulaData && formulaData.latex) {
      new FormulaEditorModal(
        this.app,
        this,
        editor,
        formulaData.latex,
        formulaData.isBlock,
        void 0,
        formulaData.latex,
        formulaData.range,
        formulaData.raw
      ).open();
      return;
    }
  }
  /**
   * Extrahiert die LaTeX-Formel direkt aus dem DOM (z. B. MathJax <annotation>, KaTeX MathML oder data-Attribute)
   */
  extractLatexFromDOM(mathEl) {
    if (!mathEl) return null;
    const attrLatex = mathEl.getAttribute("data-formula-editor-latex") || mathEl.getAttribute("data-tex") || mathEl.getAttribute("alt");
    if (attrLatex && attrLatex.trim()) {
      return stripFormulaDelimiters(attrLatex.trim());
    }
    const annotation = mathEl.querySelector('annotation[encoding*="tex"], annotation');
    if (annotation && annotation.textContent && annotation.textContent.trim()) {
      return stripFormulaDelimiters(annotation.textContent.trim());
    }
    const mml = mathEl.querySelector("mjx-assistive-mml, .katex-mathml");
    if (mml) {
      const ann = mml.querySelector("annotation");
      if (ann && ann.textContent && ann.textContent.trim()) {
        return stripFormulaDelimiters(ann.textContent.trim());
      }
    }
    const aria = mathEl.getAttribute("aria-label") || mathEl.getAttribute("title");
    if (aria && aria.trim().startsWith("$") && aria.trim().endsWith("$")) {
      return stripFormulaDelimiters(aria.trim());
    }
    return null;
  }
  /**
   * Findet eine Formel innerhalb einer gerenderten Tabelle im Markdown-Dokument
   */
  findTableFormula(editor, docText, mathEl, tableEl) {
    const domLatex = this.extractLatexFromDOM(mathEl);
    const cleanDomLatex = domLatex ? stripFormulaDelimiters(domLatex) : null;
    const cellEl = mathEl.closest("td, th");
    const rowEl = mathEl.closest("tr");
    const colIdx = cellEl ? cellEl.cellIndex : -1;
    const rowIdx = rowEl ? rowEl.rowIndex : -1;
    const isHeader = Boolean(mathEl.closest("th, thead"));
    const cmView = editor.cm;
    let tableOffset = -1;
    if (cmView && typeof cmView.posAtDOM === "function") {
      try {
        const embedEl = mathEl.closest(".cm-embed-block") || tableEl;
        const pos = cmView.posAtDOM(embedEl);
        if (typeof pos === "number" && !isNaN(pos)) {
          tableOffset = pos;
        }
      } catch (e) {
      }
    }
    const lines = docText.split("\n");
    const tables = [];
    let curTable = null;
    for (let l = 0; l < lines.length; l++) {
      const lineText = lines[l];
      const isTableRow = lineText.includes("|") && lineText.trim().length > 0;
      if (isTableRow) {
        if (!curTable) {
          curTable = {
            startLine: l,
            endLine: l,
            headerLine: l,
            separatorLine: -1,
            dataLines: [],
            allLines: [l]
          };
        } else {
          curTable.endLine = l;
          curTable.allLines.push(l);
          if (curTable.separatorLine === -1 && /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(lineText.trim())) {
            curTable.separatorLine = l;
          } else {
            curTable.dataLines.push(l);
          }
        }
      } else {
        if (curTable) {
          tables.push(curTable);
          curTable = null;
        }
      }
    }
    if (curTable) {
      tables.push(curTable);
    }
    if (tables.length === 0) return null;
    let targetTable = null;
    if (tableOffset >= 0) {
      const tablePos = editor.offsetToPos(tableOffset);
      targetTable = tables.find((t) => tablePos.line >= t.startLine - 2 && tablePos.line <= t.endLine + 2) || null;
    }
    if (!targetTable) {
      if (cleanDomLatex) {
        targetTable = tables.find((t) => {
          return t.allLines.some((lineIdx) => lines[lineIdx].includes(cleanDomLatex));
        }) || null;
      }
    }
    if (!targetTable) {
      const viewContainer = document.querySelector(".workspace-leaf.mod-active") || document.body;
      const allDomTables = Array.from(viewContainer.querySelectorAll("table, .cm-table-widget"));
      const tIdx = allDomTables.indexOf(tableEl);
      if (tIdx >= 0 && tIdx < tables.length) {
        targetTable = tables[tIdx];
      } else {
        targetTable = tables[0];
      }
    }
    if (!targetTable) return null;
    let targetLineNum = -1;
    if (isHeader) {
      targetLineNum = targetTable.headerLine;
    } else if (rowIdx >= 1 && targetTable.dataLines.length > 0) {
      const dataIdx = Math.min(rowIdx - 1, targetTable.dataLines.length - 1);
      targetLineNum = targetTable.dataLines[dataIdx];
    }
    const inlineMathRegex = /(?<![\$\\])\$(?!\$)([^\$\n]+?)(?<![\$\\])\$(?!\$)/g;
    const searchLineForFormula = (lineNum) => {
      const lineStr = lines[lineNum];
      if (!lineStr) return null;
      if (colIdx >= 0) {
        const cellParts = [];
        let inCell = false;
        let cellStart = 0;
        let cellContent = "";
        for (let idx = 0; idx < lineStr.length; idx++) {
          const char = lineStr[idx];
          const prevChar = idx > 0 ? lineStr[idx - 1] : "";
          if (char === "|" && prevChar !== "\\") {
            if (inCell) {
              cellParts.push({ text: cellContent, startCh: cellStart, endCh: idx });
              cellContent = "";
            }
            inCell = true;
            cellStart = idx + 1;
          } else if (inCell) {
            cellContent += char;
          }
        }
        if (inCell && cellContent.trim().length > 0) {
          cellParts.push({ text: cellContent, startCh: cellStart, endCh: lineStr.length });
        }
        if (colIdx < cellParts.length) {
          const targetCell = cellParts[colIdx];
          let m2;
          inlineMathRegex.lastIndex = 0;
          while ((m2 = inlineMathRegex.exec(targetCell.text)) !== null) {
            const formulaLatex = m2[1].trim();
            if (!cleanDomLatex || formulaLatex === cleanDomLatex || formulaLatex.replace(/\s+/g, "") === cleanDomLatex.replace(/\s+/g, "")) {
              const startCh = targetCell.startCh + m2.index;
              const endCh = startCh + m2[0].length;
              return {
                latex: formulaLatex,
                isBlock: false,
                range: {
                  from: { line: lineNum, ch: startCh },
                  to: { line: lineNum, ch: endCh }
                },
                raw: m2[0]
              };
            }
          }
        }
      }
      let m;
      inlineMathRegex.lastIndex = 0;
      while ((m = inlineMathRegex.exec(lineStr)) !== null) {
        const formulaLatex = m[1].trim();
        if (!cleanDomLatex || formulaLatex === cleanDomLatex || formulaLatex.replace(/\s+/g, "") === cleanDomLatex.replace(/\s+/g, "")) {
          return {
            latex: formulaLatex,
            isBlock: false,
            range: {
              from: { line: lineNum, ch: m.index },
              to: { line: lineNum, ch: m.index + m[0].length }
            },
            raw: m[0]
          };
        }
      }
      return null;
    };
    if (targetLineNum >= 0) {
      const match = searchLineForFormula(targetLineNum);
      if (match) return match;
    }
    for (const lNum of targetTable.allLines) {
      if (lNum === targetTable.separatorLine) continue;
      const match = searchLineForFormula(lNum);
      if (match) return match;
    }
    if (cleanDomLatex) {
      const esc = cleanDomLatex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const flexRegex = new RegExp("\\$([^$\\n]*?" + esc + "[^$\\n]*?)\\$", "g");
      let fm;
      while ((fm = flexRegex.exec(docText)) !== null) {
        const linePos = editor.offsetToPos(fm.index);
        const lineText = lines[linePos.line] || "";
        if (lineText.includes("|")) {
          return {
            latex: fm[1].trim(),
            isBlock: false,
            range: {
              from: editor.offsetToPos(fm.index),
              to: editor.offsetToPos(fm.index + fm[0].length)
            },
            raw: fm[0]
          };
        }
      }
    }
    return null;
  }
  /**
   * Ermittelt die exakte mathematische Formel aus einem beliebigen Mathe-Container.
   * 0. Tabellen-Formeln in Live Preview
   * 1. Zeilenbasierte CodeMirror 6 Erkennung für Inline-Formeln
   * 2. Block-Erkennung für display-math
   */
  getFormulaFromMathElement(mathEl, view) {
    var _a, _b, _c, _d;
    const editor = view == null ? void 0 : view.editor;
    const docText = editor ? editor.getValue() : "";
    const tableEl = mathEl.closest("table, .cm-table-widget, .table-wrapper, .table-editor, .markdown-rendered table");
    if (tableEl && editor && docText) {
      const tableFormula = this.findTableFormula(editor, docText, mathEl, tableEl);
      if (tableFormula) {
        return tableFormula;
      }
    }
    const lineEl = mathEl.closest(".cm-line");
    if (editor && lineEl) {
      const cmView = editor.cm;
      if (cmView && typeof cmView.posAtDOM === "function") {
        try {
          const lineOffset = cmView.posAtDOM(lineEl);
          if (typeof lineOffset === "number" && !isNaN(lineOffset)) {
            const linePos = editor.offsetToPos(lineOffset);
            const lineNum = linePos.line;
            const lineContent = editor.getLine(lineNum);
            const inlineRegex = /(?<![\$\\])\$(?!\$)([^\$\n]+?)(?<![\$\\])\$(?!\$)/g;
            const formulasOnLine = [];
            let im;
            while ((im = inlineRegex.exec(lineContent)) !== null) {
              formulasOnLine.push({
                latex: im[1].trim(),
                start: im.index,
                end: im.index + im[0].length,
                raw: im[0]
              });
            }
            if (formulasOnLine.length > 0) {
              const mathOnLine = Array.from(lineEl.querySelectorAll("mjx-container, .math-inline, .cm-math")).filter((el, idx, arr) => !arr.some((p) => p !== el && p.contains(el)));
              let mathIdx = mathOnLine.findIndex((el) => el === mathEl || el.contains(mathEl) || mathEl.contains(el));
              if (mathIdx < 0) mathIdx = 0;
              const chosen = formulasOnLine[Math.min(mathIdx, formulasOnLine.length - 1)];
              return {
                latex: chosen.latex,
                isBlock: false,
                range: {
                  from: { line: lineNum, ch: chosen.start },
                  to: { line: lineNum, ch: chosen.end }
                },
                raw: chosen.raw
              };
            }
            const blockRegex = /\$\$([\s\S]*?)\$\$/g;
            const bm = blockRegex.exec(lineContent);
            if (bm) {
              return {
                latex: bm[1].trim(),
                isBlock: true,
                range: {
                  from: { line: lineNum, ch: bm.index },
                  to: { line: lineNum, ch: bm.index + bm[0].length }
                },
                raw: bm[0]
              };
            }
          }
        } catch (e) {
        }
      }
    }
    const isBlockEl = mathEl.classList.contains("math-block") || mathEl.classList.contains("cm-math-block") || Boolean(mathEl.closest(".cm-math-block, .math-block"));
    if (editor && docText) {
      const allFormulas = this.extractAllFormulasFromText(docText);
      if (isBlockEl) {
        const blockFormulas = allFormulas.filter((f) => f.isBlock);
        if (blockFormulas.length === 1) {
          const f = blockFormulas[0];
          return {
            latex: f.latex,
            isBlock: true,
            range: {
              from: editor.offsetToPos((_a = f.fromOffset) != null ? _a : 0),
              to: editor.offsetToPos((_b = f.toOffset) != null ? _b : 0)
            },
            raw: f.raw
          };
        }
        const viewContainer = (view == null ? void 0 : view.contentEl) || (editor == null ? void 0 : editor.containerEl) || document.querySelector(".workspace-leaf.mod-active");
        if (viewContainer) {
          const allBlockDom = Array.from(viewContainer.querySelectorAll(".cm-math-block, .math-block")).filter((el, idx, arr) => !arr.some((p) => p !== el && p.contains(el)));
          const bIdx = allBlockDom.findIndex((el) => el === mathEl || el.contains(mathEl) || mathEl.contains(el));
          if (bIdx >= 0 && bIdx < blockFormulas.length) {
            const f = blockFormulas[bIdx];
            return {
              latex: f.latex,
              isBlock: true,
              range: {
                from: editor.offsetToPos((_c = f.fromOffset) != null ? _c : 0),
                to: editor.offsetToPos((_d = f.toOffset) != null ? _d : 0)
              },
              raw: f.raw
            };
          }
        }
      }
      const cmView = editor.cm;
      if (cmView && typeof cmView.posAtCoords === "function") {
        const rect = mathEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const p = cmView.posAtCoords({ x: rect.left + 8, y: rect.top + 8 });
          const offset = typeof p === "number" ? p : p == null ? void 0 : p.pos;
          if (typeof offset === "number") {
            const found = this.findFormulaAroundPos(docText, offset);
            if (found) {
              return {
                latex: found.latex,
                isBlock: found.isBlock,
                range: {
                  from: editor.offsetToPos(found.fromOffset),
                  to: editor.offsetToPos(found.toOffset)
                },
                raw: found.raw
              };
            }
          }
        }
      }
    }
    return null;
  }
  /**
   * Sucht im gesamten Dokumenttext nach der Formel an oder nahe einer Offset-Position
   */
  findFormulaAroundPos(docText, pos) {
    if (typeof pos !== "number" || isNaN(pos)) return null;
    const blockRegex = /\$\$([\s\S]*?)\$\$/g;
    let match;
    while ((match = blockRegex.exec(docText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (pos >= start - 8 && pos <= end + 8) {
        return {
          latex: match[1].trim(),
          isBlock: true,
          fromOffset: start,
          toOffset: end,
          raw: match[0]
        };
      }
    }
    const inlineRegex = /(?<![\$\\])\$(?!\$)([^\$\n]+?)(?<![\$\\])\$(?!\$)/g;
    while ((match = inlineRegex.exec(docText)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (pos >= start - 4 && pos <= end + 4) {
        return {
          latex: match[1].trim(),
          isBlock: false,
          fromOffset: start,
          toOffset: end,
          raw: match[0]
        };
      }
    }
    return null;
  }
  /**
   * Erkennt $...$ oder $$...$$ an der aktuellen Cursorposition
   */
  detectFormulaUnderCursor(line, ch) {
    const blockRegex = /\$\$([\s\S]*?)\$\$/g;
    let match;
    while ((match = blockRegex.exec(line)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (ch >= start && ch <= end) {
        return {
          latex: match[1].trim(),
          isBlock: true,
          range: { fromCh: start, toCh: end },
          raw: match[0]
        };
      }
    }
    const inlineRegex = /(?<![\$\\])\$(?!\$)([^\$\n]+?)(?<![\$\\])\$(?!\$)/g;
    while ((match = inlineRegex.exec(line)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (ch >= start && ch <= end) {
        return {
          latex: match[1].trim(),
          isBlock: false,
          range: { fromCh: start, toCh: end },
          raw: match[0]
        };
      }
    }
    return null;
  }
  /**
   * Extrahiert alle Formeln aus einem Notiztext samt Positionen
   */
  extractAllFormulasFromText(text) {
    const results = [];
    const blockRegex = /\$\$([\s\S]*?)\$\$/g;
    let bMatch;
    const blockRanges = [];
    while ((bMatch = blockRegex.exec(text)) !== null) {
      const raw = bMatch[0];
      const start = bMatch.index;
      const end = start + raw.length;
      blockRanges.push({ start, end });
      results.push({
        latex: bMatch[1].trim(),
        isBlock: true,
        fromOffset: start,
        toOffset: end,
        raw
      });
    }
    const inlineRegex = /(?<![\$\\])\$(?!\$)([^\$\n]+?)(?<![\$\\])\$(?!\$)/g;
    let iMatch;
    while ((iMatch = inlineRegex.exec(text)) !== null) {
      const start = iMatch.index;
      const end = start + iMatch[0].length;
      const inBlock = blockRanges.some((b) => start >= b.start && end <= b.end);
      if (!inBlock) {
        results.push({
          latex: iMatch[1].trim(),
          isBlock: false,
          fromOffset: start,
          toOffset: end,
          raw: iMatch[0]
        });
      }
    }
    results.sort((a, b) => {
      var _a, _b;
      return ((_a = a.fromOffset) != null ? _a : 0) - ((_b = b.fromOffset) != null ? _b : 0);
    });
    return results;
  }
};
var FormulaEditorModal = class extends import_obsidian.Modal {
  constructor(app, plugin, editor, initialLatex = "", initialIsBlock = true, replaceRange, originalLatex, formulaRange, originalRaw) {
    super(app);
    __publicField(this, "plugin");
    __publicField(this, "editor");
    __publicField(this, "latex");
    __publicField(this, "isBlock");
    __publicField(this, "formulaRange");
    __publicField(this, "replaceRange");
    __publicField(this, "originalLatex");
    __publicField(this, "originalRaw");
    __publicField(this, "activeTab", "snippets");
    // DOM Elemente
    __publicField(this, "previewEl");
    __publicField(this, "textareaEl");
    __publicField(this, "modeDescEl");
    __publicField(this, "inlineBtnEl");
    __publicField(this, "blockBtnEl");
    this.plugin = plugin;
    this.editor = editor;
    const cleanedLatex = stripFormulaDelimiters(initialLatex);
    this.latex = cleanedLatex;
    this.isBlock = initialIsBlock;
    this.replaceRange = replaceRange;
    this.originalLatex = stripFormulaDelimiters(originalLatex || initialLatex);
    this.formulaRange = formulaRange;
    this.originalRaw = originalRaw;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("obsidian-formula-modal");
    const header = contentEl.createDiv({ cls: "formula-modal-header" });
    const titleContainer = header.createDiv({ cls: "formula-modal-title" });
    titleContainer.createSpan({ cls: "formula-sigma-badge", text: "\u03A3" });
    titleContainer.createEl("h3", {
      text: this.formulaRange || this.replaceRange || this.originalLatex ? "Edit Formula" : "LaTeX Formula Editor"
    });
    const isEditingExisting = Boolean(this.formulaRange || this.replaceRange || this.originalLatex);
    const subtitle = contentEl.createEl("p", {
      text: isEditingExisting ? "Modify and update existing formula in this cell" : "Insert mathematical expressions and data-science formulas intuitively"
    });
    subtitle.style.cssText = "font-size: 12px; color: var(--text-muted, #a1a1aa); margin: 0 0 12px 0;";
    this.buildCatalog(contentEl);
    const editorWrapper = contentEl.createDiv({ cls: "formula-input-wrapper" });
    const inputLabel = editorWrapper.createEl("label", { text: "LaTeX Code:" });
    inputLabel.style.cssText = "font-size: 11px; font-weight: 600; color: var(--text-muted, #a1a1aa); text-transform: uppercase; display: block; margin-bottom: 4px;";
    this.textareaEl = editorWrapper.createEl("textarea", {
      cls: "formula-textarea",
      placeholder: "e.g. \\mathbf{A}\\mathbf{x} = \\mathbf{b}"
    });
    this.textareaEl.value = this.latex;
    this.textareaEl.rows = 3;
    this.textareaEl.oninput = () => {
      this.latex = this.textareaEl.value;
      this.updateModeFeedback();
      this.updatePreview();
    };
    const modeSwitch = contentEl.createDiv({ cls: "formula-mode-switch-row" });
    modeSwitch.style.cssText = "display: flex; gap: 1.25rem; font-size: 13px; color: var(--text-normal, #d4d4d8); margin: 8px 0 12px 0; align-items: center; user-select: none;";
    const getRadioSvg = (checked) => `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;display:block;">
        <circle cx="8" cy="8" r="6.75" stroke="${checked ? "var(--interactive-accent, #a855f7)" : "var(--background-modifier-border, #52525b)"}" stroke-width="1.5" fill="var(--background-primary, #09090b)" />
        ${checked ? '<circle cx="8" cy="8" r="3.25" fill="var(--interactive-accent, #a855f7)" />' : ""}
      </svg>
    `;
    const inlineLabel = modeSwitch.createEl("label");
    inlineLabel.style.cssText = "display: inline-flex; align-items: center; gap: 8px; cursor: pointer;";
    const inlineIcon = inlineLabel.createSpan();
    inlineIcon.innerHTML = getRadioSvg(!this.isBlock);
    const inlineText = inlineLabel.createSpan({ text: "Inline ($...$)" });
    inlineText.style.color = !this.isBlock ? "var(--interactive-accent, #a855f7)" : "var(--text-normal, #d4d4d8)";
    const blockLabel = modeSwitch.createEl("label");
    blockLabel.style.cssText = "display: inline-flex; align-items: center; gap: 8px; cursor: pointer;";
    const blockIcon = blockLabel.createSpan();
    blockIcon.innerHTML = getRadioSvg(this.isBlock);
    const blockText = blockLabel.createSpan({ text: "Block ($$...$$)" });
    blockText.style.color = this.isBlock ? "var(--interactive-accent, #a855f7)" : "var(--text-normal, #d4d4d8)";
    const updateRadioVisuals = () => {
      inlineIcon.innerHTML = getRadioSvg(!this.isBlock);
      inlineText.style.color = !this.isBlock ? "var(--interactive-accent, #a855f7)" : "var(--text-normal, #d4d4d8)";
      blockIcon.innerHTML = getRadioSvg(this.isBlock);
      blockText.style.color = this.isBlock ? "var(--interactive-accent, #a855f7)" : "var(--text-normal, #d4d4d8)";
    };
    inlineLabel.onclick = () => {
      this.isBlock = false;
      updateRadioVisuals();
      this.updateModeFeedback();
      this.updatePreview();
    };
    blockLabel.onclick = () => {
      this.isBlock = true;
      updateRadioVisuals();
      this.updateModeFeedback();
      this.updatePreview();
    };
    this.modeDescEl = contentEl.createDiv({ cls: "formula-mode-desc" });
    this.modeDescEl.style.cssText = "font-size: 11px; color: var(--text-muted); margin: 2px 0 8px 0; font-family: var(--font-monospace);";
    this.updateModeFeedback();
    const previewWrapper = contentEl.createDiv({ cls: "formula-preview-container" });
    const previewLabel = previewWrapper.createEl("label", { text: "Real-time KaTeX Preview:" });
    previewLabel.style.cssText = "font-size: 11px; font-weight: 600; color: var(--text-muted, #a1a1aa); text-transform: uppercase; display: block; margin-bottom: 4px;";
    this.previewEl = previewWrapper.createDiv({ cls: "formula-preview-box" });
    const footer = contentEl.createDiv({ cls: "formula-modal-footer" });
    footer.createSpan({
      cls: "formula-modal-tip",
      text: "Tip: Shortcut Mod+Shift+M opens this editor anytime in editing mode."
    });
    const actionBtns = footer.createDiv({ cls: "formula-modal-actions" });
    const cancelBtn = actionBtns.createEl("button", { text: "Cancel" });
    cancelBtn.onclick = () => this.close();
    const insertBtn = actionBtns.createEl("button", {
      cls: "mod-cta",
      text: isEditingExisting ? "Update Formula" : "Insert into Note"
    });
    insertBtn.style.cssText = "background: var(--interactive-accent, #7c3aed); border-color: var(--interactive-accent-hover, #6d28d9); color: var(--text-on-accent, #ffffff); font-weight: 600;";
    insertBtn.onclick = () => this.applyToEditor();
    this.updatePreview();
    setTimeout(() => {
      this.textareaEl.focus();
      this.textareaEl.select();
    }, 50);
  }
  updateModeFeedback() {
    if (!this.modeDescEl) return;
    const clean = stripFormulaDelimiters(this.latex);
    const syntax = this.isBlock ? `$$ ${clean || "..."} $$ (Block)` : `$ ${clean || "..."} $ (Inline)`;
    this.modeDescEl.setText(`Saved in note as: ${syntax}`);
  }
  updatePreview() {
    if (!this.previewEl) return;
    const trimmed = stripFormulaDelimiters(this.latex);
    if (!trimmed) {
      this.previewEl.setText("(No formula entered)");
      return;
    }
    try {
      const obs = window.obsidian || require("obsidian");
      if (obs && typeof obs.renderMath === "function") {
        const node = obs.renderMath(trimmed, this.isBlock);
        this.previewEl.empty();
        this.previewEl.appendChild(node);
        if (typeof obs.finishRenderMath === "function") {
          obs.finishRenderMath();
        }
      } else if (typeof katex !== "undefined") {
        this.previewEl.innerHTML = katex.renderToString(trimmed, {
          displayMode: this.isBlock,
          throwOnError: false
        });
      } else {
        this.previewEl.setText(this.isBlock ? `$$${trimmed}$$` : `$${trimmed}$`);
      }
    } catch (err) {
      this.previewEl.setText(trimmed);
    }
  }
  insertSnippet(snippet) {
    const el = this.textareaEl;
    if (!el) {
      this.latex += snippet;
      this.updateModeFeedback();
      this.updatePreview();
      return;
    }
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const prev = this.latex;
    let textToInsert = snippet;
    if (snippet === "\\text{.}" && start !== end) {
      textToInsert = `\\text{${prev.substring(start, end)}}`;
    }
    this.latex = prev.substring(0, start) + textToInsert + prev.substring(end);
    el.value = this.latex;
    this.updateModeFeedback();
    this.updatePreview();
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 10);
  }
  buildCatalog(container) {
    const catalogContainer = container.createDiv({ cls: "formula-catalog-container" });
    const matTitle = catalogContainer.createDiv({ cls: "formula-chips-title" });
    matTitle.setText("Matrices & Vectors");
    matTitle.style.cssText = "font-size: 11px; font-weight: 600; color: var(--text-muted, #a1a1aa); text-transform: uppercase; margin: 4px 0 6px 0;";
    const matRow = catalogContainer.createDiv({ cls: "formula-chips-row" });
    matRow.style.cssText = "display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;";
    const matrixSnippets = [
      { label: "(2x2 Matrix)", code: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
      { label: "[3x3 Matrix]", code: "\\begin{bmatrix} a_{11} & a_{12} & a_{13} \\\\ a_{21} & a_{22} & a_{23} \\\\ a_{31} & a_{32} & a_{33} \\end{bmatrix}" },
      { label: "[Column vector]", code: "\\mathbf{v} = \\begin{pmatrix} v_1 \\\\ v_2 \\\\ v_3 \\end{pmatrix}" }
    ];
    matrixSnippets.forEach((sn) => {
      const chip = matRow.createEl("button", { cls: "formula-chip", text: sn.label });
      chip.onclick = () => this.insertSnippet(sn.code);
    });
    const opTitle = catalogContainer.createDiv({ cls: "formula-chips-title" });
    opTitle.setText("Operators & Building Blocks");
    opTitle.style.cssText = "font-size: 11px; font-weight: 600; color: var(--text-muted, #a1a1aa); text-transform: uppercase; margin: 4px 0 6px 0;";
    const opRow = catalogContainer.createDiv({ cls: "formula-chips-row" });
    opRow.style.cssText = "display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;";
    const opSnippets = [
      { label: "Fraction (\\frac)", code: "\\frac{a}{b}" },
      { label: "Display Fraction (\\dfrac)", code: "\\dfrac{a}{b}" },
      { label: "Formatting \\text{.}", code: "\\text{.}" },
      { label: "Power (x^2)", code: "x^{2}" },
      { label: "Subscript (x_i)", code: "x_{i}" },
      { label: "Square Root (\\sqrt)", code: "\\sqrt{x}" },
      { label: "n-th Root", code: "\\sqrt[n]{x}" },
      { label: "\xB7 (\\cdot)", code: "\\cdot " },
      { label: "\xB1", code: "\\pm" },
      { label: "\u221E", code: "\\infty" },
      { label: "\u2207", code: "\\nabla" },
      { label: "\u2208", code: "\\in" },
      { label: "\u2282", code: "\\subset" },
      { label: "\u2248", code: "\\approx" },
      { label: "\u2260", code: "\\neq" },
      { label: "\u2264", code: "\\le" },
      { label: "\u2265", code: "\\ge" }
    ];
    opSnippets.forEach((sn) => {
      const chip = opRow.createEl("button", { cls: "formula-chip", text: sn.label });
      chip.onclick = () => this.insertSnippet(sn.code);
    });
    const greekTitle = catalogContainer.createDiv({ cls: "formula-chips-title" });
    greekTitle.setText("Greek Symbols");
    greekTitle.style.cssText = "font-size: 11px; font-weight: 600; color: var(--text-muted, #a1a1aa); text-transform: uppercase; margin: 4px 0 6px 0;";
    const greekRow = catalogContainer.createDiv({ cls: "formula-chips-row" });
    greekRow.style.cssText = "display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;";
    const greekSnippets = [
      { label: "\u03B1 (alpha)", code: "\\alpha " },
      { label: "\u03B2 (beta)", code: "\\beta " },
      { label: "\u03B3 (gamma)", code: "\\gamma " },
      { label: "\u03B4 (delta)", code: "\\delta " },
      { label: "\u03B5 (epsilon)", code: "\\epsilon " },
      { label: "\u03B8 (theta)", code: "\\theta " },
      { label: "\u03BB (lambda)", code: "\\lambda " },
      { label: "\u03BC (mu)", code: "\\mu " },
      { label: "\u03C0 (pi)", code: "\\pi " },
      { label: "\u03C3 (sigma)", code: "\\sigma " },
      { label: "\u03C4 (tau)", code: "\\tau " },
      { label: "\u03C6 (phi)", code: "\\phi " },
      { label: "\u03C8 (psi)", code: "\\psi " },
      { label: "\u03C9 (omega)", code: "\\omega " },
      { label: "\u0394 (Delta)", code: "\\Delta " },
      { label: "\u0398 (Theta)", code: "\\Theta " },
      { label: "\u039B (Lambda)", code: "\\Lambda " },
      { label: "\u03A3 (Sigma)", code: "\\Sigma " },
      { label: "\u03A9 (Omega)", code: "\\Omega " }
    ];
    greekSnippets.forEach((g) => {
      const chip = greekRow.createEl("button", { cls: "formula-chip", text: g.label });
      chip.onclick = () => this.insertSnippet(g.code);
    });
  }
  applyToEditor() {
    const trimmed = stripFormulaDelimiters(this.latex);
    if (!trimmed) {
      this.close();
      return;
    }
    let formatted;
    if (this.isBlock) {
      const hadNewlines = this.originalRaw ? this.originalRaw.includes("\n") : false;
      if (trimmed.includes("\n") || hadNewlines) {
        formatted = "$$\n" + trimmed + "\n$$";
      } else {
        formatted = "$$" + trimmed + "$$";
      }
    } else {
      formatted = "$" + trimmed + "$";
    }
    if (this.formulaRange && this.editor) {
      this.editor.replaceRange(formatted, this.formulaRange.from, this.formulaRange.to);
      new import_obsidian.Notice(this.isBlock ? "Block formula ($$...$$) updated!" : "Inline formula ($...$) updated!");
      this.close();
      return;
    }
    if (this.replaceRange && this.editor) {
      const line = this.replaceRange.line !== void 0 ? this.replaceRange.line : this.editor.getCursor().line;
      this.editor.replaceRange(
        formatted,
        { line, ch: this.replaceRange.fromCh },
        { line, ch: this.replaceRange.toCh }
      );
      new import_obsidian.Notice(this.isBlock ? "Block formula ($$...$$) updated!" : "Inline formula ($...$) updated!");
      this.close();
      return;
    }
    if (this.editor) {
      const fullText = this.editor.getValue();
      let replaced = false;
      if (this.originalRaw && fullText.includes(this.originalRaw)) {
        this.editor.setValue(fullText.replace(this.originalRaw, formatted));
        replaced = true;
      } else if (this.originalLatex) {
        const origClean = stripFormulaDelimiters(this.originalLatex);
        const esc = origClean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const flexRegex = new RegExp("(\\$\\$[\\s\\S]*?" + esc + "[\\s\\S]*?\\$\\$|\\$[\\s\\S]*?" + esc + "[\\s\\S]*?\\$)", "m");
        if (flexRegex.test(fullText)) {
          this.editor.setValue(fullText.replace(flexRegex, formatted));
          replaced = true;
        }
      }
      if (replaced) {
        new import_obsidian.Notice(this.isBlock ? "Block formula ($$...$$) updated!" : "Inline formula ($...$) updated!");
      } else {
        this.editor.replaceSelection(formatted);
        new import_obsidian.Notice("Formula inserted into note!");
      }
    }
    this.close();
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};
var FormulaEditorSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    __publicField(this, "plugin");
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Visual Math Formula Editor Settings" });
    new import_obsidian.Setting(containerEl).setName("Default Mode").setDesc("Whether formulas should be inserted as block ($$...$$) or inline ($...$) by default.").addDropdown(
      (dropdown) => dropdown.addOption("block", "Block ($$...$$)").addOption("inline", "Inline ($...$)").setValue(this.plugin.settings.defaultMode).onChange(async (value) => {
        this.plugin.settings.defaultMode = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Direct click to edit").setDesc("Clicking rendered formulas in editing mode directly opens the visual editor.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableDirectClickEdit).onChange(async (value) => {
        this.plugin.settings.enableDirectClickEdit = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName('Floating "\u03A3 Edit" hover button').setDesc("Optionally display a button when hovering over formulas in editing mode.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableFloatingHoverButton).onChange(async (value) => {
        this.plugin.settings.enableFloatingHoverButton = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Status bar item").setDesc('Shows the "\u03A3 Formula Editor" button in the bottom status bar.').addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableStatusBarItem).onChange(async (value) => {
        this.plugin.settings.enableStatusBarItem = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Show ribbon icon").setDesc("Shows the Sigma icon (\u03A3) in the Obsidian left ribbon.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableRibbonIcon).onChange(async (value) => {
        this.plugin.settings.enableRibbonIcon = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Context menu integration").setDesc("Allows right-clicking formulas or text to open the formula editor.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enableContextMenu).onChange(async (value) => {
        this.plugin.settings.enableContextMenu = value;
        await this.plugin.saveSettings();
      })
    );
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FormulaEditorModal,
  MATH_DOM_SELECTOR
});

// Obsidian plugin interop
if (typeof module !== "undefined" && module.exports) {
  module.exports = VisualFormulaEditorPlugin;
  module.exports.default = VisualFormulaEditorPlugin;
}
