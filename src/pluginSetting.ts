import { App, PluginSettingTab, Setting } from 'obsidian';
import Homepage from '../main';

export class MyPluginSettings {
    autoUpdateOnChange: boolean = false;
    allowAutoUpdate: boolean = false;
    timeUpdate: number = 20;

    enableDarkMode: boolean = false;
    tableFontSize: number = 18;
    fileButtonFontSize: number = 16;

    myFrontmatter: string[] = [];
    myTableHeader: string[] = [];
    myCustomTabsButton: string[] = [];
}

export class MyPluginSettingTab extends PluginSettingTab {
    plugin: Homepage;

    constructor(app: App, plugin: Homepage) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl('h2', { text: 'Tag search page plugin settings' });

        new Setting(containerEl)
            .setName('黑暗模式')
            .setDesc('預設是亮色模式，目前默認無法使用')
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.enableDarkMode)
                    .onChange(async (value) => {
                        // 目前默認無法使用 todo: 增加 dark mode
                        this.plugin.settings.enableDarkMode = false;
                        await this.plugin.saveSettings();
                    }));

        new Setting(containerEl)
            .setName('啟用自動更新頁面')
            .setDesc('預設是開啟')
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.allowAutoUpdate)
                    .onChange(async (value) => {
                        this.plugin.settings.allowAutoUpdate = value;
                        this.plugin.settings.autoUpdateOnChange = true;
                        await this.plugin.saveSettings();
                    }));

        new Setting(containerEl)
            .setName('更新時間')
            .setDesc('預設是 20 秒，最少 2 秒，要先啟用自動更新才有效')
            .addText(text => text.setValue(this.plugin.settings.timeUpdate.toString()).onChange(async (value) => {
                let intValue = parseInt(value);
                if (intValue >= 2) {
                    this.plugin.settings.timeUpdate = intValue;
                    this.plugin.settings.autoUpdateOnChange = true;
                    await this.plugin.saveSettings();
                }
            }));

        new Setting(containerEl)
            .setName('表格字體大小')
            .setDesc('預設是 18px')
            .addText(text => text.setValue(this.plugin.settings.tableFontSize.toString()).onChange(async (value) => {
                this.plugin.settings.tableFontSize = parseInt(value);
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('按鈕字體大小')
            .setDesc('預設是 16px')
            .addText(text => text.setValue(this.plugin.settings.fileButtonFontSize.toString()).onChange(async (value) => {
                this.plugin.settings.fileButtonFontSize = parseInt(value);
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('myTableHeader')
            .setDesc('table 的 header，請用逗號隔開如: 日期,描述')
            .addText(text => text.setValue(this.plugin.settings.myTableHeader.join(',')).onChange(async (value) => {
                this.plugin.settings.myTableHeader = value.split(',');
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('frontmatter')
            .setDesc('table 的資料key，請用逗號隔開如: date,desc')
            .addText(text => text.setValue(this.plugin.settings.myFrontmatter.join(',')).onChange(async (value) => {
                this.plugin.settings.myFrontmatter = value.split(',');
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('custom tabs')
            .setDesc('tabs 資料，請用逗號隔開如: folder,#tag')
            .addTextArea(text => text.setValue(this.plugin.settings.myCustomTabsButton.join(',\n'))
                .setPlaceholder('folder,#tag')
                .onChange(async (value) => {
                    this.plugin.settings.myCustomTabsButton = value.split(',').map(item => {
                        item = item.trim();
                        item = item.replace(/^"|"$/g, '');
                        return item;
                    });
                    await this.plugin.saveSettings();
                })).setClass('custom-textarea');
    }
}