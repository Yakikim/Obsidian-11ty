'use strict';

var obsidian = require('obsidian');

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

class Settings {
    constructor() {
        this.fileDirections = {};
        this.defaultDirection = 'ltr';
        this.rememberPerFile = true;
        this.setNoteTitleDirection = true;
        this.setYamlDirection = false;
    }
    toJson() {
        return JSON.stringify(this);
    }
    fromJson(content) {
        var obj = JSON.parse(content);
        this.fileDirections = obj['fileDirections'];
        this.defaultDirection = obj['defaultDirection'];
        this.rememberPerFile = obj['rememberPerFile'];
        this.setNoteTitleDirection = obj['setNoteTitleDirection'];
    }
}
class RtlPlugin extends obsidian.Plugin {
    constructor() {
        super(...arguments);
        this.settings = new Settings();
        this.SETTINGS_PATH = '.obsidian/rtl.json';
        this.editorMode = null;
        // This stores the value in CodeMirror's autoCloseBrackets option before overriding it, so it can be restored when
        // we're back to LTR
        this.autoCloseBracketsValue = false;
        this.initialized = false;
    }
    onload() {
        this.addCommand({
            id: 'switch-text-direction',
            name: 'Switch Text Direction (LTR<>RTL)',
            callback: () => { this.toggleDocumentDirection(); }
        });
        this.addSettingTab(new RtlSettingsTab(this.app, this));
        this.loadSettings();
        this.registerEvent(this.app.workspace.on('file-open', (file) => __awaiter(this, void 0, void 0, function* () {
            if (!this.initialized)
                yield this.initialize();
            if (file && file.path) {
                this.syncDefaultDirection();
                this.currentFile = file;
                this.adjustDirectionToCurrentFile();
            }
        })));
        this.registerEvent(this.app.vault.on('delete', (file) => {
            if (file && file.path && file.path in this.settings.fileDirections) {
                delete this.settings.fileDirections[file.path];
                this.saveSettings();
            }
        }));
        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            if (file && file.path && oldPath in this.settings.fileDirections) {
                this.settings.fileDirections[file.path] = this.settings.fileDirections[oldPath];
                delete this.settings.fileDirections[oldPath];
                this.saveSettings();
            }
        }));
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            // Determine if we have the legacy Obsidian editor (CM5) or the new one (CM6).
            // This is only available after Obsidian is fully loaded, so we do it as part of the `file-open` event.
            if ('editor:toggle-source' in this.app.commands.editorCommands) {
                this.editorMode = 'cm6';
                console.log('RTL plugin: using CodeMirror 6 mode');
            }
            else {
                this.editorMode = 'cm5';
                console.log('RTL plugin: using CodeMirror 5 mode');
            }
            if (this.editorMode === 'cm5') {
                this.registerCodeMirror((cm) => {
                    let cmEditor = cm;
                    let currentExtraKeys = cmEditor.getOption('extraKeys');
                    let moreKeys = {
                        'End': (cm) => {
                            if (cm.getOption('direction') == 'rtl')
                                cm.execCommand('goLineLeftSmart');
                            else
                                cm.execCommand('goLineRight');
                        },
                        'Home': (cm) => {
                            if (cm.getOption('direction') == 'rtl')
                                cm.execCommand('goLineRight');
                            else
                                cm.execCommand('goLineLeftSmart');
                        }
                    };
                    cmEditor.setOption('extraKeys', Object.assign({}, currentExtraKeys, moreKeys));
                });
            }
            this.initialized = true;
        });
    }
    onunload() {
        console.log('unloading RTL plugin');
    }
    adjustDirectionToCurrentFile() {
        if (this.currentFile && this.currentFile.path) {
            let requiredDirection = null;
            const frontMatterDirection = this.getFrontMatterDirection(this.currentFile);
            if (frontMatterDirection) {
                if (frontMatterDirection == 'rtl' || frontMatterDirection == 'ltr')
                    requiredDirection = frontMatterDirection;
                else
                    console.log('Front matter direction in file', this.currentFile.path, 'is unknown:', frontMatterDirection);
            }
            else if (this.settings.rememberPerFile && this.currentFile.path in this.settings.fileDirections) {
                // If the user wants to remember the direction per file, and we have a direction set for this file -- use it
                requiredDirection = this.settings.fileDirections[this.currentFile.path];
            }
            else {
                // Use the default direction
                requiredDirection = this.settings.defaultDirection;
            }
            this.setDocumentDirection(requiredDirection);
        }
    }
    saveSettings() {
        var settings = this.settings.toJson();
        this.app.vault.adapter.write(this.SETTINGS_PATH, settings);
    }
    loadSettings() {
        this.app.vault.adapter.read(this.SETTINGS_PATH).
            then((content) => this.settings.fromJson(content)).
            catch(error => { console.log("RTL settings file not found"); });
    }
    getCmEditor() {
        var _a;
        let view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        if (view)
            return (_a = view.sourceMode) === null || _a === void 0 ? void 0 : _a.cmEditor;
        return null;
    }
    setDocumentDirection(newDirection) {
        var _a, _b, _c;
        let view = this.app.workspace.getActiveViewOfType(obsidian.MarkdownView);
        // Source / Live View editor direction
        if (this.editorMode === 'cm5') {
            var cmEditor = this.getCmEditor();
            if (cmEditor && cmEditor.getOption("direction") != newDirection) {
                this.patchAutoCloseBrackets(cmEditor, newDirection);
                cmEditor.setOption("direction", newDirection);
                cmEditor.setOption("rtlMoveVisually", true);
            }
        }
        else {
            if (!view.editor)
                return;
            this.replacePageStyleByString('New editor content div', `/* New editor content div */ .cm-editor { direction: ${newDirection}; }`, true);
            this.replacePageStyleByString('Markdown preview RTL', `/* Markdown preview RTL */ .markdown-preview-view { direction: ${newDirection}; }`, true);
            var containerEl = (_c = (_b = (_a = view.editor.getDoc()) === null || _a === void 0 ? void 0 : _a.cm) === null || _b === void 0 ? void 0 : _b.dom) === null || _c === void 0 ? void 0 : _c.parentElement;
            if (newDirection === 'rtl') {
                containerEl.classList.add('is-rtl');
                this.replacePageStyleByString('List indent fix', `/* List indent fix */ .cm-s-obsidian .HyperMD-list-line { text-indent: 0px !important; }`, true);
                // this.replaceStringInStyle('.markdown-source-view.mod-cm6 .cm-fold-indicator .collapse-indicator',
                // 'right: 0;', 'right: -15px;');
            }
            else {
                containerEl.classList.remove('is-rtl');
                this.replacePageStyleByString('List indent fix', `/* List indent fix */ /* Empty rule for LTR */`, true);
                // this.replaceStringInStyle('.markdown-source-view.mod-cm6 .cm-fold-indicator .collapse-indicator',
                // 'right: -15px;', 'right: 0;');
            }
            this.replacePageStyleByString('Embedded links always LTR', `/* Embedded links always LTR */ .embedded-backlinks { direction: ltr; }`, true);
            view.editor.refresh();
        }
        if (view) {
            // Fix the list indentation style
            this.replacePageStyleByString('CodeMirror-rtl pre', `.CodeMirror-rtl pre { text-indent: 0px !important; }`, true);
            if (this.settings.setYamlDirection) {
                const alignSide = newDirection == 'rtl' ? 'right' : 'left';
                this.replacePageStyleByString('Patch YAML', `/* Patch YAML RTL */ .language-yml code { text-align: ${alignSide}; }`, true);
            }
            if (this.settings.setNoteTitleDirection) {
                var leafContainer = this.app.workspace.activeLeaf.containerEl;
                let header = leafContainer.getElementsByClassName('view-header-title-container');
                header[0].style.direction = newDirection;
            }
            this.setExportDirection(newDirection);
        }
    }
    setExportDirection(newDirection) {
        this.replacePageStyleByString('searched and replaced', `/* This is searched and replaced by the plugin */ @media print { body { direction: ${newDirection}; } }`, false);
    }
    // Returns true if a replacement was made
    replacePageStyleByString(searchString, newStyle, addIfNotFound) {
        let alreadyExists = false;
        let style = this.findPageStyle(searchString);
        if (style) {
            if (style.getText() === searchString)
                alreadyExists = true;
            else
                style.setText(newStyle);
        }
        else if (addIfNotFound) {
            let style = document.createElement('style');
            style.textContent = newStyle;
            document.head.appendChild(style);
        }
        return style && !alreadyExists;
    }
    // Returns true if a replacement was made
    replaceStringInStyle(searchString, whatToReplace, replacement) {
        let style = this.findPageStyle(searchString);
        if (style && style.getText().includes(whatToReplace)) {
            const newText = style.getText().replace(whatToReplace, replacement);
            style.textContent = newText;
            return true;
        }
        return false;
    }
    findPageStyle(regex) {
        let styles = document.head.getElementsByTagName('style');
        for (let style of styles) {
            if (style.getText().match(regex))
                return style;
        }
        return null;
    }
    patchAutoCloseBrackets(cmEditor, newDirection) {
        // Auto-close brackets doesn't work in RTL: https://github.com/esm7/obsidian-rtl/issues/7
        // Until the actual fix is released (as part of CodeMirror), we store the value of autoCloseBrackets when
        // switching to RTL, overriding it to 'false' and restoring it when back to LTR.
        if (newDirection == 'rtl') {
            this.autoCloseBracketsValue = cmEditor.getOption('autoCloseBrackets');
            cmEditor.setOption('autoCloseBrackets', false);
        }
        else {
            cmEditor.setOption('autoCloseBrackets', this.autoCloseBracketsValue);
        }
    }
    toggleDocumentDirection() {
        let newDirection = this.getDocumentDirection() === 'ltr' ? 'rtl' : 'ltr';
        this.setDocumentDirection(newDirection);
        if (this.settings.rememberPerFile && this.currentFile && this.currentFile.path) {
            this.settings.fileDirections[this.currentFile.path] = newDirection;
            this.saveSettings();
        }
    }
    getDocumentDirection() {
        if (this.editorMode === 'cm5') {
            var cmEditor = this.getCmEditor();
            return (cmEditor === null || cmEditor === void 0 ? void 0 : cmEditor.getOption('direction')) === 'rtl' ? 'rtl' : 'ltr';
        }
        else {
            return this.findPageStyle('New editor content div.*direction: rtl') ? 'rtl' : 'ltr';
        }
    }
    getFrontMatterDirection(file) {
        const fileCache = this.app.metadataCache.getFileCache(file);
        const frontMatter = fileCache === null || fileCache === void 0 ? void 0 : fileCache.frontmatter;
        if (frontMatter && (frontMatter === null || frontMatter === void 0 ? void 0 : frontMatter.direction)) {
            try {
                const direction = frontMatter.direction;
                return direction;
            }
            catch (error) { }
        }
    }
    syncDefaultDirection() {
        // Sync the plugin default direction with Obsidian's own setting
        const obsidianDirection = this.app.vault.getConfig('rightToLeft') ? 'rtl' : 'ltr';
        if (obsidianDirection != this.settings.defaultDirection) {
            this.settings.defaultDirection = obsidianDirection;
            this.saveSettings();
        }
    }
}
class RtlSettingsTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.settings = plugin.settings;
    }
    display() {
        let { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'RTL Settings' });
        this.plugin.syncDefaultDirection();
        new obsidian.Setting(containerEl)
            .setName('Remember text direction per file')
            .setDesc('Store and remember the text direction used for each file individually.')
            .addToggle(toggle => toggle.setValue(this.settings.rememberPerFile)
            .onChange((value) => {
            this.settings.rememberPerFile = value;
            this.plugin.saveSettings();
            this.plugin.adjustDirectionToCurrentFile();
        }));
        new obsidian.Setting(containerEl)
            .setName('Default text direction')
            .setDesc('What should be the default text direction in Obsidian?')
            .addDropdown(dropdown => dropdown.addOption('ltr', 'LTR')
            .addOption('rtl', 'RTL')
            .setValue(this.settings.defaultDirection)
            .onChange((value) => {
            this.settings.defaultDirection = value;
            this.app.vault.setConfig('rightToLeft', value == 'rtl');
            this.plugin.saveSettings();
            this.plugin.adjustDirectionToCurrentFile();
        }));
        new obsidian.Setting(containerEl)
            .setName('Set note title direction')
            .setDesc('In RTL notes, also set the direction of the note title.')
            .addToggle(toggle => toggle.setValue(this.settings.setNoteTitleDirection)
            .onChange((value) => {
            this.settings.setNoteTitleDirection = value;
            this.plugin.saveSettings();
            this.plugin.adjustDirectionToCurrentFile();
        }));
        new obsidian.Setting(containerEl)
            .setName('Set YAML direction in Preview')
            .setDesc('For RTL notes, preview YAML blocks as RTL. (When turning off, restart of Obsidian is required.)')
            .addToggle(toggle => {
            var _a;
            return toggle.setValue((_a = this.settings.setYamlDirection) !== null && _a !== void 0 ? _a : false)
                .onChange((value) => {
                this.settings.setYamlDirection = value;
                this.plugin.saveSettings();
                this.plugin.adjustDirectionToCurrentFile();
            });
        });
    }
}

module.exports = RtlPlugin;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXMiOlsibm9kZV9tb2R1bGVzL3RzbGliL3RzbGliLmVzNi5qcyIsIm1haW4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyohICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLlxyXG5cclxuUGVybWlzc2lvbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgYW5kL29yIGRpc3RyaWJ1dGUgdGhpcyBzb2Z0d2FyZSBmb3IgYW55XHJcbnB1cnBvc2Ugd2l0aCBvciB3aXRob3V0IGZlZSBpcyBoZXJlYnkgZ3JhbnRlZC5cclxuXHJcblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIgQU5EIFRIRSBBVVRIT1IgRElTQ0xBSU1TIEFMTCBXQVJSQU5USUVTIFdJVEhcclxuUkVHQVJEIFRPIFRISVMgU09GVFdBUkUgSU5DTFVESU5HIEFMTCBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZXHJcbkFORCBGSVRORVNTLiBJTiBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SIEJFIExJQUJMRSBGT1IgQU5ZIFNQRUNJQUwsIERJUkVDVCxcclxuSU5ESVJFQ1QsIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFUyBPUiBBTlkgREFNQUdFUyBXSEFUU09FVkVSIFJFU1VMVElORyBGUk9NXHJcbkxPU1MgT0YgVVNFLCBEQVRBIE9SIFBST0ZJVFMsIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBORUdMSUdFTkNFIE9SXHJcbk9USEVSIFRPUlRJT1VTIEFDVElPTiwgQVJJU0lORyBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBVU0UgT1JcclxuUEVSRk9STUFOQ0UgT0YgVEhJUyBTT0ZUV0FSRS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuLyogZ2xvYmFsIFJlZmxlY3QsIFByb21pc2UgKi9cclxuXHJcbnZhciBleHRlbmRTdGF0aWNzID0gZnVuY3Rpb24oZCwgYikge1xyXG4gICAgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwgcCkpIGRbcF0gPSBiW3BdOyB9O1xyXG4gICAgcmV0dXJuIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19leHRlbmRzKGQsIGIpIHtcclxuICAgIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cclxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcclxufVxyXG5cclxuZXhwb3J0IHZhciBfX2Fzc2lnbiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgX19hc3NpZ24gPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uIF9fYXNzaWduKHQpIHtcclxuICAgICAgICBmb3IgKHZhciBzLCBpID0gMSwgbiA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcclxuICAgICAgICAgICAgcyA9IGFyZ3VtZW50c1tpXTtcclxuICAgICAgICAgICAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApKSB0W3BdID0gc1twXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHQ7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gX19hc3NpZ24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fcmVzdChzLCBlKSB7XHJcbiAgICB2YXIgdCA9IHt9O1xyXG4gICAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApICYmIGUuaW5kZXhPZihwKSA8IDApXHJcbiAgICAgICAgdFtwXSA9IHNbcF07XHJcbiAgICBpZiAocyAhPSBudWxsICYmIHR5cGVvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzID09PSBcImZ1bmN0aW9uXCIpXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIHAgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHMpOyBpIDwgcC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoZS5pbmRleE9mKHBbaV0pIDwgMCAmJiBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmNhbGwocywgcFtpXSkpXHJcbiAgICAgICAgICAgICAgICB0W3BbaV1dID0gc1twW2ldXTtcclxuICAgICAgICB9XHJcbiAgICByZXR1cm4gdDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcclxuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xyXG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcclxuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3BhcmFtKHBhcmFtSW5kZXgsIGRlY29yYXRvcikge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIGtleSkgeyBkZWNvcmF0b3IodGFyZ2V0LCBrZXksIHBhcmFtSW5kZXgpOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX21ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKSB7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QubWV0YWRhdGEgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIFJlZmxlY3QubWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hd2FpdGVyKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgZnVuY3Rpb24gYWRvcHQodmFsdWUpIHsgcmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgUCA/IHZhbHVlIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZSh2YWx1ZSk7IH0pOyB9XHJcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBhZG9wdChyZXN1bHQudmFsdWUpLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cclxuICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fZ2VuZXJhdG9yKHRoaXNBcmcsIGJvZHkpIHtcclxuICAgIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGc7XHJcbiAgICByZXR1cm4gZyA9IHsgbmV4dDogdmVyYigwKSwgXCJ0aHJvd1wiOiB2ZXJiKDEpLCBcInJldHVyblwiOiB2ZXJiKDIpIH0sIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiAoZ1tTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9KSwgZztcclxuICAgIGZ1bmN0aW9uIHZlcmIobikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHN0ZXAoW24sIHZdKTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc3RlcChvcCkge1xyXG4gICAgICAgIGlmIChmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgZXhlY3V0aW5nLlwiKTtcclxuICAgICAgICB3aGlsZSAoXykgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xyXG4gICAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XHJcbiAgICAgICAgICAgIHN3aXRjaCAob3BbMF0pIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNTogXy5sYWJlbCsrOyB5ID0gb3BbMV07IG9wID0gWzBdOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEodCA9IF8udHJ5cywgdCA9IHQubGVuZ3RoID4gMCAmJiB0W3QubGVuZ3RoIC0gMV0pICYmIChvcFswXSA9PT0gNiB8fCBvcFswXSA9PT0gMikpIHsgXyA9IDA7IGNvbnRpbnVlOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodCAmJiBfLmxhYmVsIDwgdFsyXSkgeyBfLmxhYmVsID0gdFsyXTsgXy5vcHMucHVzaChvcCk7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxyXG4gICAgICAgIGlmIChvcFswXSAmIDUpIHRocm93IG9wWzFdOyByZXR1cm4geyB2YWx1ZTogb3BbMF0gPyBvcFsxXSA6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQgdmFyIF9fY3JlYXRlQmluZGluZyA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgbSwgaywgazIpIHtcclxuICAgIGlmIChrMiA9PT0gdW5kZWZpbmVkKSBrMiA9IGs7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgazIsIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIG1ba107IH0gfSk7XHJcbn0pIDogKGZ1bmN0aW9uKG8sIG0sIGssIGsyKSB7XHJcbiAgICBpZiAoazIgPT09IHVuZGVmaW5lZCkgazIgPSBrO1xyXG4gICAgb1trMl0gPSBtW2tdO1xyXG59KTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2V4cG9ydFN0YXIobSwgbykge1xyXG4gICAgZm9yICh2YXIgcCBpbiBtKSBpZiAocCAhPT0gXCJkZWZhdWx0XCIgJiYgIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvLCBwKSkgX19jcmVhdGVCaW5kaW5nKG8sIG0sIHApO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX192YWx1ZXMobykge1xyXG4gICAgdmFyIHMgPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgU3ltYm9sLml0ZXJhdG9yLCBtID0gcyAmJiBvW3NdLCBpID0gMDtcclxuICAgIGlmIChtKSByZXR1cm4gbS5jYWxsKG8pO1xyXG4gICAgaWYgKG8gJiYgdHlwZW9mIG8ubGVuZ3RoID09PSBcIm51bWJlclwiKSByZXR1cm4ge1xyXG4gICAgICAgIG5leHQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKG8gJiYgaSA+PSBvLmxlbmd0aCkgbyA9IHZvaWQgMDtcclxuICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IG8gJiYgb1tpKytdLCBkb25lOiAhbyB9O1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKHMgPyBcIk9iamVjdCBpcyBub3QgaXRlcmFibGUuXCIgOiBcIlN5bWJvbC5pdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3JlYWQobywgbikge1xyXG4gICAgdmFyIG0gPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb1tTeW1ib2wuaXRlcmF0b3JdO1xyXG4gICAgaWYgKCFtKSByZXR1cm4gbztcclxuICAgIHZhciBpID0gbS5jYWxsKG8pLCByLCBhciA9IFtdLCBlO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICB3aGlsZSAoKG4gPT09IHZvaWQgMCB8fCBuLS0gPiAwKSAmJiAhKHIgPSBpLm5leHQoKSkuZG9uZSkgYXIucHVzaChyLnZhbHVlKTtcclxuICAgIH1cclxuICAgIGNhdGNoIChlcnJvcikgeyBlID0geyBlcnJvcjogZXJyb3IgfTsgfVxyXG4gICAgZmluYWxseSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKHIgJiYgIXIuZG9uZSAmJiAobSA9IGlbXCJyZXR1cm5cIl0pKSBtLmNhbGwoaSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZpbmFsbHkgeyBpZiAoZSkgdGhyb3cgZS5lcnJvcjsgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGFyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19zcHJlYWQoKSB7XHJcbiAgICBmb3IgKHZhciBhciA9IFtdLCBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKylcclxuICAgICAgICBhciA9IGFyLmNvbmNhdChfX3JlYWQoYXJndW1lbnRzW2ldKSk7XHJcbiAgICByZXR1cm4gYXI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX3NwcmVhZEFycmF5cygpIHtcclxuICAgIGZvciAodmFyIHMgPSAwLCBpID0gMCwgaWwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWw7IGkrKykgcyArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xyXG4gICAgZm9yICh2YXIgciA9IEFycmF5KHMpLCBrID0gMCwgaSA9IDA7IGkgPCBpbDsgaSsrKVxyXG4gICAgICAgIGZvciAodmFyIGEgPSBhcmd1bWVudHNbaV0sIGogPSAwLCBqbCA9IGEubGVuZ3RoOyBqIDwgamw7IGorKywgaysrKVxyXG4gICAgICAgICAgICByW2tdID0gYVtqXTtcclxuICAgIHJldHVybiByO1xyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIF9fYXdhaXQodikge1xyXG4gICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jR2VuZXJhdG9yKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xyXG4gICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgIHZhciBnID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pLCBpLCBxID0gW107XHJcbiAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaWYgKGdbbl0pIGlbbl0gPSBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHsgcS5wdXNoKFtuLCB2LCBhLCBiXSkgPiAxIHx8IHJlc3VtZShuLCB2KTsgfSk7IH07IH1cclxuICAgIGZ1bmN0aW9uIHJlc3VtZShuLCB2KSB7IHRyeSB7IHN0ZXAoZ1tuXSh2KSk7IH0gY2F0Y2ggKGUpIHsgc2V0dGxlKHFbMF1bM10sIGUpOyB9IH1cclxuICAgIGZ1bmN0aW9uIHN0ZXAocikgeyByLnZhbHVlIGluc3RhbmNlb2YgX19hd2FpdCA/IFByb21pc2UucmVzb2x2ZShyLnZhbHVlLnYpLnRoZW4oZnVsZmlsbCwgcmVqZWN0KSA6IHNldHRsZShxWzBdWzJdLCByKTsgfVxyXG4gICAgZnVuY3Rpb24gZnVsZmlsbCh2YWx1ZSkgeyByZXN1bWUoXCJuZXh0XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gcmVqZWN0KHZhbHVlKSB7IHJlc3VtZShcInRocm93XCIsIHZhbHVlKTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKGYsIHYpIHsgaWYgKGYodiksIHEuc2hpZnQoKSwgcS5sZW5ndGgpIHJlc3VtZShxWzBdWzBdLCBxWzBdWzFdKTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19hc3luY0RlbGVnYXRvcihvKSB7XHJcbiAgICB2YXIgaSwgcDtcclxuICAgIHJldHVybiBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiwgZnVuY3Rpb24gKGUpIHsgdGhyb3cgZTsgfSksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICBmdW5jdGlvbiB2ZXJiKG4sIGYpIHsgaVtuXSA9IG9bbl0gPyBmdW5jdGlvbiAodikgeyByZXR1cm4gKHAgPSAhcCkgPyB7IHZhbHVlOiBfX2F3YWl0KG9bbl0odikpLCBkb25lOiBuID09PSBcInJldHVyblwiIH0gOiBmID8gZih2KSA6IHY7IH0gOiBmOyB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2FzeW5jVmFsdWVzKG8pIHtcclxuICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgcmV0dXJuIG0gPyBtLmNhbGwobykgOiAobyA9IHR5cGVvZiBfX3ZhbHVlcyA9PT0gXCJmdW5jdGlvblwiID8gX192YWx1ZXMobykgOiBvW1N5bWJvbC5pdGVyYXRvcl0oKSwgaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGkpO1xyXG4gICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxyXG4gICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19tYWtlVGVtcGxhdGVPYmplY3QoY29va2VkLCByYXcpIHtcclxuICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICByZXR1cm4gY29va2VkO1xyXG59O1xyXG5cclxudmFyIF9fc2V0TW9kdWxlRGVmYXVsdCA9IE9iamVjdC5jcmVhdGUgPyAoZnVuY3Rpb24obywgdikge1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIFwiZGVmYXVsdFwiLCB7IGVudW1lcmFibGU6IHRydWUsIHZhbHVlOiB2IH0pO1xyXG59KSA6IGZ1bmN0aW9uKG8sIHYpIHtcclxuICAgIG9bXCJkZWZhdWx0XCJdID0gdjtcclxufTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydFN0YXIobW9kKSB7XHJcbiAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgaWYgKG1vZCAhPSBudWxsKSBmb3IgKHZhciBrIGluIG1vZCkgaWYgKGsgIT09IFwiZGVmYXVsdFwiICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSBfX2NyZWF0ZUJpbmRpbmcocmVzdWx0LCBtb2QsIGspO1xyXG4gICAgX19zZXRNb2R1bGVEZWZhdWx0KHJlc3VsdCwgbW9kKTtcclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2ltcG9ydERlZmF1bHQobW9kKSB7XHJcbiAgICByZXR1cm4gKG1vZCAmJiBtb2QuX19lc01vZHVsZSkgPyBtb2QgOiB7IGRlZmF1bHQ6IG1vZCB9O1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gX19jbGFzc1ByaXZhdGVGaWVsZEdldChyZWNlaXZlciwgcHJpdmF0ZU1hcCkge1xyXG4gICAgaWYgKCFwcml2YXRlTWFwLmhhcyhyZWNlaXZlcikpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXR0ZW1wdGVkIHRvIGdldCBwcml2YXRlIGZpZWxkIG9uIG5vbi1pbnN0YW5jZVwiKTtcclxuICAgIH1cclxuICAgIHJldHVybiBwcml2YXRlTWFwLmdldChyZWNlaXZlcik7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBfX2NsYXNzUHJpdmF0ZUZpZWxkU2V0KHJlY2VpdmVyLCBwcml2YXRlTWFwLCB2YWx1ZSkge1xyXG4gICAgaWYgKCFwcml2YXRlTWFwLmhhcyhyZWNlaXZlcikpIHtcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXR0ZW1wdGVkIHRvIHNldCBwcml2YXRlIGZpZWxkIG9uIG5vbi1pbnN0YW5jZVwiKTtcclxuICAgIH1cclxuICAgIHByaXZhdGVNYXAuc2V0KHJlY2VpdmVyLCB2YWx1ZSk7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn1cclxuIiwiaW1wb3J0IHsgQXBwLCBFZGl0b3IsIE1hcmtkb3duVmlldywgUGx1Z2luLCBQbHVnaW5TZXR0aW5nVGFiLCBURmlsZSwgVEFic3RyYWN0RmlsZSwgU2V0dGluZyB9IGZyb20gJ29ic2lkaWFuJztcclxuaW1wb3J0ICogYXMgY29kZW1pcnJvciBmcm9tICdjb2RlbWlycm9yJztcclxuXHJcbmNsYXNzIFNldHRpbmdzIHtcclxuXHRwdWJsaWMgZmlsZURpcmVjdGlvbnM6IHsgW3BhdGg6IHN0cmluZ106IHN0cmluZyB9ID0ge307XHJcblx0cHVibGljIGRlZmF1bHREaXJlY3Rpb246IHN0cmluZyA9ICdsdHInO1xyXG5cdHB1YmxpYyByZW1lbWJlclBlckZpbGU6IGJvb2xlYW4gPSB0cnVlO1xyXG5cdHB1YmxpYyBzZXROb3RlVGl0bGVEaXJlY3Rpb246IGJvb2xlYW4gPSB0cnVlO1xyXG5cdHB1YmxpYyBzZXRZYW1sRGlyZWN0aW9uOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG5cdHRvSnNvbigpIHtcclxuXHRcdHJldHVybiBKU09OLnN0cmluZ2lmeSh0aGlzKTtcclxuXHR9XHJcblxyXG5cdGZyb21Kc29uKGNvbnRlbnQ6IHN0cmluZykge1xyXG5cdFx0dmFyIG9iaiA9IEpTT04ucGFyc2UoY29udGVudCk7XHJcblx0XHR0aGlzLmZpbGVEaXJlY3Rpb25zID0gb2JqWydmaWxlRGlyZWN0aW9ucyddO1xyXG5cdFx0dGhpcy5kZWZhdWx0RGlyZWN0aW9uID0gb2JqWydkZWZhdWx0RGlyZWN0aW9uJ107XHJcblx0XHR0aGlzLnJlbWVtYmVyUGVyRmlsZSA9IG9ialsncmVtZW1iZXJQZXJGaWxlJ107XHJcblx0XHR0aGlzLnNldE5vdGVUaXRsZURpcmVjdGlvbiA9IG9ialsnc2V0Tm90ZVRpdGxlRGlyZWN0aW9uJ107XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSdGxQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xyXG5cdHB1YmxpYyBzZXR0aW5ncyA9IG5ldyBTZXR0aW5ncygpO1xyXG5cdHByaXZhdGUgY3VycmVudEZpbGU6IFRGaWxlO1xyXG5cdHB1YmxpYyBTRVRUSU5HU19QQVRIID0gJy5vYnNpZGlhbi9ydGwuanNvbidcclxuXHRwcml2YXRlIGVkaXRvck1vZGU6ICdjbTUnIHwgJ2NtNicgPSBudWxsO1xyXG5cdC8vIFRoaXMgc3RvcmVzIHRoZSB2YWx1ZSBpbiBDb2RlTWlycm9yJ3MgYXV0b0Nsb3NlQnJhY2tldHMgb3B0aW9uIGJlZm9yZSBvdmVycmlkaW5nIGl0LCBzbyBpdCBjYW4gYmUgcmVzdG9yZWQgd2hlblxyXG5cdC8vIHdlJ3JlIGJhY2sgdG8gTFRSXHJcblx0cHJpdmF0ZSBhdXRvQ2xvc2VCcmFja2V0c1ZhbHVlOiBhbnkgPSBmYWxzZTtcclxuXHRwcml2YXRlIGluaXRpYWxpemVkID0gZmFsc2U7XHJcblxyXG5cdG9ubG9hZCgpIHtcclxuXHRcdHRoaXMuYWRkQ29tbWFuZCh7XHJcblx0XHRcdGlkOiAnc3dpdGNoLXRleHQtZGlyZWN0aW9uJyxcclxuXHRcdFx0bmFtZTogJ1N3aXRjaCBUZXh0IERpcmVjdGlvbiAoTFRSPD5SVEwpJyxcclxuXHRcdFx0Y2FsbGJhY2s6ICgpID0+IHsgdGhpcy50b2dnbGVEb2N1bWVudERpcmVjdGlvbigpOyB9XHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmFkZFNldHRpbmdUYWIobmV3IFJ0bFNldHRpbmdzVGFiKHRoaXMuYXBwLCB0aGlzKSk7XHJcblxyXG5cdFx0dGhpcy5sb2FkU2V0dGluZ3MoKTtcclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAud29ya3NwYWNlLm9uKCdmaWxlLW9wZW4nLCBhc3luYyAoZmlsZTogVEZpbGUpID0+IHtcclxuXHRcdFx0aWYgKCF0aGlzLmluaXRpYWxpemVkKVxyXG5cdFx0XHRcdGF3YWl0IHRoaXMuaW5pdGlhbGl6ZSgpO1xyXG5cdFx0XHRpZiAoZmlsZSAmJiBmaWxlLnBhdGgpIHtcclxuXHRcdFx0XHR0aGlzLnN5bmNEZWZhdWx0RGlyZWN0aW9uKCk7XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50RmlsZSA9IGZpbGU7XHJcblx0XHRcdFx0dGhpcy5hZGp1c3REaXJlY3Rpb25Ub0N1cnJlbnRGaWxlKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pKTtcclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQodGhpcy5hcHAudmF1bHQub24oJ2RlbGV0ZScsIChmaWxlOiBUQWJzdHJhY3RGaWxlKSA9PiB7XHJcblx0XHRcdGlmIChmaWxlICYmIGZpbGUucGF0aCAmJiBmaWxlLnBhdGggaW4gdGhpcy5zZXR0aW5ncy5maWxlRGlyZWN0aW9ucykge1xyXG5cdFx0XHRcdGRlbGV0ZSB0aGlzLnNldHRpbmdzLmZpbGVEaXJlY3Rpb25zW2ZpbGUucGF0aF07XHJcblx0XHRcdFx0dGhpcy5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSkpO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC52YXVsdC5vbigncmVuYW1lJywgKGZpbGU6IFRBYnN0cmFjdEZpbGUsIG9sZFBhdGg6IHN0cmluZykgPT4ge1xyXG5cdFx0XHRpZiAoZmlsZSAmJiBmaWxlLnBhdGggJiYgb2xkUGF0aCBpbiB0aGlzLnNldHRpbmdzLmZpbGVEaXJlY3Rpb25zKSB7XHJcblx0XHRcdFx0dGhpcy5zZXR0aW5ncy5maWxlRGlyZWN0aW9uc1tmaWxlLnBhdGhdID0gdGhpcy5zZXR0aW5ncy5maWxlRGlyZWN0aW9uc1tvbGRQYXRoXTtcclxuXHRcdFx0XHRkZWxldGUgdGhpcy5zZXR0aW5ncy5maWxlRGlyZWN0aW9uc1tvbGRQYXRoXTtcclxuXHRcdFx0XHR0aGlzLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHR9XHJcblx0XHR9KSk7XHJcblxyXG5cdH1cclxuXHJcblx0YXN5bmMgaW5pdGlhbGl6ZSgpIHtcclxuXHRcdC8vIERldGVybWluZSBpZiB3ZSBoYXZlIHRoZSBsZWdhY3kgT2JzaWRpYW4gZWRpdG9yIChDTTUpIG9yIHRoZSBuZXcgb25lIChDTTYpLlxyXG5cdFx0Ly8gVGhpcyBpcyBvbmx5IGF2YWlsYWJsZSBhZnRlciBPYnNpZGlhbiBpcyBmdWxseSBsb2FkZWQsIHNvIHdlIGRvIGl0IGFzIHBhcnQgb2YgdGhlIGBmaWxlLW9wZW5gIGV2ZW50LlxyXG5cdFx0aWYgKCdlZGl0b3I6dG9nZ2xlLXNvdXJjZScgaW4gKHRoaXMuYXBwIGFzIGFueSkuY29tbWFuZHMuZWRpdG9yQ29tbWFuZHMpIHtcclxuXHRcdFx0dGhpcy5lZGl0b3JNb2RlID0gJ2NtNic7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdSVEwgcGx1Z2luOiB1c2luZyBDb2RlTWlycm9yIDYgbW9kZScpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5lZGl0b3JNb2RlID0gJ2NtNSc7XHJcblx0XHRcdGNvbnNvbGUubG9nKCdSVEwgcGx1Z2luOiB1c2luZyBDb2RlTWlycm9yIDUgbW9kZScpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLmVkaXRvck1vZGUgPT09ICdjbTUnKSB7XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJDb2RlTWlycm9yKChjbTogQ29kZU1pcnJvci5FZGl0b3IpID0+IHtcclxuXHRcdFx0XHRsZXQgY21FZGl0b3IgPSBjbTtcclxuXHRcdFx0XHRsZXQgY3VycmVudEV4dHJhS2V5cyA9IGNtRWRpdG9yLmdldE9wdGlvbignZXh0cmFLZXlzJyk7XHJcblx0XHRcdFx0bGV0IG1vcmVLZXlzID0ge1xyXG5cdFx0XHRcdFx0J0VuZCc6IChjbTogQ29kZU1pcnJvci5FZGl0b3IpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKGNtLmdldE9wdGlvbignZGlyZWN0aW9uJykgPT0gJ3J0bCcpXHJcblx0XHRcdFx0XHRcdFx0Y20uZXhlY0NvbW1hbmQoJ2dvTGluZUxlZnRTbWFydCcpO1xyXG5cdFx0XHRcdFx0XHRlbHNlXHJcblx0XHRcdFx0XHRcdFx0Y20uZXhlY0NvbW1hbmQoJ2dvTGluZVJpZ2h0Jyk7XHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0J0hvbWUnOiAoY206IENvZGVNaXJyb3IuRWRpdG9yKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmIChjbS5nZXRPcHRpb24oJ2RpcmVjdGlvbicpID09ICdydGwnKVxyXG5cdFx0XHRcdFx0XHRcdGNtLmV4ZWNDb21tYW5kKCdnb0xpbmVSaWdodCcpO1xyXG5cdFx0XHRcdFx0XHRlbHNlXHJcblx0XHRcdFx0XHRcdFx0Y20uZXhlY0NvbW1hbmQoJ2dvTGluZUxlZnRTbWFydCcpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0Y21FZGl0b3Iuc2V0T3B0aW9uKCdleHRyYUtleXMnLCBPYmplY3QuYXNzaWduKHt9LCBjdXJyZW50RXh0cmFLZXlzLCBtb3JlS2V5cykpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCkge1xyXG5cdFx0Y29uc29sZS5sb2coJ3VubG9hZGluZyBSVEwgcGx1Z2luJyk7XHJcblx0fVxyXG5cclxuXHRhZGp1c3REaXJlY3Rpb25Ub0N1cnJlbnRGaWxlKCkge1xyXG5cdFx0aWYgKHRoaXMuY3VycmVudEZpbGUgJiYgdGhpcy5jdXJyZW50RmlsZS5wYXRoKSB7XHJcblx0XHRcdGxldCByZXF1aXJlZERpcmVjdGlvbiA9IG51bGw7XHJcblx0XHRcdGNvbnN0IGZyb250TWF0dGVyRGlyZWN0aW9uID0gdGhpcy5nZXRGcm9udE1hdHRlckRpcmVjdGlvbih0aGlzLmN1cnJlbnRGaWxlKTtcclxuXHRcdFx0aWYgKGZyb250TWF0dGVyRGlyZWN0aW9uKSB7XHJcblx0XHRcdFx0aWYgKGZyb250TWF0dGVyRGlyZWN0aW9uID09ICdydGwnIHx8IGZyb250TWF0dGVyRGlyZWN0aW9uID09ICdsdHInKVxyXG5cdFx0XHRcdFx0cmVxdWlyZWREaXJlY3Rpb24gPSBmcm9udE1hdHRlckRpcmVjdGlvbjtcclxuXHRcdFx0XHRlbHNlXHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRnJvbnQgbWF0dGVyIGRpcmVjdGlvbiBpbiBmaWxlJywgdGhpcy5jdXJyZW50RmlsZS5wYXRoLCAnaXMgdW5rbm93bjonLCBmcm9udE1hdHRlckRpcmVjdGlvbik7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZiAodGhpcy5zZXR0aW5ncy5yZW1lbWJlclBlckZpbGUgJiYgdGhpcy5jdXJyZW50RmlsZS5wYXRoIGluIHRoaXMuc2V0dGluZ3MuZmlsZURpcmVjdGlvbnMpIHtcclxuXHRcdFx0XHQvLyBJZiB0aGUgdXNlciB3YW50cyB0byByZW1lbWJlciB0aGUgZGlyZWN0aW9uIHBlciBmaWxlLCBhbmQgd2UgaGF2ZSBhIGRpcmVjdGlvbiBzZXQgZm9yIHRoaXMgZmlsZSAtLSB1c2UgaXRcclxuXHRcdFx0XHRyZXF1aXJlZERpcmVjdGlvbiA9IHRoaXMuc2V0dGluZ3MuZmlsZURpcmVjdGlvbnNbdGhpcy5jdXJyZW50RmlsZS5wYXRoXTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBVc2UgdGhlIGRlZmF1bHQgZGlyZWN0aW9uXHJcblx0XHRcdFx0cmVxdWlyZWREaXJlY3Rpb24gPSB0aGlzLnNldHRpbmdzLmRlZmF1bHREaXJlY3Rpb247XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5zZXREb2N1bWVudERpcmVjdGlvbihyZXF1aXJlZERpcmVjdGlvbik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRzYXZlU2V0dGluZ3MoKSB7XHJcblx0XHR2YXIgc2V0dGluZ3MgPSB0aGlzLnNldHRpbmdzLnRvSnNvbigpO1xyXG5cdFx0dGhpcy5hcHAudmF1bHQuYWRhcHRlci53cml0ZSh0aGlzLlNFVFRJTkdTX1BBVEgsIHNldHRpbmdzKTtcclxuXHR9XHJcblxyXG5cdGxvYWRTZXR0aW5ncygpIHtcclxuXHRcdHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIucmVhZCh0aGlzLlNFVFRJTkdTX1BBVEgpLlxyXG5cdFx0XHR0aGVuKChjb250ZW50KSA9PiB0aGlzLnNldHRpbmdzLmZyb21Kc29uKGNvbnRlbnQpKS5cclxuXHRcdFx0Y2F0Y2goZXJyb3IgPT4geyBjb25zb2xlLmxvZyhcIlJUTCBzZXR0aW5ncyBmaWxlIG5vdCBmb3VuZFwiKTsgfSk7XHJcblx0fVxyXG5cclxuXHRnZXRDbUVkaXRvcigpOiBjb2RlbWlycm9yLkVkaXRvciB7XHJcblx0XHRsZXQgdmlldyA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVWaWV3T2ZUeXBlKE1hcmtkb3duVmlldyk7XHJcblx0XHRpZiAodmlldylcclxuXHRcdFx0cmV0dXJuIHZpZXcuc291cmNlTW9kZT8uY21FZGl0b3I7XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdHNldERvY3VtZW50RGlyZWN0aW9uKG5ld0RpcmVjdGlvbjogc3RyaW5nKSB7XHJcblx0XHRsZXQgdmlldyA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVWaWV3T2ZUeXBlKE1hcmtkb3duVmlldyk7XHJcblx0XHQvLyBTb3VyY2UgLyBMaXZlIFZpZXcgZWRpdG9yIGRpcmVjdGlvblxyXG5cdFx0aWYgKHRoaXMuZWRpdG9yTW9kZSA9PT0gJ2NtNScpIHtcclxuXHRcdFx0dmFyIGNtRWRpdG9yID0gdGhpcy5nZXRDbUVkaXRvcigpO1xyXG5cdFx0XHRpZiAoY21FZGl0b3IgJiYgY21FZGl0b3IuZ2V0T3B0aW9uKFwiZGlyZWN0aW9uXCIpICE9IG5ld0RpcmVjdGlvbikge1xyXG5cdFx0XHRcdHRoaXMucGF0Y2hBdXRvQ2xvc2VCcmFja2V0cyhjbUVkaXRvciwgbmV3RGlyZWN0aW9uKTtcclxuXHRcdFx0XHRjbUVkaXRvci5zZXRPcHRpb24oXCJkaXJlY3Rpb25cIiwgbmV3RGlyZWN0aW9uIGFzIGFueSk7XHJcblx0XHRcdFx0Y21FZGl0b3Iuc2V0T3B0aW9uKFwicnRsTW92ZVZpc3VhbGx5XCIsIHRydWUpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRpZiAoIXZpZXcuZWRpdG9yKVxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0dGhpcy5yZXBsYWNlUGFnZVN0eWxlQnlTdHJpbmcoJ05ldyBlZGl0b3IgY29udGVudCBkaXYnLFxyXG5cdFx0XHRcdGAvKiBOZXcgZWRpdG9yIGNvbnRlbnQgZGl2ICovIC5jbS1lZGl0b3IgeyBkaXJlY3Rpb246ICR7bmV3RGlyZWN0aW9ufTsgfWAsIHRydWUpO1xyXG5cdFx0XHR0aGlzLnJlcGxhY2VQYWdlU3R5bGVCeVN0cmluZygnTWFya2Rvd24gcHJldmlldyBSVEwnLFxyXG5cdFx0XHRcdGAvKiBNYXJrZG93biBwcmV2aWV3IFJUTCAqLyAubWFya2Rvd24tcHJldmlldy12aWV3IHsgZGlyZWN0aW9uOiAke25ld0RpcmVjdGlvbn07IH1gLCB0cnVlKTtcclxuXHRcdFx0dmFyIGNvbnRhaW5lckVsID0gKHZpZXcuZWRpdG9yLmdldERvYygpIGFzIGFueSk/LmNtPy5kb20/LnBhcmVudEVsZW1lbnQgYXMgSFRNTERpdkVsZW1lbnQ7XHJcblx0XHRcdGlmIChuZXdEaXJlY3Rpb24gPT09ICdydGwnKSB7XHJcblx0XHRcdFx0Y29udGFpbmVyRWwuY2xhc3NMaXN0LmFkZCgnaXMtcnRsJyk7XHJcblx0XHRcdFx0dGhpcy5yZXBsYWNlUGFnZVN0eWxlQnlTdHJpbmcoJ0xpc3QgaW5kZW50IGZpeCcsXHJcblx0XHRcdFx0XHRgLyogTGlzdCBpbmRlbnQgZml4ICovIC5jbS1zLW9ic2lkaWFuIC5IeXBlck1ELWxpc3QtbGluZSB7IHRleHQtaW5kZW50OiAwcHggIWltcG9ydGFudDsgfWAsIHRydWUpO1xyXG5cdFx0XHRcdC8vIHRoaXMucmVwbGFjZVN0cmluZ0luU3R5bGUoJy5tYXJrZG93bi1zb3VyY2Utdmlldy5tb2QtY202IC5jbS1mb2xkLWluZGljYXRvciAuY29sbGFwc2UtaW5kaWNhdG9yJyxcclxuXHRcdFx0XHRcdC8vICdyaWdodDogMDsnLCAncmlnaHQ6IC0xNXB4OycpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbnRhaW5lckVsLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXJ0bCcpO1xyXG5cdFx0XHRcdHRoaXMucmVwbGFjZVBhZ2VTdHlsZUJ5U3RyaW5nKCdMaXN0IGluZGVudCBmaXgnLFxyXG5cdFx0XHRcdFx0YC8qIExpc3QgaW5kZW50IGZpeCAqLyAvKiBFbXB0eSBydWxlIGZvciBMVFIgKi9gLCB0cnVlKTtcclxuXHRcdFx0XHQvLyB0aGlzLnJlcGxhY2VTdHJpbmdJblN0eWxlKCcubWFya2Rvd24tc291cmNlLXZpZXcubW9kLWNtNiAuY20tZm9sZC1pbmRpY2F0b3IgLmNvbGxhcHNlLWluZGljYXRvcicsXHJcblx0XHRcdFx0XHQvLyAncmlnaHQ6IC0xNXB4OycsICdyaWdodDogMDsnKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLnJlcGxhY2VQYWdlU3R5bGVCeVN0cmluZygnRW1iZWRkZWQgbGlua3MgYWx3YXlzIExUUicsXHJcblx0XHRcdFx0YC8qIEVtYmVkZGVkIGxpbmtzIGFsd2F5cyBMVFIgKi8gLmVtYmVkZGVkLWJhY2tsaW5rcyB7IGRpcmVjdGlvbjogbHRyOyB9YCwgdHJ1ZSk7XHJcblx0XHRcdHZpZXcuZWRpdG9yLnJlZnJlc2goKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodmlldykge1xyXG5cdFx0XHQvLyBGaXggdGhlIGxpc3QgaW5kZW50YXRpb24gc3R5bGVcclxuXHRcdFx0dGhpcy5yZXBsYWNlUGFnZVN0eWxlQnlTdHJpbmcoJ0NvZGVNaXJyb3ItcnRsIHByZScsXHJcblx0XHRcdFx0YC5Db2RlTWlycm9yLXJ0bCBwcmUgeyB0ZXh0LWluZGVudDogMHB4ICFpbXBvcnRhbnQ7IH1gLFxyXG5cdFx0XHRcdHRydWUpO1xyXG5cclxuXHRcdFx0aWYgKHRoaXMuc2V0dGluZ3Muc2V0WWFtbERpcmVjdGlvbikge1xyXG5cdFx0XHRcdGNvbnN0IGFsaWduU2lkZSA9IG5ld0RpcmVjdGlvbiA9PSAncnRsJyA/ICdyaWdodCcgOiAnbGVmdCc7XHJcblx0XHRcdFx0dGhpcy5yZXBsYWNlUGFnZVN0eWxlQnlTdHJpbmcoJ1BhdGNoIFlBTUwnLFxyXG5cdFx0XHRcdFx0YC8qIFBhdGNoIFlBTUwgUlRMICovIC5sYW5ndWFnZS15bWwgY29kZSB7IHRleHQtYWxpZ246ICR7YWxpZ25TaWRlfTsgfWAsIHRydWUpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodGhpcy5zZXR0aW5ncy5zZXROb3RlVGl0bGVEaXJlY3Rpb24pIHtcclxuXHRcdFx0XHR2YXIgbGVhZkNvbnRhaW5lciA9ICh0aGlzLmFwcC53b3Jrc3BhY2UuYWN0aXZlTGVhZiBhcyBhbnkpLmNvbnRhaW5lckVsIGFzIERvY3VtZW50O1xyXG5cdFx0XHRcdGxldCBoZWFkZXIgPSBsZWFmQ29udGFpbmVyLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ3ZpZXctaGVhZGVyLXRpdGxlLWNvbnRhaW5lcicpO1xyXG5cdFx0XHRcdChoZWFkZXJbMF0gYXMgYW55KS5zdHlsZS5kaXJlY3Rpb24gPSBuZXdEaXJlY3Rpb247XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRoaXMuc2V0RXhwb3J0RGlyZWN0aW9uKG5ld0RpcmVjdGlvbik7XHJcblx0XHR9XHJcblxyXG5cdH1cclxuXHJcblx0c2V0RXhwb3J0RGlyZWN0aW9uKG5ld0RpcmVjdGlvbjogc3RyaW5nKSB7XHJcblx0XHR0aGlzLnJlcGxhY2VQYWdlU3R5bGVCeVN0cmluZygnc2VhcmNoZWQgYW5kIHJlcGxhY2VkJyxcclxuXHRcdFx0YC8qIFRoaXMgaXMgc2VhcmNoZWQgYW5kIHJlcGxhY2VkIGJ5IHRoZSBwbHVnaW4gKi8gQG1lZGlhIHByaW50IHsgYm9keSB7IGRpcmVjdGlvbjogJHtuZXdEaXJlY3Rpb259OyB9IH1gLFxyXG5cdFx0XHRmYWxzZSk7XHJcblx0fVxyXG5cclxuXHQvLyBSZXR1cm5zIHRydWUgaWYgYSByZXBsYWNlbWVudCB3YXMgbWFkZVxyXG5cdHJlcGxhY2VQYWdlU3R5bGVCeVN0cmluZyhzZWFyY2hTdHJpbmc6IHN0cmluZywgbmV3U3R5bGU6IHN0cmluZywgYWRkSWZOb3RGb3VuZDogYm9vbGVhbikge1xyXG5cdFx0bGV0IGFscmVhZHlFeGlzdHMgPSBmYWxzZTtcclxuXHRcdGxldCBzdHlsZSA9IHRoaXMuZmluZFBhZ2VTdHlsZShzZWFyY2hTdHJpbmcpO1xyXG5cdFx0aWYgKHN0eWxlKSB7XHJcblx0XHRcdGlmIChzdHlsZS5nZXRUZXh0KCkgPT09IHNlYXJjaFN0cmluZylcclxuXHRcdFx0XHRhbHJlYWR5RXhpc3RzID0gdHJ1ZTtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdHN0eWxlLnNldFRleHQobmV3U3R5bGUpO1xyXG5cdFx0fSBlbHNlIGlmIChhZGRJZk5vdEZvdW5kKSB7XHJcblx0XHRcdGxldCBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XHJcblx0XHRcdHN0eWxlLnRleHRDb250ZW50ID0gbmV3U3R5bGU7XHJcblx0XHRcdGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHN0eWxlICYmICFhbHJlYWR5RXhpc3RzO1xyXG5cdH1cclxuXHJcblx0Ly8gUmV0dXJucyB0cnVlIGlmIGEgcmVwbGFjZW1lbnQgd2FzIG1hZGVcclxuXHRyZXBsYWNlU3RyaW5nSW5TdHlsZShzZWFyY2hTdHJpbmc6IHN0cmluZywgd2hhdFRvUmVwbGFjZTogc3RyaW5nLCByZXBsYWNlbWVudDogc3RyaW5nKSB7XHJcblx0XHRsZXQgc3R5bGUgPSB0aGlzLmZpbmRQYWdlU3R5bGUoc2VhcmNoU3RyaW5nKTtcclxuXHRcdGlmIChzdHlsZSAmJiBzdHlsZS5nZXRUZXh0KCkuaW5jbHVkZXMod2hhdFRvUmVwbGFjZSkpIHtcclxuXHRcdFx0Y29uc3QgbmV3VGV4dCA9IHN0eWxlLmdldFRleHQoKS5yZXBsYWNlKHdoYXRUb1JlcGxhY2UsIHJlcGxhY2VtZW50KTtcclxuXHRcdFx0c3R5bGUudGV4dENvbnRlbnQgPSBuZXdUZXh0O1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdGZpbmRQYWdlU3R5bGUocmVnZXg6IHN0cmluZykge1xyXG5cdFx0bGV0IHN0eWxlcyA9IGRvY3VtZW50LmhlYWQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3N0eWxlJyk7XHJcblx0XHRmb3IgKGxldCBzdHlsZSBvZiBzdHlsZXMpIHtcclxuXHRcdFx0aWYgKHN0eWxlLmdldFRleHQoKS5tYXRjaChyZWdleCkpXHJcblx0XHRcdFx0cmV0dXJuIHN0eWxlO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHRwYXRjaEF1dG9DbG9zZUJyYWNrZXRzKGNtRWRpdG9yOiBhbnksIG5ld0RpcmVjdGlvbjogc3RyaW5nKSB7XHJcblx0XHQvLyBBdXRvLWNsb3NlIGJyYWNrZXRzIGRvZXNuJ3Qgd29yayBpbiBSVEw6IGh0dHBzOi8vZ2l0aHViLmNvbS9lc203L29ic2lkaWFuLXJ0bC9pc3N1ZXMvN1xyXG5cdFx0Ly8gVW50aWwgdGhlIGFjdHVhbCBmaXggaXMgcmVsZWFzZWQgKGFzIHBhcnQgb2YgQ29kZU1pcnJvciksIHdlIHN0b3JlIHRoZSB2YWx1ZSBvZiBhdXRvQ2xvc2VCcmFja2V0cyB3aGVuXHJcblx0XHQvLyBzd2l0Y2hpbmcgdG8gUlRMLCBvdmVycmlkaW5nIGl0IHRvICdmYWxzZScgYW5kIHJlc3RvcmluZyBpdCB3aGVuIGJhY2sgdG8gTFRSLlxyXG5cdFx0aWYgKG5ld0RpcmVjdGlvbiA9PSAncnRsJykge1xyXG5cdFx0XHR0aGlzLmF1dG9DbG9zZUJyYWNrZXRzVmFsdWUgPSBjbUVkaXRvci5nZXRPcHRpb24oJ2F1dG9DbG9zZUJyYWNrZXRzJyk7XHJcblx0XHRcdGNtRWRpdG9yLnNldE9wdGlvbignYXV0b0Nsb3NlQnJhY2tldHMnLCBmYWxzZSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjbUVkaXRvci5zZXRPcHRpb24oJ2F1dG9DbG9zZUJyYWNrZXRzJywgdGhpcy5hdXRvQ2xvc2VCcmFja2V0c1ZhbHVlKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHRvZ2dsZURvY3VtZW50RGlyZWN0aW9uKCkge1xyXG5cdFx0bGV0IG5ld0RpcmVjdGlvbiA9IHRoaXMuZ2V0RG9jdW1lbnREaXJlY3Rpb24oKSA9PT0gJ2x0cicgPyAncnRsJyA6ICdsdHInO1xyXG5cdFx0dGhpcy5zZXREb2N1bWVudERpcmVjdGlvbihuZXdEaXJlY3Rpb24pO1xyXG5cdFx0aWYgKHRoaXMuc2V0dGluZ3MucmVtZW1iZXJQZXJGaWxlICYmIHRoaXMuY3VycmVudEZpbGUgJiYgdGhpcy5jdXJyZW50RmlsZS5wYXRoKSB7XHJcblx0XHRcdHRoaXMuc2V0dGluZ3MuZmlsZURpcmVjdGlvbnNbdGhpcy5jdXJyZW50RmlsZS5wYXRoXSA9IG5ld0RpcmVjdGlvbjtcclxuXHRcdFx0dGhpcy5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGdldERvY3VtZW50RGlyZWN0aW9uKCkge1xyXG5cdFx0aWYgKHRoaXMuZWRpdG9yTW9kZSA9PT0gJ2NtNScpIHtcclxuXHRcdFx0dmFyIGNtRWRpdG9yID0gdGhpcy5nZXRDbUVkaXRvcigpO1xyXG5cdFx0XHRyZXR1cm4gY21FZGl0b3I/LmdldE9wdGlvbignZGlyZWN0aW9uJykgPT09ICdydGwnID8gJ3J0bCcgOiAnbHRyJztcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiB0aGlzLmZpbmRQYWdlU3R5bGUoJ05ldyBlZGl0b3IgY29udGVudCBkaXYuKmRpcmVjdGlvbjogcnRsJykgPyAncnRsJyA6ICdsdHInO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Z2V0RnJvbnRNYXR0ZXJEaXJlY3Rpb24oZmlsZTogVEZpbGUpIHtcclxuXHRcdGNvbnN0IGZpbGVDYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpO1xyXG5cdFx0Y29uc3QgZnJvbnRNYXR0ZXIgPSBmaWxlQ2FjaGU/LmZyb250bWF0dGVyO1xyXG5cdFx0aWYgKGZyb250TWF0dGVyICYmIGZyb250TWF0dGVyPy5kaXJlY3Rpb24pIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRjb25zdCBkaXJlY3Rpb24gPSBmcm9udE1hdHRlci5kaXJlY3Rpb247XHJcblx0XHRcdFx0cmV0dXJuIGRpcmVjdGlvbjtcclxuXHRcdFx0fVxyXG5cdFx0XHRjYXRjaCAoZXJyb3IpIHt9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRzeW5jRGVmYXVsdERpcmVjdGlvbigpIHtcclxuXHRcdC8vIFN5bmMgdGhlIHBsdWdpbiBkZWZhdWx0IGRpcmVjdGlvbiB3aXRoIE9ic2lkaWFuJ3Mgb3duIHNldHRpbmdcclxuXHRcdGNvbnN0IG9ic2lkaWFuRGlyZWN0aW9uID0gKHRoaXMuYXBwLnZhdWx0IGFzIGFueSkuZ2V0Q29uZmlnKCdyaWdodFRvTGVmdCcpID8gJ3J0bCcgOiAnbHRyJztcclxuXHRcdGlmIChvYnNpZGlhbkRpcmVjdGlvbiAhPSB0aGlzLnNldHRpbmdzLmRlZmF1bHREaXJlY3Rpb24pIHtcclxuXHRcdFx0dGhpcy5zZXR0aW5ncy5kZWZhdWx0RGlyZWN0aW9uID0gb2JzaWRpYW5EaXJlY3Rpb247XHJcblx0XHRcdHRoaXMuc2F2ZVNldHRpbmdzKCk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBSdGxTZXR0aW5nc1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xyXG5cdHNldHRpbmdzOiBTZXR0aW5ncztcclxuXHRwbHVnaW46IFJ0bFBsdWdpbjtcclxuXHJcblx0Y29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogUnRsUGx1Z2luKSB7XHJcblx0XHRzdXBlcihhcHAsIHBsdWdpbik7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMuc2V0dGluZ3MgPSBwbHVnaW4uc2V0dGluZ3M7XHJcblx0fVxyXG5cclxuXHRkaXNwbGF5KCk6IHZvaWQge1xyXG5cdFx0bGV0IHtjb250YWluZXJFbH0gPSB0aGlzO1xyXG5cclxuXHRcdGNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblxyXG5cdFx0Y29udGFpbmVyRWwuY3JlYXRlRWwoJ2gyJywge3RleHQ6ICdSVEwgU2V0dGluZ3MnfSk7XHJcblxyXG5cdFx0dGhpcy5wbHVnaW4uc3luY0RlZmF1bHREaXJlY3Rpb24oKTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUoJ1JlbWVtYmVyIHRleHQgZGlyZWN0aW9uIHBlciBmaWxlJylcclxuXHRcdFx0LnNldERlc2MoJ1N0b3JlIGFuZCByZW1lbWJlciB0aGUgdGV4dCBkaXJlY3Rpb24gdXNlZCBmb3IgZWFjaCBmaWxlIGluZGl2aWR1YWxseS4nKVxyXG5cdFx0XHQuYWRkVG9nZ2xlKHRvZ2dsZSA9PiB0b2dnbGUuc2V0VmFsdWUodGhpcy5zZXR0aW5ncy5yZW1lbWJlclBlckZpbGUpXHJcblx0XHRcdFx0XHQgICAub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0XHRcdCAgIHRoaXMuc2V0dGluZ3MucmVtZW1iZXJQZXJGaWxlID0gdmFsdWU7XHJcblx0XHRcdFx0XHRcdCAgIHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdFx0XHQgICB0aGlzLnBsdWdpbi5hZGp1c3REaXJlY3Rpb25Ub0N1cnJlbnRGaWxlKCk7XHJcblx0XHRcdFx0XHQgICB9KSk7XHJcblxyXG5cdFx0bmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcblx0XHRcdC5zZXROYW1lKCdEZWZhdWx0IHRleHQgZGlyZWN0aW9uJylcclxuXHRcdFx0LnNldERlc2MoJ1doYXQgc2hvdWxkIGJlIHRoZSBkZWZhdWx0IHRleHQgZGlyZWN0aW9uIGluIE9ic2lkaWFuPycpXHJcblx0XHRcdC5hZGREcm9wZG93bihkcm9wZG93biA9PiBkcm9wZG93bi5hZGRPcHRpb24oJ2x0cicsICdMVFInKVxyXG5cdFx0XHRcdFx0XHQgLmFkZE9wdGlvbigncnRsJywgJ1JUTCcpXHJcblx0XHRcdFx0XHRcdCAuc2V0VmFsdWUodGhpcy5zZXR0aW5ncy5kZWZhdWx0RGlyZWN0aW9uKVxyXG5cdFx0XHRcdFx0XHQgLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdCB0aGlzLnNldHRpbmdzLmRlZmF1bHREaXJlY3Rpb24gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHQgKHRoaXMuYXBwLnZhdWx0IGFzIGFueSkuc2V0Q29uZmlnKCdyaWdodFRvTGVmdCcsIHZhbHVlID09ICdydGwnKTtcclxuXHRcdFx0XHRcdFx0XHQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdFx0IHRoaXMucGx1Z2luLmFkanVzdERpcmVjdGlvblRvQ3VycmVudEZpbGUoKTtcclxuXHRcdFx0XHRcdFx0IH0pKTtcclxuXHJcblx0XHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdFx0LnNldE5hbWUoJ1NldCBub3RlIHRpdGxlIGRpcmVjdGlvbicpXHJcblx0XHRcdC5zZXREZXNjKCdJbiBSVEwgbm90ZXMsIGFsc28gc2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIG5vdGUgdGl0bGUuJylcclxuXHRcdFx0LmFkZFRvZ2dsZSh0b2dnbGUgPT4gdG9nZ2xlLnNldFZhbHVlKHRoaXMuc2V0dGluZ3Muc2V0Tm90ZVRpdGxlRGlyZWN0aW9uKVxyXG5cdFx0XHRcdFx0XHQgLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdCB0aGlzLnNldHRpbmdzLnNldE5vdGVUaXRsZURpcmVjdGlvbiA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRcdFx0XHQgdGhpcy5wbHVnaW4uYWRqdXN0RGlyZWN0aW9uVG9DdXJyZW50RmlsZSgpO1xyXG5cdFx0XHRcdFx0XHQgfSkpO1xyXG5cclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG5cdFx0XHQuc2V0TmFtZSgnU2V0IFlBTUwgZGlyZWN0aW9uIGluIFByZXZpZXcnKVxyXG5cdFx0XHQuc2V0RGVzYygnRm9yIFJUTCBub3RlcywgcHJldmlldyBZQU1MIGJsb2NrcyBhcyBSVEwuIChXaGVuIHR1cm5pbmcgb2ZmLCByZXN0YXJ0IG9mIE9ic2lkaWFuIGlzIHJlcXVpcmVkLiknKVxyXG5cdFx0XHQuYWRkVG9nZ2xlKHRvZ2dsZSA9PiB0b2dnbGUuc2V0VmFsdWUodGhpcy5zZXR0aW5ncy5zZXRZYW1sRGlyZWN0aW9uID8/IGZhbHNlKVxyXG5cdFx0XHRcdFx0XHQgLm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdCB0aGlzLnNldHRpbmdzLnNldFlhbWxEaXJlY3Rpb24gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdFx0XHQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHRcdFx0XHRcdFx0IHRoaXMucGx1Z2luLmFkanVzdERpcmVjdGlvblRvQ3VycmVudEZpbGUoKTtcclxuXHRcdFx0XHRcdFx0IH0pKTtcclxuXHR9XHJcbn1cclxuIl0sIm5hbWVzIjpbIlBsdWdpbiIsIk1hcmtkb3duVmlldyIsIlBsdWdpblNldHRpbmdUYWIiLCJTZXR0aW5nIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQXFEQTtBQUNPLFNBQVMsU0FBUyxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRTtBQUM3RCxJQUFJLFNBQVMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLE9BQU8sS0FBSyxZQUFZLENBQUMsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsVUFBVSxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUNoSCxJQUFJLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLFVBQVUsT0FBTyxFQUFFLE1BQU0sRUFBRTtBQUMvRCxRQUFRLFNBQVMsU0FBUyxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7QUFDbkcsUUFBUSxTQUFTLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7QUFDdEcsUUFBUSxTQUFTLElBQUks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
