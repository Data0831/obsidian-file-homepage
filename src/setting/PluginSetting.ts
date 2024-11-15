import { App, PluginSettingTab, Setting } from 'obsidian';
import HomepagePlugin from '../HomepagePlugin';

export class MyPluginSettings {
    enableDarkMode: boolean = false;
    tableFontSize: number = 18;
    fileButtonFontSize: number = 16;

    myFrontmatter: string[] = [];
    myTableHeader: string[] = [];
    myCustomTabsButton: string[] = [];
    showSubFolder: boolean = false;
}

export class MyPluginSettingTab extends PluginSettingTab {
    plugin: HomepagePlugin;

    constructor(app: App, plugin: HomepagePlugin) {
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
                    .setValue(this.plugin.myPluginSettings.enableDarkMode)
                    .onChange(async (value) => {
                        // 目前默認無法使用 todo: 增加 dark mode
                        this.plugin.myPluginSettings.enableDarkMode = false;
                        await this.plugin.saveSettings();
                    }));

        new Setting(containerEl)
            .setName('表格字體大小')
            .setDesc('預設是 18px')
            .addText(text => text.setValue(this.plugin.myPluginSettings.tableFontSize.toString()).onChange(async (value) => {
                this.plugin.myPluginSettings.tableFontSize = parseInt(value);
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('按鈕字體大小')
            .setDesc('預設是 16px')
            .addText(text => text.setValue(this.plugin.myPluginSettings.fileButtonFontSize.toString()).onChange(async (value) => {
                this.plugin.myPluginSettings.fileButtonFontSize = parseInt(value);
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('myTableHeader')
            .setDesc('table 的 header，請用逗號隔開如: 日期,描述')
            .addText(text => text.setValue(this.plugin.myPluginSettings.myTableHeader.join(',')).onChange(async (value) => {
                this.plugin.myPluginSettings.myTableHeader = value.split(',');
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('frontmatter')
            .setDesc('table 的資料key，請用逗號隔開如: date,desc')
            .addText(text => text.setValue(this.plugin.myPluginSettings.myFrontmatter.join(',')).onChange(async (value) => {
                this.plugin.myPluginSettings.myFrontmatter = value.split(',');
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('custom tabs')
            .setDesc('tabs 資料，請用逗號隔開如: folder,#tag')
            .addTextArea(text => text.setValue(this.plugin.myPluginSettings.myCustomTabsButton.join(',\n'))
                .setPlaceholder('folder,#tag')
                .onChange(async (value) => {
                    this.plugin.myPluginSettings.myCustomTabsButton = value.split(',').map(item => {
                        item = item.trim();
                        item = item.replace(/^"|"$/g, '');
                        return item;
                    });
                    await this.plugin.saveSettings();
                })).setClass('custom-textarea');
        
        new Setting(containerEl)
            .setName('顯示子資料夾')
            .setDesc('預設是 false')
            .addToggle(toggle => toggle.setValue(this.plugin.myPluginSettings.showSubFolder).onChange(async (value) => {
                this.plugin.myPluginSettings.showSubFolder = value;
                await this.plugin.saveSettings();
            }));
    }
}