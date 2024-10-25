import { Plugin, WorkspaceLeaf, ItemView, Notice, TFile, setIcon, stripHeading } from 'obsidian';
import { MyPluginSettings, MyPluginSettingTab } from './src/setting';
export const VIEW_TYPE_HOMEPAGE = "homepage-view";

export default class Homepage extends Plugin {
    settings: MyPluginSettings;

    getHomepageView(): HomepageView | null {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_HOMEPAGE);
        if (leaves.length > 0) {
            return leaves[0].view as HomepageView;
        }
        return null;
    }

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new MyPluginSettingTab(this.app, this));
        this.registerView(
            VIEW_TYPE_HOMEPAGE,
            (leaf) => new HomepageView(leaf, this)
        );
        this.addCommand({
            id: 'open-homepage',
            name: 'Open Homepage',
            callback: () => {
                this.activateView();
            }
        });

        this.addCommand({
            id: 'update-homepage',
            name: 'Update Homepage',
            callback: () => {
                const view = this.getHomepageView();
                if (view) {
                    view.update();
                } else {
                    new Notice('首頁視圖未打開');
                }
            }
        });
    }

    async loadSettings() {
        const data = await this.loadData();
        this.settings = Object.assign(new MyPluginSettings(), data);
    }

    async saveSettings() {
        await this.saveData(this.settings);

        // 如果開啟自動更新，則更新所有首頁視圖
        if (this.settings.autoUpdateOnChange) {
            const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_HOMEPAGE);
            leaves.forEach(leaf => {
                const view = leaf.view as HomepageView;
                if (view) {
                    view.doAutoUpdate(this.settings.allowAutoUpdate, this.settings.timeUpdate);
                }
            });
        }
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf = workspace.getLeavesOfType(VIEW_TYPE_HOMEPAGE)[0];
        if (!leaf) {
            leaf = workspace.getLeaf(false);
            await leaf.setViewState({
                type: VIEW_TYPE_HOMEPAGE,
                active: true,
            });
        }
        workspace.revealLeaf(leaf);
    }
}

class HomepageSetting {
    // 特殊字符 $| (不要刪除)
    readonly defaultSortFrontmatter: string = "$|file";
    readonly noTagValue: string = '#$|no-tags';
    readonly rootFolderValue: string = '$|root-folder'; // todo: 決定是否要使用
    readonly noTagValueShow: string = '#no-tags';
    readonly rootFolderShowValue: string = 'root';

    autoUpdateInterval: NodeJS.Timeout | null = null;
    searchValue: string = this.noTagValue;
    sortFrontmatter: string = this.defaultSortFrontmatter;
    sortAsc: boolean = true;
    tabSelected: string = 'folder'; // tag or folder
    tabs: string[] = ['folder', 'tag', 'custom'];
}

class HomepageView extends ItemView {
    homepageSetting: HomepageSetting;
    pluginSettings: MyPluginSettings;
    plugin: Homepage;

    constructor(leaf: WorkspaceLeaf, plugin: Homepage) {
        super(leaf);
        this.plugin = plugin;
        this.pluginSettings = plugin.settings;
        this.homepageSetting = new HomepageSetting();
    }

    getViewType() {
        return VIEW_TYPE_HOMEPAGE;
    }

    getDisplayText() {
        return "首頁";
    }

    getIcon() {
        return "home";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        this.build();

        // 當頁面打開時，啟動自動更新
        if (this.pluginSettings.allowAutoUpdate) {
            this.doAutoUpdate(this.pluginSettings.allowAutoUpdate);
        }
    }

    async onClose() {
        // 當頁面關閉時，停止自動更新
        this.doAutoUpdate(false);
    }

    doAutoUpdate(enableAutoUpdate = false, timeUpdate = this.pluginSettings.timeUpdate) {
        this.pluginSettings.allowAutoUpdate = enableAutoUpdate;
        this.pluginSettings.timeUpdate = timeUpdate;

        // 開啟 或 時間變化
        if (enableAutoUpdate) {
            if (this.homepageSetting.autoUpdateInterval !== null) {
                clearInterval(this.homepageSetting.autoUpdateInterval);
                this.homepageSetting.autoUpdateInterval = null;
            }
            this.homepageSetting.autoUpdateInterval = setInterval(async () => {
                await this.update();
                console.log(`auto update ${this.pluginSettings.timeUpdate} s`);
            }, this.pluginSettings.timeUpdate * 1000);
        } else {
            if (this.homepageSetting.autoUpdateInterval !== null) {
                clearInterval(this.homepageSetting.autoUpdateInterval);
                this.homepageSetting.autoUpdateInterval = null;
            }
        }
    }

    async update() {
        const folders = this.getFolders();
        const container = this.containerEl.children[1];
        container.empty();
        this.build();
    }

    /**
    * 取得所有 tags 但不包含 no-tags
    */
    getTags(): string[] {
        const tags = new Set<string>();
        const files = this.app.vault.getMarkdownFiles();

        for (const file of files) {
            const cache = this.app.metadataCache.getFileCache(file);

            if (cache) {
                // 這邊暫時不用，因為我的 tag 是寫在 frontmatter 裡面
                // if (cache.tags) {
                //     console.log(`Tags found in ${file.path}:`, cache.tags);
                //     cache.tags.forEach(tag => tags.add(tag.tag));
                // } else {
                //     console.log(`No tags found in ${file.path}`);
                // }

                // 檢查前置元數據中的標籤
                if (cache.frontmatter && cache.frontmatter.tags) {
                    if (Array.isArray(cache.frontmatter.tags)) {
                        cache.frontmatter.tags.forEach(tag => tags.add(`#${tag}`));
                    } else if (typeof cache.frontmatter.tags === 'string') {
                        tags.add(`#${cache.frontmatter.tags}`);
                    }
                }
            } else {
                new Notice(`無法找到 ${file.path} 的緩存`);
            }
        }

        // 根據 tags 的 length 排序
        return Array.from(tags).sort((a, b) => {
            return this.buttonValueSort(a.length, b.length);
        });
    }

    /**
    * 取得所有 folders 包含 root-folder
    */
    getFolders(): string[] {
        const folders = new Set<string>();
        const files = this.app.vault.getMarkdownFiles();
        files.forEach(file => {
            folders.add(file.parent?.name || '');
        });

        return Array.from(folders).sort((a, b) => {
            return this.buttonValueSort(a.length, b.length);
        });
    }

    fileSort(files: TFile[]) {
        if (this.homepageSetting.sortFrontmatter === this.homepageSetting.defaultSortFrontmatter && !this.pluginSettings.myFrontmatter.contains(this.homepageSetting.sortFrontmatter)) {
            return (this.homepageSetting.sortAsc) ? files.reverse() : files;
        }

        files.sort((a, b) => {
            const aValue = this.app.metadataCache.getFileCache(a)?.frontmatter?.[this.homepageSetting.sortFrontmatter];
            const bValue = this.app.metadataCache.getFileCache(b)?.frontmatter?.[this.homepageSetting.sortFrontmatter];
            return (aValue || '').localeCompare(bValue || '');
        });
        return (this.homepageSetting.sortAsc) ? files : files.reverse();
    }

    buttonValueSort(num1: number, num2: number) {
        return num1 - num2;
    }

    getFilesByTag(tag: string): TFile[] {
        // 尋找包含 tag 的檔案
        if (tag[0] === '#') {
            tag = tag.slice(1);
        }
        const files = this.app.vault.getMarkdownFiles();
        const result = files.filter(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            return cache?.frontmatter?.tags?.includes(tag);
        });
        return result;
    }

    getFilesByNoTag(): TFile[] {
        const files = this.app.vault.getMarkdownFiles();
        const result = files.filter(file => {
            return !this.app.metadataCache.getFileCache(file)?.frontmatter?.tags;
        });
        return result;
    }

    getFilesByFolder(folder: string): TFile[] {
        const files = this.app.vault.getMarkdownFiles();
        const result = files.filter(file => {
            return file.parent?.name === folder;
        });
        return result;
    }

    build() {
        this.buildSegment();
        this.buildContent();
    }

    buildSegment() {
        function addTab(text: string, parent: HTMLElement, homepage: HomepageView) {
            const tab = parent.createEl('button', { text: text, cls: 'tab-button' });
            const homepageSetting = homepage.homepageSetting;
            const fontSize = homepage.pluginSettings.fileButtonFontSize;

            tab.style.fontSize = `${fontSize}px`;
            if (text === homepageSetting.tabSelected) {
                tab.classList.add('selected');
            }
            tab.onclick = () => {
                parent.querySelectorAll('.tab-button').forEach(button => {
                    button.classList.remove('selected');
                });
                tab.classList.add('selected');
                homepageSetting.tabSelected = text;
                homepage.updateButton();
            };
            return tab;
        }
        const container = this.containerEl.children[1];
        const SegmentContainer = container.createEl('div', { cls: 'Segment-container' });
        const tabsButtonContainer = SegmentContainer.createEl('div', { cls: 'tabs-button-container' });
        this.homepageSetting.tabs.forEach(tab => {
            addTab(tab, tabsButtonContainer, this);
        })

        SegmentContainer.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            const target = event.target as HTMLElement;
            const button = target.closest('button');
            if (button && button.textContent) {
                if (this.homepageSetting.tabSelected !== 'custom') {
                    if (!this.pluginSettings.myCustomTabsButton.includes(button.textContent)) {
                        this.pluginSettings.myCustomTabsButton.push(button.textContent);
                        new Notice(`已添加 "${button.textContent}" 到自定義標籤`);
                    }
                } else {
                    const index = this.pluginSettings.myCustomTabsButton.indexOf(button.textContent);
                    if (index > -1) {
                        this.pluginSettings.myCustomTabsButton.splice(index, 1);
                        new Notice(`已從自定義標籤中移除 "${button.textContent}"`);
                    }
                }
                // 保存設置
                this.plugin.saveSettings();
                // 更新按鈕顯示
                this.updateButton();
            }
        });

        this.updateButton();
    }

    buildContent() {
        const container = this.containerEl.children[1];
        const contentContainer = container.createEl('div', { cls: 'content-container' });
        this.buildSearchBar();
        this.updateTableByValue();
    }

    buildSearchBar() {
        function addSearchIcon(iconId: string, parent: HTMLElement) {
            const iconEl = parent.createEl("span");
            setIcon(iconEl, iconId);
            return iconEl;
        }

        // data
        let totalFilesCount = this.app.vault.getMarkdownFiles().length;
        let currentFilesCount = 0;

        // elements
        const container = this.containerEl.children[1];
        const contentContainer = container.querySelector('.content-container') ?? container.createEl('div', { cls: 'content-container' });
        const floatingBar = contentContainer.createEl('div', { cls: 'floating-bar' });
        const countDiv = floatingBar.createEl('span');
        countDiv.innerHTML = `<span id="file-count">${currentFilesCount}</span> / ${totalFilesCount}`;

        // sort
        const sortDiv = floatingBar.createEl('div', { cls: 'sort-container' });

        // sort select
        const sortSelect = sortDiv.createEl('select', { attr: { id: 'sort-select' } });
        sortSelect.createEl('option', { value: 'default', text: '不排序' });
        this.pluginSettings.myFrontmatter.forEach(frontmatter => {
            sortSelect.createEl('option', { value: frontmatter, text: frontmatter });
        });
        sortSelect.onchange = () => {
            this.homepageSetting.sortFrontmatter = sortSelect.value;
            this.updateTableByValue();
        }

        // sort checkbox
        const reverseSortCheckbox = sortDiv.createEl('input', { type: 'checkbox', attr: { id: 'reverse-sort' } });
        reverseSortCheckbox.checked = !this.homepageSetting.sortAsc;
        reverseSortCheckbox.onclick = () => {
            this.homepageSetting.sortAsc = !this.homepageSetting.sortAsc;
            reverseSortCheckbox.checked = !this.homepageSetting.sortAsc;
            this.updateTableByValue();
        }
        sortDiv.createEl('label', { text: '倒序', attr: { for: 'reverse-sort' } });

        // search
        const searchContainer = floatingBar.createEl('div', { cls: 'search-container' });
        const searchIcon = searchContainer.createEl('span', { cls: 'search-icon' });
        addSearchIcon('search', searchIcon); // 使用 Obsidian 內置的搜索圖標
        const searchInput = searchContainer.createEl('input', {
            type: 'text',
            attr: {
                id: 'search-input',
                placeholder: '搜索...'
            }
        });

        // searchInput 使用者 enter 事件
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.homepageSetting.searchValue = searchInput.value;
                this.updateTableByValue();
            }
        });
    }

    updateButton() {
        const container = this.containerEl.children[1];
        const SegmentContainer = container.querySelector('.Segment-container') ?? container.createEl('div', { cls: 'Segment-container' });
        SegmentContainer.querySelector('.file-button-container')?.remove();
        const fileButtonContainer = SegmentContainer.createEl('div', { cls: 'file-button-container' });
        fileButtonContainer.style.fontSize = `${this.pluginSettings.fileButtonFontSize}px`;

        let fileButtonValues: string[] = [];
        if (this.homepageSetting.tabSelected === 'tag') {
            fileButtonValues = this.getTags();
        } else if (this.homepageSetting.tabSelected === 'folder') {
            fileButtonValues = this.getFolders();
        } else if (this.homepageSetting.tabSelected === 'custom') {
            // todo: 決定是否要使用
            fileButtonValues = this.pluginSettings.myCustomTabsButton;
        }

        if (fileButtonValues.length > 0) {
            fileButtonValues.forEach(value => {
                let buttonShowValue = value;
                if (value === '') {
                    buttonShowValue = this.homepageSetting.rootFolderShowValue;
                    value = this.homepageSetting.rootFolderValue;
                }


                const button = fileButtonContainer.createEl('button', { text: `${buttonShowValue}`, cls: 'file-button' });
                button.style.fontSize = `${this.pluginSettings.fileButtonFontSize}px`;
                button.onclick = () => {
                    this.homepageSetting.searchValue = value;
                    this.updateTableByValue();
                };
            });
            fileButtonContainer.createEl('span', { text: `${fileButtonValues.length} 項 ` });
        }

        if (this.homepageSetting.tabSelected === 'tag') {
            const noTagButton = fileButtonContainer.createEl('button', { text: `#no-tags`, cls: 'no-tag-button' });
            noTagButton.style.fontSize = `${this.pluginSettings.fileButtonFontSize}px`;
            noTagButton.onclick = () => {
                this.homepageSetting.searchValue = this.homepageSetting.noTagValue;
                this.updateTableByValue();
            };
        }
    }

    updateFileCount(count: number) {
        const countSpan = this.containerEl.children[1].querySelector('#file-count');
        if (countSpan) countSpan.textContent = `${count}`;
    }

    updateTableByValue(value: string = this.homepageSetting.searchValue) {
        value = value.trim();

        if (value === '') {
            new Notice('空選項');
            return;
        }

        if (value === this.homepageSetting.rootFolderValue) {
            value = '';
        }

        let files = (value[0] === '#') ? (value === this.homepageSetting.noTagValue ? this.getFilesByNoTag() : this.getFilesByTag(value)) : this.getFilesByFolder(value);
        files = this.fileSort(files);
        this.updateTableByFiles(files);
    }

    updateTableByFiles(files: TFile[]) {
        const container = this.containerEl.children[1];
        const contentContainer = container.querySelector('.content-container') ?? container.createEl('div', { cls: 'content-container' });
        contentContainer.querySelector('.tableContainer')?.remove();
        const tableContainer = contentContainer.createEl('div', { cls: 'tableContainer' });
        const header = tableContainer.createEl('div', { attr: { id: 'title' } });

        let valueTitle = this.homepageSetting.searchValue;
        if (valueTitle === this.homepageSetting.noTagValue)
            valueTitle = this.homepageSetting.noTagValueShow;
        else if (valueTitle === this.homepageSetting.rootFolderValue)
            valueTitle = this.homepageSetting.rootFolderShowValue;

        header.innerHTML = `<span class="value-title"> ${valueTitle} </span> <span class="file-count">${files.length} 個檔案</span>`;

        if (files.length !== 0) {
            const table = tableContainer.createEl('table');
            table.style.fontSize = `${this.pluginSettings.tableFontSize}px`;

            const thead = table.createEl('thead');
            const tbody = table.createEl('tbody');

            const headerRow = thead.createEl('tr');
            for (let i = 0; i <= this.pluginSettings.myFrontmatter.length; i++) {
                headerRow.createEl('th', { text: this.pluginSettings.myFrontmatterKey[i] || 'null' });
            }

            files.forEach(file => {
                const cache = this.app.metadataCache.getFileCache(file);
                const row = tbody.createEl('tr');

                // 創建一個包含檔案連結的單元格
                const linkCell = row.createEl('td');
                const link = linkCell.createEl('a', {
                    text: file.basename,
                    cls: 'internal-link',
                    attr: {
                        'data-href': file.path,
                        href: file.path
                    }
                });

                // 添加點擊事件處理器
                link.addEventListener('click', (event) => {
                    event.preventDefault();
                    this.app.workspace.openLinkText(file.path, '', false);
                });
                for (let i = 0; i < this.pluginSettings.myFrontmatter.length; i++) {
                    row.createEl('td', { text: cache?.frontmatter?.[this.pluginSettings.myFrontmatter[i]] || 'null' });
                }
            });
        }
        this.updateFileCount(files.length);
    }
}





