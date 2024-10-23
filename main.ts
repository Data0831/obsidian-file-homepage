import { Plugin, WorkspaceLeaf, ItemView, Notice, TFile, setIcon } from 'obsidian';
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
            (leaf) => new HomepageView(leaf, this.settings)
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
                    view.doAutoUpdate(this.settings.enableAutoUpdate, this.settings.timeUpdate);
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

class HomepageView extends ItemView {
    private autoUpdateInterval: NodeJS.Timeout | null = null;
    private searchValue: string = '';
    private sortFrontmatter: string = "default";
    private sortAsc: boolean = true;

    settings: MyPluginSettings;

    constructor(leaf: WorkspaceLeaf, settings: MyPluginSettings) {
        super(leaf);
        this.settings = settings;
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

        this.buildButton(true);
        this.buildSearchBar();

        // 當頁面打開時，啟動自動更新
        if (this.settings.enableAutoUpdate) {
            this.doAutoUpdate(this.settings.enableAutoUpdate);
        }
    }

    async onClose() {
        // 當頁面關閉時，停止自動更新
        this.doAutoUpdate(false);
    }

    

    doAutoUpdate(enableAutoUpdate = false, timeUpdate = this.settings.timeUpdate) {
        this.settings.enableAutoUpdate = enableAutoUpdate;
        this.settings.timeUpdate = timeUpdate;

        // 開啟 或 時間變化
        if (enableAutoUpdate) {
            if (this.autoUpdateInterval !== null) {
                clearInterval(this.autoUpdateInterval);
                this.autoUpdateInterval = null;
            }
            this.autoUpdateInterval = setInterval(async () => {
                await this.update();
                console.log(`auto update ${this.settings.timeUpdate} s`);
            }, this.settings.timeUpdate * 1000);
        } else {
            if (this.autoUpdateInterval !== null) {
                clearInterval(this.autoUpdateInterval);
                this.autoUpdateInterval = null;
            }
        }
    }

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
                        cache.frontmatter.tags.forEach(tag => tags.add(tag));
                    } else if (typeof cache.frontmatter.tags === 'string') {
                        tags.add(cache.frontmatter.tags);
                    }
                }
            } else {
                new Notice(`無法找到 ${file.path} 的緩存`);
            }
        }

        // 根據 tags 的 length 排序
        return Array.from(tags).sort((a, b) => {
            return a.length - b.length;
        });
    }

    getFilesFromTag(tag: string): TFile[] {
        // 尋找包含 tag 的檔案
        const files = this.app.vault.getMarkdownFiles();
        const result = files.filter(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            return cache?.frontmatter?.tags?.includes(tag);
        });
        return result;
    }

    async update() {
        const container = this.containerEl.children[1];
        container.empty();
        this.buildButton();
        this.buildSearchBar();
        this.buildTagTable(this.searchValue);
    }

    buildTabs() {
        const container = this.containerEl.children[1];
        this.buildButton();
        this.buildSearchBar();
        this.buildTagTable(this.searchValue);
    }

    buildButton(enableNotice: boolean = false) {
        const container = this.containerEl.children[1];
        console.log(this.containerEl.children);
        const tags = this.getTags();
        const tagContainer = container.createEl('div', { cls: 'tag-container' });
        tagContainer.style.fontSize = `${this.settings.tagButtonFontSize}px`;

        if (tags.length > 0) {
            if (enableNotice) {
                new Notice(`已加載 ${tags.length} 個標籤`);
            }

            tags.forEach(tag => {
                const button = tagContainer.createEl('button', { text: `#${tag}`, cls: 'tag-button' });
                button.style.fontSize = `${this.settings.tagButtonFontSize}px`;
                button.onclick = () => {
                    this.searchValue = tag;
                    this.buildTagTable(tag);
                };
            });
            tagContainer.createEl('span', { text: `${tags.length} 項 tags` });
        } else {
            if (enableNotice) {
                new Notice('沒有找到任何標籤');
            }
        }
        const noTagButton = tagContainer.createEl('button', { text: `#no-tags`, cls: 'no-tag-button' });
        noTagButton.style.fontSize = `${this.settings.tagButtonFontSize}px`;
        noTagButton.onclick = () => {
            this.searchValue = '';
            this.buildNoTagTable();
        };
    }

    buildTagTable(tag: string, enableNotice: boolean = false) {
        if (tag === '') {
            if (enableNotice) {
                new Notice('請輸入標籤');
            }
            return;
        }
        this.buildTableFromFiles(this.getFilesFromTag(tag), enableNotice);
    }

    buildNoTagTable(enableNotice: boolean = false) {
        const files = this.app.vault.getMarkdownFiles();
        const noTagFiles = files.filter(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            return cache?.frontmatter?.tags?.length === 0 || !cache?.frontmatter?.tags;
        });
        this.buildTableFromFiles(noTagFiles, enableNotice);
    }

    fileSort(files: TFile[]) {


        if (this.sortFrontmatter === "default" && !this.settings.myFrontmatter.contains(this.sortFrontmatter)) {
            return (this.sortAsc) ? files.reverse() : files;
        }

        files.sort((a, b) => {
            const aValue = this.app.metadataCache.getFileCache(a)?.frontmatter?.[this.sortFrontmatter];
            const bValue = this.app.metadataCache.getFileCache(b)?.frontmatter?.[this.sortFrontmatter];
            return (aValue || '').localeCompare(bValue || '');
        });
        return (this.sortAsc) ? files : files.reverse();
    }

    buildTableFromFiles(files: TFile[], enableNotice: boolean = false) {
        const container = this.containerEl.children[1];

        // 移除舊的表格和相關元素
        const oldTable = container.querySelector('table');
        if (oldTable) oldTable.remove();
        const oldHeader = container.querySelector('#title');
        if (oldHeader) oldHeader.remove();

        files = this.fileSort(files);
        const header = container.createEl('div', { attr: { id: 'title' } });
        header.innerHTML = `<span class="value-title"> ${(this.searchValue.length > 0) ? this.searchValue : 'no-tags'} </span> <span class="file-count">${files.length} 個檔案</span>`;

        if (files.length === 0) {
            if (enableNotice) {
                new Notice(`沒有找到 ${this.searchValue} 文件。`);
            }
        } else {
            const table = container.createEl('table');
            table.style.fontSize = `${this.settings.tableFontSize}px`;

            const thead = table.createEl('thead');
            const tbody = table.createEl('tbody');

            const headerRow = thead.createEl('tr');
            for (let i = 0; i <= this.settings.myFrontmatter.length; i++) {
                headerRow.createEl('th', { text: this.settings.myFrontmatterKey[i] || 'null' });
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
                for (let i = 0; i < this.settings.myFrontmatter.length; i++) {
                    row.createEl('td', { text: cache?.frontmatter?.[this.settings.myFrontmatter[i]] || 'null' });
                }
            });
        }
        this.updateFileCount(files.length);
    }

    buildSearchBar() {
        // data
        let totalFilesCount = this.app.vault.getMarkdownFiles().length;
        let currentFilesCount = 0;

        // elements
        const container = this.containerEl.children[1];
        const floatingBar = container.createEl('div', { cls: 'floating-bar' });
        const countDiv = floatingBar.createEl('span');
        countDiv.innerHTML = `<span id="file-count">${currentFilesCount}</span> / ${totalFilesCount}`;

        // sort
        const sortDiv = floatingBar.createEl('div', { cls: 'sort-container' });

        // sort select
        const sortSelect = sortDiv.createEl('select', { attr: { id: 'sort-select' } });
        sortSelect.createEl('option', { value: 'default', text: '不排序' });
        this.settings.myFrontmatter.forEach(frontmatter => {
            sortSelect.createEl('option', { value: frontmatter, text: frontmatter });
        });
        sortSelect.onchange = () => {
            this.sortFrontmatter = sortSelect.value;
            this.buildTagTable(this.searchValue);
        }

        // sort checkbox
        const reverseSortCheckbox = sortDiv.createEl('input', { type: 'checkbox', attr: { id: 'reverse-sort' } });
        reverseSortCheckbox.checked = !this.sortAsc;
        reverseSortCheckbox.onclick = () => {
            this.sortAsc = !this.sortAsc;
            reverseSortCheckbox.checked = !this.sortAsc;
            this.buildTagTable(this.searchValue);
        }
        sortDiv.createEl('label', { text: '倒序', attr: { for: 'reverse-sort' } });

        // search
        const searchContainer = floatingBar.createEl('div', { cls: 'search-container' });
        const searchIcon = searchContainer.createEl('span', { cls: 'search-icon' });
        this.addIcon('search', searchIcon); // 使用 Obsidian 內置的搜索圖標
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
                this.searchValue = searchInput.value;
                this.buildTagTable(searchInput.value, true);
            }
        });

        // const container = this.containerEl.children[1];
        // const div = container.createEl('div', { cls: 'search-bar-container' });
        // div.createEl('span', { text: '搜尋: ' });
        // const searchBar = div.createEl('input', { cls: 'search-bar' });
        // const button = div.createEl('button', { text: '確認' });
        // button.onclick = () => this.buildTableFileContainTag(searchBar.value);
    }

    updateFileCount(count: number) {
        const countSpan = this.containerEl.children[1].querySelector('#file-count');
        if (countSpan) countSpan.textContent = `${count}`;
    }

    addIcon(iconId: string, parent: HTMLElement) {
        const iconEl = parent.createEl("span");
        setIcon(iconEl, iconId);
        return iconEl;
    }
}





