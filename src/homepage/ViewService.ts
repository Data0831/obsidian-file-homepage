import { HomepageView } from './HomepageView';
import { Notice, setIcon, TFile } from 'obsidian';
import * as YAML from 'yaml';

export class ViewService {
    constructor(private view: HomepageView) { }

    buildSegment() {
        const addTab = (text: string, parent: HTMLElement) => {
            const tab = parent.createEl('button', { text: text, cls: 'tab-button' });
            const homepageSetting = this.view.homepageSetting;
            const fontSize = this.view.plugin.pluginSetting.fileButtonFontSize;

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
                this.buildButton();
            };
            return tab;
        }

        const container = this.view.containerEl.children[1];
        const myContainer = container.querySelector('.my-container') ?? container.createEl('div', { cls: 'my-container' });

        const SegmentContainer = myContainer.createEl('div', { cls: 'Segment-container' });
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
                    if (!this.view.plugin.pluginSetting.CustomButton.includes(button.textContent)) {
                        this.view.plugin.pluginSetting.CustomButton.push(button.textContent);
                        new Notice(`已添加 "${button.textContent}" 到自定義標籤`);
                    }
                } else {
                    const index = this.view.plugin.pluginSetting.CustomButton.indexOf(button.textContent);
                    if (index > -1) {
                        this.view.plugin.pluginSetting.CustomButton.splice(index, 1);
                        new Notice(`已從自定義標籤中移除 "${button.textContent}"`);
                    }
                }
                this.view.plugin.saveSettings();
                this.buildButton();
            }
        });

        this.buildButton();
    }

    buildContent() {
        const container = this.view.containerEl.children[1];
        const myContainer = container.querySelector('.my-container') ?? container.createEl('div', { cls: 'my-container' });
        const contentContainer = myContainer.querySelector('.content-container') ?? myContainer.createEl('div', { cls: 'content-container' });
        this.buildSearchBar();
        this.buildTable();
    }

    build() {
        const container = this.view.containerEl.children[1];
        container.empty();
        const myContainer = container.createEl('div', { cls: 'my-container' });
        this.buildSegment();
        this.buildContent();
    }

    buildButton() {
        const container = this.view.containerEl.children[1];
        const SegmentContainer = container.querySelector('.Segment-container') ?? container.createEl('div', { cls: 'Segment-container' });
        SegmentContainer.querySelector('.file-button-container')?.remove();
        const fileButtonContainer = SegmentContainer.createEl('div', { cls: 'file-button-container' });
        fileButtonContainer.style.fontSize = `${this.view.plugin.pluginSetting.fileButtonFontSize}px`;

        const fileButtonValues: string[] = this.view.fileService.getFileButtonValues();

        if (fileButtonValues.length > 0) {
            fileButtonValues.forEach(value => {
                let buttonShowValue = value;
                if (value[0] !== '#') {
                    buttonShowValue = value.split('/').pop() || this.view.homepageSetting.rootFolderText;
                }

                const button = fileButtonContainer.createEl('button', { text: buttonShowValue, cls: 'file-button' });
                button.style.fontSize = `${this.view.plugin.pluginSetting.fileButtonFontSize}px`;

                button.onclick = () => {
                    this.view.homepageSetting.searchValue = value;
                    const filesAmount = this.buildTable();
                    new Notice(`${buttonShowValue} 中共有 ${filesAmount} 個檔案`, 700);
                };
            });
            fileButtonContainer.createEl('span', { text: `${fileButtonValues.length} 項 ` });
        }

        if (this.view.homepageSetting.tabSelected === 'tag') {
            const noTagButton = fileButtonContainer.createEl('button', {
                text: this.view.homepageSetting.noTagText,
                cls: 'no-tag-button'
            });
            noTagButton.style.fontSize = `${this.view.plugin.pluginSetting.fileButtonFontSize}px`;
            noTagButton.onclick = () => {
                this.view.homepageSetting.searchValue = this.view.homepageSetting.noTagValue;
                const filesAmount = this.buildTable();
                new Notice(`${this.view.homepageSetting.noTagText} 中共有 ${filesAmount} 個檔案`, 700);
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
            value: this.view.homepageSetting.defaultFrontmatter,
            text: '不排序'
        });

        this.view.plugin.pluginSetting.Frontmatter.forEach((frontmatter: string) => {
            sortSelect.createEl('option', { value: frontmatter, text: frontmatter });
        });

        sortSelect.onchange = () => {
            this.view.homepageSetting.sortKey = sortSelect.value;
            this.buildTable();
        }

        const reverseSortCheckbox = sortDiv.createEl('input', {
            type: 'checkbox',
            attr: { id: 'reverse-sort' }
        });
        reverseSortCheckbox.checked = !this.view.homepageSetting.ascending;
        reverseSortCheckbox.onclick = () => {
            this.view.homepageSetting.ascending = !this.view.homepageSetting.ascending;
            reverseSortCheckbox.checked = !this.view.homepageSetting.ascending;
            this.buildTable();
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
                this.buildTable();
            }
        });
    }

    buildTable(value: string = this.view.homepageSetting.searchValue): number {
        value = value.trim();

        if (value === '') {
            return 0;
        }

        return this.buildTableByFiles(this.view.fileService.getFilesByValue(value));
    }

    buildTableTitle(tableContainer: HTMLElement) {
        const lineContainer = tableContainer.createEl('div', { attr: { id: 'table-title-line' } });

        const getTitle = () => {
            if (this.view.homepageSetting.searchValue === this.view.homepageSetting.noTagValue)
                return this.view.homepageSetting.noTagText;
            return this.view.homepageSetting.searchValue;
        };

        let valueTitle = getTitle();
        const title = lineContainer.createEl('span', { attr: { id: 'title-label' }, text: valueTitle });
        title.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            this.showContextMenu(event, lineContainer);
        });

        const settingContainer = lineContainer.createEl('span', { cls: 'title-setting-container' });

        const showSubFolderCheckbox = settingContainer.createEl('input', {
            type: 'checkbox',
            attr: { id: 'show-sub-folder' },
        });
        showSubFolderCheckbox.checked = this.view.homepageSetting.showSubFolder;
        showSubFolderCheckbox.onclick = () => {
            this.view.homepageSetting.showSubFolder = showSubFolderCheckbox.checked;
            this.build();
        }
        settingContainer.createEl('label', { text: '顯示子資料夾內容', attr: { for: 'show-sub-folder' } });
    }

    buildTableByFiles(files: TFile[]): number {
        const fmatterAndsortAsc = (a: TFile, b: TFile) => {
            let adjust = 1;
            if (this.view.homepageSetting.ascending == false) adjust = -1;

            // 不排序
            if (this.view.homepageSetting.sortKey === this.view.homepageSetting.defaultFrontmatter) {
                return adjust * a.basename.localeCompare(b.basename);
            }

            // 排序
            const aValue = this.view.app.metadataCache.getFileCache(a)?.frontmatter?.[this.view.homepageSetting.sortKey];
            const bValue = this.view.app.metadataCache.getFileCache(b)?.frontmatter?.[this.view.homepageSetting.sortKey];
            return adjust * (aValue || '').localeCompare(bValue || '');
        }

        files.sort((a, b) => {
            return fmatterAndsortAsc(a, b);
        });

        const container = this.view.containerEl.children[1];
        const contentContainer = container.querySelector('.content-container') ?? container.createEl('div', { cls: 'content-container' });
        contentContainer.querySelector('.table-and-title-container')?.remove();
        const tableAndTitleContainer = contentContainer.createEl('div', { cls: 'table-and-title-container' });
        this.buildTableTitle(tableAndTitleContainer);

        const buildHeader = (headerRow: HTMLElement) => {
            if (this.view.plugin.pluginSetting.TableHeader.length > 0) {
                for (let i = 0; i <= this.view.plugin.pluginSetting.Frontmatter.length; i++) {
                    headerRow.createEl('th', { text: this.view.plugin.pluginSetting.TableHeader[i] || 'null' });
                }
            } else {
                headerRow.createEl('th', { text: "file" });
                this.view.plugin.pluginSetting.Frontmatter.forEach((header: string) => {
                    headerRow.createEl('th', { text: header });
                });
            }
        }

        if (files.length !== 0) {
            const fileTableContainer = tableAndTitleContainer.createEl('div', { attr: { id: 'file-table-container' } });
            const table = fileTableContainer.createEl('table');
            table.style.fontSize = `${this.view.plugin.pluginSetting.tableFontSize}px`;
            
            // 設置列數變數
            const columnCount = this.view.plugin.pluginSetting.Frontmatter.length + 1; // +1 是因為還有檔案名稱列
            table.style.setProperty('--column-count', columnCount.toString());

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

                for (let i = 0; i < this.view.plugin.pluginSetting.Frontmatter.length; i++) {
                    if (this.view.homepageSetting.editMode) {
                        const td = row.createEl('td');
                        const input = td.createEl('input', {
                            value: cache?.frontmatter?.[this.view.plugin.pluginSetting.Frontmatter[i]] || '',
                            cls: 'edit-input',
                            attr: {
                                type: 'text',
                                placeholder: `輸入 ${this.view.plugin.pluginSetting.Frontmatter[i]}`,
                                spellcheck: 'false'
                            }
                        });
                        input.style.fontSize = `${this.view.plugin.pluginSetting.tableFontSize}px`;

                        input.addEventListener('blur', async () => {
                            const newValue = input.value;
                            const oldValue = cache?.frontmatter?.[this.view.plugin.pluginSetting.Frontmatter[i]] || '';

                            if (newValue !== oldValue) {
                                await this.saveFileFrontmatter(file, {
                                    [this.view.plugin.pluginSetting.Frontmatter[i]]: newValue
                                });
                            }
                        });
                    }
                    else {
                        row.createEl('td', {
                            text: cache?.frontmatter?.[this.view.plugin.pluginSetting.Frontmatter[i]] || 'null'
                        });
                    }
                }
            }

            files.forEach(file => {
                buildRow(file);
            });
        }

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
        //todo: 可參考 obsidian 的 style
        document.querySelector('.context-menu')?.remove();
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${event.pageX}px`;
        menu.style.top = `${event.pageY}px`;

        const menuItems = [
            { text: '重命名資料夾文件', action: () => { } },
            { text: '搬移資料夾文件', action: () => { } },
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