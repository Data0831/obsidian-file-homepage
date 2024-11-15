import { App, Modal, setIcon } from 'obsidian';
import { MyPluginSettings } from '../setting/PluginSetting';

class TableEditModalSetting {
    readonly defaultSortKey: string = '';
    readonly defaultSearchValue: string = '';
    readonly defaultUndefinedValue: string = '$|undefined';
    editMode: boolean = false;
    sortKey: string = this.defaultSortKey;
    sortAsc: boolean = true;
    searchValue: string = this.defaultSearchValue;
}

export class TableEditModal extends Modal {
    private tableData: Map<string, string>[];
    private filterTableData: Map<string, string>[];
    private onSubmit: (newTableText: string) => void;
    private tableElement: HTMLTableElement;
    public setting: TableEditModalSetting;
    private pluginSettings: MyPluginSettings;

    constructor(
        app: App,
        tableData: Map<string, string>[],
        onSubmit: (newTableText: string) => void,
        pluginSetting: MyPluginSettings
    ) {
        super(app);
        this.tableData = tableData;
        this.filterTableData = tableData.map(map => {
            return new Map(map);
        });
        this.onSubmit = onSubmit;
        this.setting = new TableEditModalSetting();
        this.pluginSettings = pluginSetting;

        // 添加全螢幕 Modal 的 class
        this.containerEl.addClass('table-edit-modal');
    }

    onOpen() {
        // const { contentEl } = this;
        // contentEl.empty();
        this.build();
    }

    getKeys(): string[] {
        let myKey: string[] = [];
        this.tableData[0].forEach((value, key) => {
            myKey.push(key);
        });
        return myKey;
    }

    build() {
        const { contentEl } = this;
        contentEl.empty();

        // 創建主容器並添加樣式
        const myContainer = contentEl.createEl('div', {
            cls: 'my-container modal-content'
        });
        const contentContainer = myContainer.createEl('div', {
            cls: 'content-container'
        });

        this.buildSearchBar();
        this.buildTableByTableData();
    }

    buildSearchBar() {
        let myKey = this.getKeys();
        let cyrrentCount = 0;
        let totalCount = this.tableData.length;
        const { contentEl } = this;
        // 找到或創建 content-container
        const myContainer = contentEl.querySelector('.my-container');
        const contentContainer = myContainer?.querySelector('.content-container');

        if (!contentContainer) return;

        const floatingBar = contentContainer.createEl('div', { cls: 'floating-bar' });
        const countDiv = floatingBar.createEl('span');
        countDiv.innerHTML = `<span id="file-count">${cyrrentCount}</span> / ${totalCount}`;

        const sortDiv = floatingBar.createEl('div', { cls: 'sort-container' });
        const sortSelect = sortDiv.createEl('select', { attr: { id: 'sort-select' } });

        sortSelect.createEl('option', {
            value: this.setting.defaultSortKey,
            text: '不排序'
        });

        myKey.forEach((key: string) => {
            sortSelect.createEl('option', { value: key, text: key });
        });

        sortSelect.onchange = () => {
            this.setting.sortKey = sortSelect.value;
            this.buildTableByTableData();
        }

        const reverseSortCheckbox = sortDiv.createEl('input', {
            type: 'checkbox',
            attr: { id: 'reverse-sort' }
        });

        reverseSortCheckbox.checked = !this.setting.sortAsc;
        reverseSortCheckbox.onclick = () => {
            this.setting.sortAsc = !this.setting.sortAsc;
            reverseSortCheckbox.checked = !this.setting.sortAsc;
            this.buildTableByTableData();
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
                this.setting.searchValue = searchInput.value;
                this.buildTableByTableData();
            }
        });
    }

    buildTableTitle(tableContainer: HTMLElement) {
        const lineContainer = tableContainer.createEl('div', { attr: { id: 'table-title-line' } });
        const settingContainer = lineContainer.createEl('span', { cls: 'title-setting-container' });
        const showSubFolderCheckbox = settingContainer.createEl('input', {
            type: 'checkbox',
            attr: { id: 'show-sub-folder' },
        });
        showSubFolderCheckbox.checked = true;
        // showSubFolderCheckbox.onclick = () => {
        //     this.view.homepageSetting.showSubFolder = showSubFolderCheckbox.checked;
        //     this.build();
        // }
        settingContainer.createEl('label', { text: '顯示子資料夾內容', attr: { for: 'show-sub-folder' } });
    }

    searchTableBySearchValue() {
        let myKey = this.getKeys();
        this.filterTableData = this.tableData.filter(map => {
            return myKey.some(key => map.get(key)?.includes(this.setting.searchValue));
        });
    }

    buildTableByTableData(): number {
        const { contentEl } = this;
        const myContainer = contentEl?.querySelector('.my-container');
        const contentContainer = myContainer?.querySelector('.content-container');
        if (!contentContainer) return 0;

        // 1. 首先複製原始數據
        this.filterTableData = this.tableData.map(map => {
            return new Map(map);
        });

        // 2. 先進行搜尋過濾
        this.searchTableBySearchValue();

        // 3. 然後對過濾後的數據進行排序
        const fmatterAndsortAsc = (a: Map<string, string>, b: Map<string, string>) => {
            let adjust = 1;
            if (this.setting.sortAsc === false) adjust = -1;

            // 不排序
            if (this.setting.sortKey === this.setting.defaultSortKey) {
                return adjust; // 改為返回 0 而不是 adjust
            }
            // 排序
            return adjust * (a.get(this.setting.sortKey) || '').localeCompare(b.get(this.setting.sortKey) || '');
        }

        this.filterTableData.sort((a, b) => {
            return fmatterAndsortAsc(a, b);
        });

        // 4. 構建表格 UI
        contentContainer?.querySelector('.table-and-title-container')?.remove();
        const tableAndTitleContainer = contentContainer?.createEl('div', { cls: 'table-and-title-container' });
        this.buildTableTitle(tableAndTitleContainer);

        let myKey: string[] = this.getKeys();
        const buildHeader = (headerRow: HTMLElement) => {
            headerRow.createEl('th');
            myKey.forEach(key => {
                headerRow.createEl('th', { text: key });
            });
        }

        if (this.filterTableData.length !== 0) {
            const fileTableContainer = tableAndTitleContainer.createEl('div', { attr: { id: 'file-table-container' } });
            const table = fileTableContainer.createEl('table');
            table.style.fontSize = `${this.pluginSettings.tableFontSize}px`;

            // 設置列數變數
            const columnCount = this.getKeys().length + 2; // lineNum and button
            table.style.setProperty('--column-count', columnCount.toString());

            const thead = table.createEl('thead');
            const tbody = table.createEl('tbody');
            buildHeader(thead);

            const buildRow = (map: Map<string, string>) => {
                const row = tbody.createEl('tr');
                const lineNum = row.createEl('td', { text: (this.filterTableData.indexOf(map) + 1).toString() });
                lineNum.style.width = '5%';
                for (let i = 0; i < myKey.length; i++) {
                    if (this.setting.editMode) {
                        const td = row.createEl('td');
                        const input = td.createEl('input', {
                            value: map.get(myKey[i]) || '',
                            cls: 'edit-input',
                            attr: {
                                type: 'text',
                                placeholder: `輸入 ${myKey[i]}`,
                                spellcheck: 'false'
                            }
                        });
                        input.style.fontSize = `${this.pluginSettings.tableFontSize}px`;

                        input.addEventListener('blur', async () => {
                            const newValue = input.value;
                            const oldValue = map.get(myKey[i]) || '';

                            if (newValue !== oldValue) {
                                map.set(myKey[i], newValue);
                            }
                        });
                    }
                    else {
                        row.createEl('td', {
                            text: map.get(myKey[i]) || this.setting.defaultUndefinedValue
                        });
                    }
                }

                // 綁定右鍵選單事件
                row.addEventListener('contextmenu', (event: MouseEvent) => {
                    // 阻止預設的右鍵選單
                    event.preventDefault();
                    event.stopPropagation();
                    // 顯示自定義選單
                    this.showRowContextMenu(event, row, map);
                });
            }

            this.filterTableData.forEach(map => {
                buildRow(map);
            });
        }
        return this.filterTableData.length;
    }

    private showButtonContextMenu(event: MouseEvent, row: HTMLElement, map: Map<string, string>) {
        console.log('button');
    }
    // 右鍵選單
    private showRowContextMenu(event: MouseEvent, row: HTMLElement, map: Map<string, string>) {
        // 移除任何已存在的選單
        document.querySelectorAll('.context-menu').forEach(menu => menu.remove());

        const menu = document.createElement('div');
        menu.className = 'context-menu';

        // 設置選單位置在滑鼠點擊處
        menu.style.top = `${event.pageY}px`;
        menu.style.left = `${event.pageX}px`;

        // 添加選單項目
        const insertAbove = menu.createEl('div', {
            cls: 'context-menu-item',
            text: '在上方插入'
        });

        insertAbove.onclick = () => {
            const newRow = new Map(this.tableData[0]);
            newRow.forEach((value, key) => newRow.set(key, ''));
            const index = this.tableData.indexOf(map);
            this.tableData.splice(index, 0, newRow);
            this.buildTableByTableData();
            menu.remove();
        };

        const insertBelow = menu.createEl('div', {
            cls: 'context-menu-item',
            text: '在下方插入'
        });
        insertBelow.onclick = () => {
            const newRow = new Map(this.tableData[0]);
            newRow.forEach((value, key) => newRow.set(key, ''));
            const index = this.tableData.indexOf(map);
            this.tableData.splice(index + 1, 0, newRow);
            this.buildTableByTableData();
            menu.remove();
        };

        const deleteRow = menu.createEl('div', {
            cls: 'context-menu-item delete-item',
            text: '刪除此列'
        });
        deleteRow.onclick = () => {
            const index = this.tableData.indexOf(map);
            this.tableData.splice(index, 1);
            this.buildTableByTableData();
            menu.remove();
        };

        // 添加到文檔中
        document.body.appendChild(menu);

        // 確保選單不會超出視窗邊界
        const menuRect = menu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        if (menuRect.right > windowWidth) {
            menu.style.left = `${windowWidth - menuRect.width - 5}px`;
        }
        if (menuRect.bottom > windowHeight) {
            menu.style.top = `${windowHeight - menuRect.height - 5}px`;
        }

        // 點擊其他地方關閉選單
        const closeMenu = (e: MouseEvent) => {
            if (!menu.contains(e.target as Node)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };

        // 使用 setTimeout 確保當前的點擊事件不會立即觸發關閉
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }

    private getMarkdownTable(): string {
        const rows = this.tableElement.rows;
        const markdownRows = [];

        // 處理標題行
        const headerCells = Array.from(rows[0].cells).map(cell => {
            const input = cell.querySelector('input');
            return input?.value || '';
        });
        markdownRows.push(`|${headerCells.join('|')}|`);

        // 添加分隔行
        markdownRows.push(`|${headerCells.map(() => '---').join('|')}|`);

        // 處理數據行
        for (let i = 1; i < rows.length; i++) {
            const cells = Array.from(rows[i].cells).map(cell => {
                const input = cell.querySelector('input');
                return input?.value || '';
            });
            markdownRows.push(`|${cells.join('|')}|`);
        }

        return markdownRows.join('\n');
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}