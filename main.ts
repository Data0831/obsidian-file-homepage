import { Plugin, WorkspaceLeaf, ItemView, Notice, TFile, setIcon, App, CachedMetadata, getAllTags } from 'obsidian';
import { MyPluginSettings, MyPluginSettingTab } from './src/pluginSetting';
import { HomepageSetting } from './src/homepageSetting';
import * as YAML from 'yaml';

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
            hotkeys: [{ modifiers: [], key: 'F2' }],
            callback: () => {
                this.activateView();
            }
        });

        this.addCommand({
            id: 'update-homepage',
            name: 'Update Homepage',
            hotkeys: [{ modifiers: [], key: 'F5' }],
            callback: () => {
                const view = this.getHomepageView();
                if (view) {
                    view.update();
                } else {
                    new Notice('首頁視圖未打開');
                }
            }
        });

        this.addCommand({
            id: 'switch-mode',
            name: 'Switch Mode (read/write)',
            hotkeys: [{ modifiers: [], key: 'F3' }],
            callback: () => {
                const view = this.getHomepageView();
                if (view) {
                    view.homepageSetting.editMode = !view.homepageSetting.editMode;
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



class HomepageView extends ItemView {
    homepageSetting: HomepageSetting;
    pluginSettings: MyPluginSettings;
    homepage: Homepage;

    constructor(leaf: WorkspaceLeaf, homepage: Homepage) {
        super(leaf);
        this.homepage = homepage;
        this.pluginSettings = homepage.settings;
        this.homepageSetting = new HomepageSetting();

        // 綁定新方法
        this.showContextMenu = this.showContextMenu.bind(this);
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
        const container = this.containerEl.children[1];
        container.empty();
        this.build();
    }

    /**
    * 取得所有 tags 但不包含 no-tags
    * 取得所有 folders path 包含 root-folder path
    */
    getFileButtonValues(): string[] {
        /**
        * 取得所有 tags 但不包含 no-tags
        */
        const getTags = (): string[] => {
            const addTagByCache = (cache: CachedMetadata) => {
                // 這邊暫時不用，因為我的 tag 是寫在 frontmatter 裡面
                // if (cache.tags) {
                //     cache.tags.forEach(tag => tags.add(tag.tag));
                // }

                // 檢查前置元數據中的標籤
                if (cache.frontmatter && cache.frontmatter.tags) {
                    if (Array.isArray(cache.frontmatter.tags)) {
                        cache.frontmatter.tags.forEach(tag => tags.add(`#${tag}`));
                    } else if (typeof cache.frontmatter.tags === 'string') {
                        tags.add(`#${cache.frontmatter.tags}`);
                    }
                }
            }
            const tags = new Set<string>();
            const files = this.app.vault.getMarkdownFiles();

            for (const file of files) {
                const cache = this.app.metadataCache.getFileCache(file);

                if (cache) {
                    addTagByCache(cache);
                } else {
                    new Notice(`無法找到 ${file.path} 的緩存`);
                }
            }

            // 根據 tags 的 length 排序
            return Array.from(tags).sort((a, b) => {
                return buttonValueSort(a.length, b.length);
            });
        }

        /**
    * 取得所有 folders 包含 root-folder
        */
        const getFoldersPath = (): string[] => {
            const folders = new Set<string>();
            const files = this.app.vault.getMarkdownFiles();
            files.forEach(file => {
                folders.add(file.parent?.path || '');
            });

            return Array.from(folders).sort((a, b) => {
                return buttonValueSort(a.length, b.length);
            });
        }

        const buttonValueSort = (num1: number, num2: number) => {
            return num1 - num2;
        }

        if (this.homepageSetting.tabSelected === 'tag') {
            return getTags();
        } else if (this.homepageSetting.tabSelected === 'folder') {
            return getFoldersPath();
        } else if (this.homepageSetting.tabSelected === 'custom') {
            return this.pluginSettings.myCustomTabsButton;
        }
        return [];
    }

    /**
    * 根據 value 取得檔案，不排序
    * value 可以是 tag、folder、this.homepageSetting.rootFolderValue、this.homepageSetting.noTagValue
    */
    getFilesByValue(value: string): TFile[] {
        function isTag(value: string) {
            return value[0] === '#';
        }

        const files = this.app.vault.getMarkdownFiles();

        // 取得沒有 tag 的檔案
        if (value === this.homepageSetting.noTagValue) {
            return files.filter(file => {
                return !this.app.metadataCache.getFileCache(file)?.frontmatter?.tags;
            });
        }

        // 尋找包含 tag 的檔案
        if (isTag(value)) {
            value = value.slice(1);
            return files.filter(file => {
                const cache = this.app.metadataCache.getFileCache(file);
                return cache?.frontmatter?.tags?.includes(value);
            })
        }

        // folder and root folder
        return files.filter(file => {
            return file.parent?.path === value;
        });
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
                this.homepage.saveSettings();
                // 更新按鈕顯示
                this.updateButton();
            }
        });

        this.updateButton();
    }

    buildContent() {
        const container = this.containerEl.children[1];
        container.createEl('div', { cls: 'content-container' });
        this.buildSearchBar();
        this.updateTableByValue();
    }

    buildSearchBar() {
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
        sortSelect.createEl('option', { value: this.homepageSetting.defaultSortFrontmatter, text: '不排序' });
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

        // 使用 Obsidian 內置的搜索圖標
        const iconEl = searchIcon.createEl("span");
        setIcon(iconEl, "search");

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

        const fileButtonValues: string[] = this.getFileButtonValues();


        if (fileButtonValues.length > 0) {
            fileButtonValues.forEach(value => {
                // 處理 root folder 和 no-tag 的顯示
                let buttonShowValue = value;
                if (value[0] !== '#') {
                    buttonShowValue = value.split('/').last() || this.homepageSetting.rootFolderShowValue;
                }

                const button = fileButtonContainer.createEl('button', { text: `${buttonShowValue}`, cls: 'file-button' });
                button.style.fontSize = `${this.pluginSettings.fileButtonFontSize}px`;

                // 處理點擊事件
                button.onclick = () => {
                    this.homepageSetting.searchValue = value;
                    const filesAmount = this.updateTableByValue();
                    new Notice(`${buttonShowValue} 中共有 ${filesAmount} 個檔案`, 700);
                };
            });
            fileButtonContainer.createEl('span', { text: `${fileButtonValues.length} 項 ` });
        }

        if (this.homepageSetting.tabSelected === 'tag') {
            const noTagButton = fileButtonContainer.createEl('button', { text: this.homepageSetting.noTagShowValue, cls: 'no-tag-button' });
            noTagButton.style.fontSize = `${this.pluginSettings.fileButtonFontSize}px`;
            noTagButton.onclick = () => {
                this.homepageSetting.searchValue = this.homepageSetting.noTagValue;
                const filesAmount = this.updateTableByValue();
                new Notice(`${this.homepageSetting.noTagShowValue} 中共有 ${filesAmount} 個檔案`, 700);
            };
        }
    }

    updateTableByValue(value: string = this.homepageSetting.searchValue) {
        value = value.trim();

        if (value === '') {
            new Notice('不可為空，請輸入正確的值');
            return;
        }

        return this.updateTableByFiles(this.getFilesByValue(value));
    }

    updateTableByFiles(files: TFile[]) {
        /**
         * 根據 frontmatter 和 sortAsc 排序
         */
        const fmatterAndsortAsc = (a: TFile, b: TFile) => {
            let adjust = 1;
            if (this.homepageSetting.sortAsc == false) adjust = -1;

            // 不排序
            if (this.homepageSetting.sortFrontmatter === this.homepageSetting.defaultSortFrontmatter) {
                return adjust * a.basename.localeCompare(b.basename);
            }

            // 排序
            const aValue = this.app.metadataCache.getFileCache(a)?.frontmatter?.[this.homepageSetting.sortFrontmatter];
            const bValue = this.app.metadataCache.getFileCache(b)?.frontmatter?.[this.homepageSetting.sortFrontmatter];
            return adjust * (aValue || '').localeCompare(bValue || '');

        }

        files.sort((a, b) => {
            return fmatterAndsortAsc(a, b);
        });

        const container = this.containerEl.children[1];
        const contentContainer = container.querySelector('.content-container') ?? container.createEl('div', { cls: 'content-container' });
        contentContainer.querySelector('.tableContainer')?.remove();
        const tableContainer = contentContainer.createEl('div', { cls: 'tableContainer' });
        const titleHeader = tableContainer.createEl('div', { attr: { id: 'title' } });

        const getTitle = () => {
            if (this.homepageSetting.searchValue === this.homepageSetting.noTagValue)
                return this.homepageSetting.noTagShowValue;
            // else if (this.homepageSetting.searchValue === this.homepageSetting.rootFolderValue)
            //     return this.homepageSetting.rootFolderShowValue;
            return this.homepageSetting.searchValue;
        };

        let valueTitle = getTitle();
        titleHeader.innerHTML = `<span class="value-title"> ${valueTitle} </span> <span class="file-count">${files.length} 個檔案</span>`;

        titleHeader.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            this.showContextMenu(event, titleHeader);
        });

        const buildHeader = (headerRow: HTMLElement) => {
            if (this.pluginSettings.myTableHeader.length > 0) {
                for (let i = 0; i <= this.pluginSettings.myFrontmatter.length; i++) {
                    headerRow.createEl('th', { text: this.pluginSettings.myTableHeader[i] || 'null' });
                }
            } else { // 使用者沒有設定 table header
                headerRow.createEl('th', { text: "file" });
                this.pluginSettings.myFrontmatter.forEach(header => {
                    headerRow.createEl('th', { text: header });
                });
            }
        }

        if (files.length !== 0) {
            const table = tableContainer.createEl('table');
            table.style.fontSize = `${this.pluginSettings.tableFontSize}px`;

            const thead = table.createEl('thead');
            const tbody = table.createEl('tbody');
            buildHeader(thead);

            const buildRow = (file: TFile) => {
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

                const saveFileFrontmatter = async (file: TFile, map: Record<string, any>) => {
                    const content = await this.app.vault.read(file);
                    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;

                    if (frontmatter) {
                        // 更新 frontmatter
                        Object.assign(frontmatter, map);

                        // 生成新的 frontmatter 字符串
                        const newFrontmatterStr = YAML.stringify(frontmatter);

                        // 替換原文件內容中的 frontmatter
                        const newContent = content.replace(/^---\n([\s\S]*?)\n---/, `---\n${newFrontmatterStr}---`);

                        // 寫入文件
                        await this.app.vault.modify(file, newContent);

                        new Notice(`檔案 ${file.basename} 的 frontmatter 已更新`);
                    } else {
                        // 如果文件沒有 frontmatter，則創建新的
                        const newFrontmatter = YAML.stringify(map);
                        const newContent = `---\n${newFrontmatter}---\n\n${content}`;
                        await this.app.vault.modify(file, newContent);

                        new Notice(`檔案 ${file.basename} 添加新的 frontmatter`);
                    }
                }


                for (let i = 0; i < this.pluginSettings.myFrontmatter.length; i++) {
                    if (this.homepageSetting.editMode) {
                        const td = row.createEl('td');
                        const input = td.createEl('input', {
                            value: cache?.frontmatter?.[this.pluginSettings.myFrontmatter[i]] || '',
                            cls: 'edit-input',
                            attr: {
                                type: 'text',
                                placeholder: `輸入 ${this.pluginSettings.myFrontmatter[i]}`,
                                spellcheck: 'false'
                            }
                        });
                        input.style.fontSize = `${this.pluginSettings.tableFontSize}px`;

                        // 使用 blur 事件來處理失去焦點的情況
                        input.addEventListener('blur', async (event) => {
                            event.preventDefault();
                            const newValue = input.value;
                            const oldValue = cache?.frontmatter?.[this.pluginSettings.myFrontmatter[i]] || '';

                            // 只有當值發生變化時才更新 frontmatter
                            if (newValue !== oldValue) {
                                await saveFileFrontmatter(file, { [this.pluginSettings.myFrontmatter[i]]: newValue });
                            }
                        });
                    }
                    else {
                        row.createEl('td', { text: cache?.frontmatter?.[this.pluginSettings.myFrontmatter[i]] || 'null' });
                    }
                }

            }

            files.forEach(file => {
                buildRow(file);
            });
        }

        // 更新檔案數量
        const countSpan = this.containerEl.children[1].querySelector('#file-count');
        if (countSpan) countSpan.textContent = `${files.length}`;

        return files.length;
    }

    showContextMenu(event: MouseEvent, element: HTMLElement) {
        document.querySelector('.context-menu')?.remove();
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${event.pageX}px`;
        menu.style.top = `${event.pageY}px`;

        const menuItems = [
            { text: '重命名資料夾文件', action: () => {}},
            { text: '搬移資料夾文件', action: () => {}},
            // 可以根據需要添加更多選項
        ];

        menuItems.forEach(item => {
            const menuItem = menu.createEl('div', { text: item.text, cls: 'context-menu-item' });
            menuItem.addEventListener('click', () => {
                item.action();
                menu.remove();
            });
        });

        document.body.appendChild(menu);

        // 點擊其他地方時關閉選單
        const closeMenu = (e: MouseEvent) => {
            if (!menu.contains(e.target as Node)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }
}



