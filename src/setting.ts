import { App, PluginSettingTab, Setting } from 'obsidian';
import Homepage from '../main';

export class MyPluginSettings {
    autoUpdateOnChange: boolean = false;
    enableAutoUpdate: boolean = false;
    timeUpdate: number = 20;

    enableDarkMode: boolean = false;
    tableFontSize: number = 18;
    tagButtonFontSize: number = 16;

    myFrontmatter: string[] = [];
    myFrontmatterKey: string[] = [];

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
                    .setValue(this.plugin.settings.enableAutoUpdate)
                    .onChange(async (value) => {
                        this.plugin.settings.enableAutoUpdate = value;
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
            .addText(text => text.setValue(this.plugin.settings.tagButtonFontSize.toString()).onChange(async (value) => {
                this.plugin.settings.tagButtonFontSize = parseInt(value);
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('frontmatterKey')
            .setDesc('table 的 header，如果沒有設定默認使用 null 請用逗號隔開如: 日期,描述')
            .addText(text => text.setValue(this.plugin.settings.myFrontmatterKey.join(',')).onChange(async (value) => {
                this.plugin.settings.myFrontmatterKey = value.split(',');
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('frontmatter')
            .setDesc('table 的資料key，請用逗號隔開如: date,desc')
            .addText(text => text.setValue(this.plugin.settings.myFrontmatter.join(',')).onChange(async (value) => {
                this.plugin.settings.myFrontmatter = value.split(',');
                await this.plugin.saveSettings();
            }));
    }
}