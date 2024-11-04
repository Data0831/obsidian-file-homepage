import { HomepageView } from '../HomepageView';
import { Notice, setIcon, TFile, CachedMetadata } from 'obsidian';
import * as YAML from 'yaml';

export class ViewService {
    constructor(private view: HomepageView) {}

    buildSegment() {
        const addTab = (text: string, parent: HTMLElement) => {
            const tab = parent.createEl('button', { text: text, cls: 'tab-button' });
            const homepageSetting = this.view.homepageSetting;
            const fontSize = this.view.plugin.settings.fileButtonFontSize;

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
                this.updateButton();
            };
            return tab;
        }

        const container = this.view.containerEl.children[1];
        const SegmentContainer = container.createEl('div', { cls: 'Segment-container' });
        const tabsButtonContainer = SegmentContainer.createEl('div', { cls: 'tabs-button-container' });
        this.view.homepageSetting.tabs.forEach(tab => {
            addTab(tab, tabsButtonContainer);
        });

        SegmentContainer.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            const target = event.target as HTMLElement;
            const button = target.closest('button');
            if (button && button.textContent) {
                if (this.view.homepageSetting.tabSelected !== 'custom') {
                    if (!this.view.plugin.settings.myCustomTabsButton.includes(button.textContent)) {
                        this.view.plugin.settings.myCustomTabsButton.push(button.textContent);
                        new Notice(`已添加 "${button.textContent}" 到自定義標籤`);
                    }
                } else {
                    const index = this.view.plugin.settings.myCustomTabsButton.indexOf(button.textContent);
                    if (index > -1) {
                        this.view.plugin.settings.myCustomTabsButton.splice(index, 1);
                        new Notice(`已從自定義標籤中移除 "${button.textContent}"`);
                    }
                }
                this.view.plugin.saveSettings();
                this.updateButton();
            }
        });

        this.updateButton();
    }

    buildContent() {
        const container = this.view.containerEl.children[1];
        container.createEl('div', { cls: 'content-container' });
        this.buildSearchBar();
        this.updateTableByValue();
    }

    update() {
        const container = this.view.containerEl.children[1];
        container.empty();
        this.buildSegment();
        this.buildContent();
    }

    doAutoUpdate(enableAutoUpdate = false, timeUpdate: number) {
        if (enableAutoUpdate) {
            if (this.view.homepageSetting.autoUpdateInterval !== null) {
                clearInterval(this.view.homepageSetting.autoUpdateInterval);
                this.view.homepageSetting.autoUpdateInterval = null;
            }
            this.view.homepageSetting.autoUpdateInterval = setInterval(async () => {
                await this.update();
                console.log(`auto update ${timeUpdate} s`);
            }, timeUpdate * 1000);
        } else {
            if (this.view.homepageSetting.autoUpdateInterval !== null) {
                clearInterval(this.view.homepageSetting.autoUpdateInterval);
                this.view.homepageSetting.autoUpdateInterval = null;
            }
        }
    }

    getFileButtonValues(): string[] {
        const getTags = (): string[] => {
            const addTagByCache = (cache: CachedMetadata) => {
                if (cache.frontmatter && cache.frontmatter.tags) {
                    if (Array.isArray(cache.frontmatter.tags)) {
                        cache.frontmatter.tags.forEach(tag => tags.add(`#${tag}`));
                    } else if (typeof cache.frontmatter.tags === 'string') {
                        tags.add(`#${cache.frontmatter.tags}`);
                    }
                }
            }
            const tags = new Set<string>();
            const files = this.view.app.vault.getMarkdownFiles();

            for (const file of files) {
                const cache = this.view.app.metadataCache.getFileCache(file);
                if (cache) {
                    addTagByCache(cache);
                } else {
                    new Notice(`無法找到 ${file.path} 的緩存`);
                }
            }

            return Array.from(tags).sort((a, b) => {
                return this.buttonValueSort(a.length, b.length);
            });
        }

        const getFoldersPath = (): string[] => {
            const folders = new Set<string>();
            const files = this.view.app.vault.getMarkdownFiles();
            files.forEach(file => {
                folders.add(file.parent?.path || '');
            });

            return Array.from(folders).sort((a, b) => {
                return this.buttonValueSort(a.length, b.length);
            });
        }

        if (this.view.homepageSetting.tabSelected === 'tag') {
            return getTags();
        } else if (this.view.homepageSetting.tabSelected === 'folder') {
            return getFoldersPath();
        } else if (this.view.homepageSetting.tabSelected === 'custom') {
            return this.view.plugin.settings.myCustomTabsButton;
        }
        return [];
    }

    private buttonValueSort(num1: number, num2: number) {
        return num1 - num2;
    }

    getFilesByValue(value: string): TFile[] {
        function isTag(value: string) {
            return value[0] === '#';
        }

        const files = this.view.app.vault.getMarkdownFiles();

        if (value === this.view.homepageSetting.noTagValue) {
            return files.filter(file => {
                return !this.view.app.metadataCache.getFileCache(file)?.frontmatter?.tags;
            });
        }

        if (isTag(value)) {
            value = value.slice(1);
            return files.filter(file => {
                const cache = this.view.app.metadataCache.getFileCache(file);
                return cache?.frontmatter?.tags?.includes(value);
            })
        }

        return files.filter(file => {
            return file.parent?.path === value;
        });
    }

    updateButton() {
        const container = this.view.containerEl.children[1];
        const SegmentContainer = container.querySelector('.Segment-container') ?? container.createEl('div', { cls: 'Segment-container' });
        SegmentContainer.querySelector('.file-button-container')?.remove();
        const fileButtonContainer = SegmentContainer.createEl('div', { cls: 'file-button-container' });
        fileButtonContainer.style.fontSize = `${this.view.plugin.settings.fileButtonFontSize}px`;

        const fileButtonValues: string[] = this.getFileButtonValues();

        if (fileButtonValues.length > 0) {
            fileButtonValues.forEach(value => {
                let buttonShowValue = value;
                if (value[0] !== '#') {
                    buttonShowValue = value.split('/').pop() || this.view.homepageSetting.rootFolderShowValue;
                }

                const button = fileButtonContainer.createEl('button', { text: buttonShowValue, cls: 'file-button' });
                button.style.fontSize = `${this.view.plugin.settings.fileButtonFontSize}px`;

                button.onclick = () => {
                    this.view.homepageSetting.searchValue = value;
                    const filesAmount = this.updateTableByValue();
                    new Notice(`${buttonShowValue} 中共有 ${filesAmount} 個檔案`, 700);
                };
            });
            fileButtonContainer.createEl('span', { text: `${fileButtonValues.length} 項 ` });
        }

        if (this.view.homepageSetting.tabSelected === 'tag') {
            const noTagButton = fileButtonContainer.createEl('button', { 
                text: this.view.homepageSetting.noTagShowValue, 
                cls: 'no-tag-button' 
            });
            noTagButton.style.fontSize = `${this.view.plugin.settings.fileButtonFontSize}px`;
            noTagButton.onclick = () => {
                this.view.homepageSetting.searchValue = this.view.homepageSetting.noTagValue;
                const filesAmount = this.updateTableByValue();
                new Notice(`${this.view.homepageSetting.noTagShowValue} 中共有 ${filesAmount} 個檔案`, 700);
            };
        }
    }

    buildSearchBar() {
        let totalFilesCount = this.view.app.vault.getMarkdownFiles().length;
        let currentFilesCount = 0;

        const container = this.view.containerEl.children[1];
        const contentContainer = container.querySelector('.content-container') ?? container.createEl('div', { cls: 'content-container' });
        const floatingBar = contentContainer.createEl('div', { cls: 'floating-bar' });
        const countDiv = floatingBar.createEl('span');
        countDiv.innerHTML = `<span id="file-count">${currentFilesCount}</span> / ${totalFilesCount}`;

        const sortDiv = floatingBar.createEl('div', { cls: 'sort-container' });
        const sortSelect = sortDiv.createEl('select', { attr: { id: 'sort-select' } });
        sortSelect.createEl('option', { 
            value: this.view.homepageSetting.defaultSortFrontmatter, 
            text: '不排序' 
        });
        
        this.view.plugin.settings.myFrontmatter.forEach((frontmatter: string) => {
            sortSelect.createEl('option', { value: frontmatter, text: frontmatter });
        });
        
        sortSelect.onchange = () => {
            this.view.homepageSetting.sortFrontmatter = sortSelect.value;
            this.updateTableByValue();
        }

        const reverseSortCheckbox = sortDiv.createEl('input', { 
            type: 'checkbox', 
            attr: { id: 'reverse-sort' } 
        });
        reverseSortCheckbox.checked = !this.view.homepageSetting.sortAsc;
        reverseSortCheckbox.onclick = () => {
            this.view.homepageSetting.sortAsc = !this.view.homepageSetting.sortAsc;
            reverseSortCheckbox.checked = !this.view.homepageSetting.sortAsc;
            this.updateTableByValue();
        }
        sortDiv.createEl('label', { text: '倒序', attr: { for: 'reverse-sort' } });

        const searchContainer = floatingBar.createEl('div', { cls: 'search-container' });
        const searchIcon = searchContainer.createEl('span', { cls: 'search-icon' });
        const iconEl = searchIcon.createEl("span");
        setIcon(iconEl, "search");

        const searchInput = searchContainer.createEl('input', {
            type: 'text',
            attr: {
                id: 'search-input',
                placeholder: '搜索...'
            }
        });

        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.view.homepageSetting.searchValue = searchInput.value;
                this.updateTableByValue();
            }
        });
    }

    updateTableByValue(value: string = this.view.homepageSetting.searchValue): number {
        value = value.trim();

        if (value === '') {
            new Notice('不可為空，請輸入正確的值');
            return 0;
        }

        return this.updateTableByFiles(this.getFilesByValue(value));
    }

    updateTableByFiles(files: TFile[]): number {
        const fmatterAndsortAsc = (a: TFile, b: TFile) => {
            let adjust = 1;
            if (this.view.homepageSetting.sortAsc == false) adjust = -1;

            // 不排序
            if (this.view.homepageSetting.sortFrontmatter === this.view.homepageSetting.defaultSortFrontmatter) {
                return adjust * a.basename.localeCompare(b.basename);
            }

            // 排序
            const aValue = this.view.app.metadataCache.getFileCache(a)?.frontmatter?.[this.view.homepageSetting.sortFrontmatter];
            const bValue = this.view.app.metadataCache.getFileCache(b)?.frontmatter?.[this.view.homepageSetting.sortFrontmatter];
            return adjust * (aValue || '').localeCompare(bValue || '');
        }

        files.sort((a, b) => {
            return fmatterAndsortAsc(a, b);
        });

        const container = this.view.containerEl.children[1];
        const contentContainer = container.querySelector('.content-container') ?? container.createEl('div', { cls: 'content-container' });
        contentContainer.querySelector('.tableContainer')?.remove();
        const tableContainer = contentContainer.createEl('div', { cls: 'tableContainer' });
        const titleHeader = tableContainer.createEl('div', { attr: { id: 'title' } });

        const getTitle = () => {
            if (this.view.homepageSetting.searchValue === this.view.homepageSetting.noTagValue)
                return this.view.homepageSetting.noTagShowValue;
            return this.view.homepageSetting.searchValue;
        };

        let valueTitle = getTitle();
        titleHeader.innerHTML = `<span class="value-title"> ${valueTitle} </span> <span class="file-count">${files.length} 個檔案</span>`;

        titleHeader.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            this.showContextMenu(event, titleHeader);
        });

        const buildHeader = (headerRow: HTMLElement) => {
            if (this.view.plugin.settings.myTableHeader.length > 0) {
                for (let i = 0; i <= this.view.plugin.settings.myFrontmatter.length; i++) {
                    headerRow.createEl('th', { text: this.view.plugin.settings.myTableHeader[i] || 'null' });
                }
            } else { // 使用者沒有設定 table header
                headerRow.createEl('th', { text: "file" });
                this.view.plugin.settings.myFrontmatter.forEach((header: string) => {
                    headerRow.createEl('th', { text: header });
                });
            }
        }

        if (files.length !== 0) {
            const table = tableContainer.createEl('table');
            table.style.fontSize = `${this.view.plugin.settings.tableFontSize}px`;

            const thead = table.createEl('thead');
            const tbody = table.createEl('tbody');
            buildHeader(thead);

            const buildRow = (file: TFile) => {
                const cache = this.view.app.metadataCache.getFileCache(file);
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
                    this.view.app.workspace.openLinkText(file.path, '', false);
                });

                for (let i = 0; i < this.view.plugin.settings.myFrontmatter.length; i++) {
                    if (this.view.homepageSetting.editMode) {
                        const td = row.createEl('td');
                        const input = td.createEl('input', {
                            value: cache?.frontmatter?.[this.view.plugin.settings.myFrontmatter[i]] || '',
                            cls: 'edit-input',
                            attr: {
                                type: 'text',
                                placeholder: `輸入 ${this.view.plugin.settings.myFrontmatter[i]}`,
                                spellcheck: 'false'
                            }
                        });
                        input.style.fontSize = `${this.view.plugin.settings.tableFontSize}px`;

                        input.addEventListener('blur', async () => {
                            const newValue = input.value;
                            const oldValue = cache?.frontmatter?.[this.view.plugin.settings.myFrontmatter[i]] || '';

                            if (newValue !== oldValue) {
                                await this.saveFileFrontmatter(file, { 
                                    [this.view.plugin.settings.myFrontmatter[i]]: newValue 
                                });
                            }
                        });
                    }
                    else {
                        row.createEl('td', { 
                            text: cache?.frontmatter?.[this.view.plugin.settings.myFrontmatter[i]] || 'null' 
                        });
                    }
                }
            }

            files.forEach(file => {
                buildRow(file);
            });
        }

        // 更新檔案數量
        const countSpan = this.view.containerEl.children[1].querySelector('#file-count');
        if (countSpan) countSpan.textContent = `${files.length}`;

        return files.length;
    }

    private async saveFileFrontmatter(file: TFile, map: Record<string, any>) {
        const content = await this.view.app.vault.read(file);
        const frontmatter = this.view.app.metadataCache.getFileCache(file)?.frontmatter;

        if (frontmatter) {
            Object.assign(frontmatter, map);
            const newFrontmatterStr = YAML.stringify(frontmatter);
            const newContent = content.replace(/^---\n([\s\S]*?)\n---/, `---\n${newFrontmatterStr}---`);
            await this.view.app.vault.modify(file, newContent);
            new Notice(`檔案 ${file.basename} 的 frontmatter 已更新`);
        } else {
            const newFrontmatter = YAML.stringify(map);
            const newContent = `---\n${newFrontmatter}---\n\n${content}`;
            await this.view.app.vault.modify(file, newContent);
            new Notice(`檔案 ${file.basename} 添加新的 frontmatter`);
        }
    }

    private showContextMenu(event: MouseEvent, element: HTMLElement) {
        document.querySelector('.context-menu')?.remove();
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${event.pageX}px`;
        menu.style.top = `${event.pageY}px`;

        const menuItems = [
            { text: '重命名資料夾文件', action: () => {}},
            { text: '搬移資料夾文件', action: () => {}},
        ];

        menuItems.forEach(item => {
            const menuItem = menu.createEl('div', { text: item.text, cls: 'context-menu-item' });
            menuItem.addEventListener('click', () => {
                item.action();
                menu.remove();
            });
        });

        document.body.appendChild(menu);

        const closeMenu = (e: MouseEvent) => {
            if (!menu.contains(e.target as Node)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }
} 