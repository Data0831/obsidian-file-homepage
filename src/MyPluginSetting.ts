import { App, PluginSettingTab, Setting } from 'obsidian';
import { MyPlugin } from './MyPlugin';

export class MyPluginSetting {
    // common
    tableFontSize: number = 18;

    // Homepage
    enableDarkMode: boolean = false;
    fileButtonFontSize: number = 16;
    Frontmatter: string[] = [];
    TableHeader: string[] = [];
    CustomButton: string[] = [];
    showSubFolder: boolean = false;

    // Table
}

export class MyPluginSettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
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
                    .setValue(this.plugin.pluginSetting.enableDarkMode)
                    .onChange(async (value) => {
                        // 目前默認無法使用 todo: 增加 dark mode
                        this.plugin.pluginSetting.enableDarkMode = false;
                        await this.plugin.saveSettings();
                    }));

        new Setting(containerEl)
            .setName('表格字體大小')
            .setDesc('預設是 18px')
            .addText(text => text.setValue(this.plugin.pluginSetting.tableFontSize.toString()).onChange(async (value) => {
                this.plugin.pluginSetting.tableFontSize = parseInt(value);
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('按鈕字體大小')
            .setDesc('預設是 16px')
            .addText(text => text.setValue(this.plugin.pluginSetting.fileButtonFontSize.toString()).onChange(async (value) => {
                this.plugin.pluginSetting.fileButtonFontSize = parseInt(value);
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('myTableHeader')
            .setDesc('table 的 header，請用逗號隔開如: 日期,描述')
            .addText(text => text.setValue(this.plugin.pluginSetting.TableHeader.join(',')).onChange(async (value) => {
                this.plugin.pluginSetting.TableHeader = value.split(',');
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('frontmatter')
            .setDesc('table 的資料key，請用逗號隔開如: date,desc')
            .addText(text => text.setValue(this.plugin.pluginSetting.Frontmatter.join(',')).onChange(async (value) => {
                this.plugin.pluginSetting.Frontmatter = value.split(',');
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl)
            .setName('custom tabs')
            .setDesc('tabs 資料，請用逗號隔開如: folder,#tag')
            .addTextArea(text => text.setValue(this.plugin.pluginSetting.CustomButton.join(',\n'))
                .setPlaceholder('folder,#tag')
                .onChange(async (value) => {
                    this.plugin.pluginSetting.CustomButton = value.split(',').map(item => {
                        item = item.trim();
                        item = item.replace(/^"|"$/g, '');
                        return item;
                    });
                    await this.plugin.saveSettings();
                })).setClass('custom-textarea');
        
        new Setting(containerEl)
            .setName('顯示子資料夾')
            .setDesc('預設是 false')
            .addToggle(toggle => toggle.setValue(this.plugin.pluginSetting.showSubFolder).onChange(async (value) => {
                this.plugin.pluginSetting.showSubFolder = value;
                await this.plugin.saveSettings();
            }));
    }
}