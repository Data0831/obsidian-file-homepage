import { Plugin, Notice, Menu, MarkdownView, Editor } from 'obsidian';
import { MyPluginSetting, MyPluginSettingTab } from './MyPluginSetting';
import { HomepageView } from './homepage/HomepageView';
import { TableEditModal } from './table/TableEditModal';

export const VIEW_TYPE_HOMEPAGE = "homepage-view";
export class MyPlugin extends Plugin {
    pluginSetting: MyPluginSetting;

    getHomepageView(): HomepageView | null {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_HOMEPAGE);
        return leaves.length > 0 ? leaves[0].view as HomepageView : null;
    }

    async onload() {
        this.pluginSetting = Object.assign(new MyPluginSetting(), await this.loadData());
        this.addSettingTab(new MyPluginSettingTab(this.app, this));
        this.registerView(VIEW_TYPE_HOMEPAGE, (leaf) => new HomepageView(leaf, this));
        this.registerCommands();

        // 註冊表格右鍵選單
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu: Menu) => {
                menu.addItem((item) => {
                    item
                        .setTitle('在表格編輯器中開啟')
                        .setIcon('table')
                        .onClick(() => {
                            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                            if (view) {
                                const editor = view.editor;
                                if (this.isCursorInTable(editor)) {
                                    this.openTableModal(editor);
                                }
                            }
                        });
                });
            })
        );
    }

    private registerCommands() {
        // 開啟首頁
        this.addCommand({
            id: 'open-homepage',
            name: 'Open Homepage',
            hotkeys: [{ modifiers: [], key: 'F2' }],
            callback: () => {
                this.activateView();
            }
        });

        // 更新首頁
        this.addCommand({
            id: 'update-homepage',
            name: 'Update Homepage',
            hotkeys: [{ modifiers: [], key: 'F5' }],
            callback: () => {
                const view = this.getHomepageView();
                if (view) {
                    view.viewService.build();
                } else {
                    new Notice('首頁視圖未打開');
                }
            }
        });

        // 切換模式
        this.addCommand({
            id: 'switch-mode-homepage',
            name: 'Switch Mode (read/write)',
            hotkeys: [{ modifiers: [], key: 'F3' }],
            callback: async () => {
                const view = this.getHomepageView();
                if (view) {
                    if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    view.homepageSetting.editMode = !view.homepageSetting.editMode;
                    view.viewService.build();
                } else {
                    new Notice('首頁視圖未打開');
                }
            }
        });

        // 切換表格編輯模式
        this.addCommand({
            id: 'switch-mode-table',
            name: 'Switch Table Mode (read/write)',
            hotkeys: [{ modifiers: [], key: 'F4' }],
            callback: async () => {
                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (view) {
                    const editor = view.editor;
                    if (this.isCursorInTable(editor)) {
                        const tableData = this.extractTableTextToMap(editor);
                        if (!tableData) return;

                        const modal = new TableEditModal(this.app, tableData, (newTableText: string) => {
                            const { from, to } = this.getTableRange(editor);
                            editor.replaceRange(newTableText, from, to);
                        }, this.pluginSetting);

                        modal.setting.editMode = !modal.setting.editMode;
                        modal.commonBuildService.buildTable();
                    } else {
                        new Notice('游標不在表格內');
                    }
                } else {
                    new Notice('游標不在 Markdown 視圖內');
                }
            }
        });
    }

    async activateView() {
        const { workspace } = this.app;
        let leaf = workspace.getLeavesOfType(VIEW_TYPE_HOMEPAGE)[0];
        if (!leaf) {
            leaf = workspace.getLeaf(true);
            await leaf.setViewState({
                type: VIEW_TYPE_HOMEPAGE,
                active: true,
            });
        }
        workspace.revealLeaf(leaf);
    }

    async saveSettings() {
        await this.saveData(this.pluginSetting);
    }

    private isCursorInTable(editor: Editor): boolean {
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        return line.includes('|');
    }

    private openTableModal(editor: Editor) {
        const tableData = this.extractTableTextToMap(editor);
        if (!tableData) return;

        if (tableData === null) return;
        const modal = new TableEditModal(this.app, tableData, (newTableText: string) => {
            // 更新表格內容
            const { from, to } = this.getTableRange(editor);
            editor.replaceRange(newTableText, from, to);
        }, this.pluginSetting);

        modal.open();
    }

    private extractTableTextToMap(editor: Editor): Map<string, string>[] | null {
        const cursor = editor.getCursor();
        let startLine = cursor.line;
        let endLine = cursor.line;

        // 向上尋找表格開始
        while (startLine > 0 && editor.getLine(startLine - 1).includes('|')) {
            startLine--;
        }

        // 向下尋找表格結束
        while (endLine < editor.lineCount() - 1 && editor.getLine(endLine + 1).includes('|')) {
            endLine++;
        }

        const tableLines = [];
        for (let i = startLine; i <= endLine; i++) {
            const line = editor.getLine(i).trim();
            if (line && !line.match(/^\|[-:\s|]+\|$/)) { // 排除分隔行
                tableLines.push(line);
            }
        }

        if (tableLines.length < 2) return null;

        const result: Map<string, string>[] = []

        // 處理標題行
        const headerCells = tableLines[0]
            .split('|')
            .slice(1, -1) // 移除首尾空元素
            .map(header => ({
                value: header.trim(),
                isEmpty: header.trim() === ''
            }));

        // 如果標題行有空元素或重複，則返回 null
        if (headerCells.some(cell => cell.isEmpty)) {
            new Notice('標題行有空元素');
            return null;
        }
        if (headerCells.some(cell => headerCells.filter(c => c.value === cell.value).length > 1)) {
            new Notice('標題行有重複');
            return null;
        }

        // 處理數據行
        for (let i = 1; i < tableLines.length; i++) {
            const rowCells = tableLines[i]
                .split('|')
                .slice(1, -1) // 移除首尾空元素
                .map(cell => ({
                    value: cell.trim(),
                }));

            // 建立該行的 Map
            const rowMap = new Map<string, string>();

            // 將每個單元格與對應的標題配對
            headerCells.forEach((header, index) => {
                // 如果該列沒有對應的值，創建一個空的 TableCell
                const cell = rowCells[index] || { value: '' };
                rowMap.set(header.value, cell.value);
            });

            result.push(rowMap);
        }

        return result;
    }

    private getTableRange(editor: Editor) {
        const cursor = editor.getCursor();
        let startLine = cursor.line;
        let endLine = cursor.line;

        while (startLine > 0 && editor.getLine(startLine - 1).includes('|')) {
            startLine--;
        }

        while (endLine < editor.lineCount() - 1 && editor.getLine(endLine + 1).includes('|')) {
            endLine++;
        }

        return {
            from: { line: startLine, ch: 0 },
            to: { line: endLine, ch: editor.getLine(endLine).length }
        };
    }
}