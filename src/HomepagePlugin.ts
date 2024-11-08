import { Plugin, WorkspaceLeaf, Notice } from 'obsidian';
import { MyPluginSettings, MyPluginSettingTab } from './PluginSetting';
import { HomepageView } from './HomepageView';
import { VIEW_TYPE_HOMEPAGE } from './types';

export default class HomepagePlugin extends Plugin {
    settings: MyPluginSettings;

    getHomepageView(): HomepageView | null {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_HOMEPAGE);
        return leaves.length > 0 ? leaves[0].view as HomepageView : null;
    }

    async onload() {
        this.settings = Object.assign(new MyPluginSettings(), await this.loadData());
        this.addSettingTab(new MyPluginSettingTab(this.app, this));
        this.registerView(VIEW_TYPE_HOMEPAGE, (leaf) => new HomepageView(leaf, this));
        this.registerCommands();
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
            id: 'switch-mode',
            name: 'Switch Mode (read/write)',
            hotkeys: [{ modifiers: [], key: 'F3' }],
            callback: () => {
                const view = this.getHomepageView();
                if (view) {
                    view.homepageSetting.editMode = !view.homepageSetting.editMode;
                    view.viewService.build();
                    view.viewService.build();
                } else {
                    new Notice('首頁視圖未打開');
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
        await this.saveData(this.settings);
    }
}