import { Notice, setIcon } from 'obsidian';
import { MySetting } from './MySetting';
import { MyPluginSetting } from 'src/MyPluginSetting';

export class CommonBuildSetting {
    totalCount: number = 0;
    currentCount: number = 0;
    containerEl: HTMLElement;
    keys: string[] = [];
    map: Map<string, string>[] = [];
    lineNumberEnable: boolean = false;

    constructor(containerEl: HTMLElement) {
        this.containerEl = containerEl;
    }
}

export class CommonBuildService {
    constructor(private setting: MySetting, private pluginSetting: MyPluginSetting, public commonBuildSetting: CommonBuildSetting, private updateUI: () => void) {
    }

    buildSearchBar() {
        const contentContainer = this.commonBuildSetting.containerEl?.querySelector('.content-container') ?? this.commonBuildSetting.containerEl.createEl('div', { cls: 'content-container' });

        const floatingBar = contentContainer.createEl('div', { cls: 'floating-bar' });
        const countDiv = floatingBar.createEl('span');
        countDiv.innerHTML = `<span id="file-count">${this.commonBuildSetting.currentCount}</span> / ${this.commonBuildSetting.totalCount}`;

        const sortDiv = floatingBar.createEl('div', { cls: 'sort-container' });
        const sortSelect = sortDiv.createEl('select', { attr: { id: 'sort-select' } });
        sortSelect.createEl('option', {
            value: this.setting.defaultSortKey,
            text: '不排序'
        });

        this.commonBuildSetting.keys.forEach((key: string) => {
            sortSelect.createEl('option', { value: key, text: key });
        });
        sortSelect.value = this.setting.sortKey;

        sortSelect.onchange = () => {
            this.setting.sortKey = sortSelect.value;
            this.updateUI();
        }

        const reverseSortCheckbox = sortDiv.createEl('input', {
            type: 'checkbox',
            attr: { id: 'reverse-sort' }
        });
        reverseSortCheckbox.checked = !this.setting.ascending;
        reverseSortCheckbox.onclick = () => {
            this.setting.ascending = !this.setting.ascending;
            reverseSortCheckbox.checked = !this.setting.ascending;
            this.updateUI();
        }

        sortDiv.createEl('label', { text: '倒序', attr: { for: 'reverse-sort' } });

        const searchContainer = floatingBar.createEl('div', { cls: 'search-container' });
        const searchIcon = searchContainer.createEl('button', { cls: 'search-icon' });
        setIcon(searchIcon, "search");

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
                this.updateUI();
            }
        });

        const button = floatingBar.createEl('button', { attr: { id: 'function-button' } });
        setIcon(button, 'box');
        button.onclick = () => {
            alert('選項');
        }
    }

    buildRow(tbody: HTMLElement, map: Map<string, string>, lineNumber: number) {
        const row = tbody.createEl('tr');
        if (this.commonBuildSetting.lineNumberEnable) {
            const lineNum = row.createEl('td', { text: lineNumber.toString() });
            lineNum.style.width = '5%';
        }
        for (let i = 0; i < this.commonBuildSetting.keys.length; i++) {
            if (this.setting.editMode) {
                const td = row.createEl('td');
                const input = td.createEl('input', {
                    value: map.get(this.commonBuildSetting.keys[i]) || '',
                    cls: 'edit-input',
                    attr: {
                        type: 'text',
                        placeholder: `輸入 ${this.commonBuildSetting.keys[i]}`,
                        spellcheck: 'false'
                    }
                });
                input.style.fontSize = `${this.pluginSetting.tableFontSize}px`;

                input.addEventListener('blur', async () => {
                    const newValue = input.value;
                    const oldValue = map.get(this.commonBuildSetting.keys[i]) || '';

                    if (newValue !== oldValue) {
                        map.set(this.commonBuildSetting.keys[i], newValue);
                    }
                });
            }
            else {
                row.createEl('td', {
                    text: map.get(this.commonBuildSetting.keys[i]) || this.setting.defaultUndefinedValue
                });
            }
        }

        // // 綁定右鍵選單事件
        // row.addEventListener('contextmenu', (event: MouseEvent) => {
        //     // 阻止預設的右鍵選單
        //     event.preventDefault();
        //     event.stopPropagation();
        //     // 顯示自定義選單
        //     this.showRowContextMenu(event, row, map);
        // });
    }

    buildTable(): number {
        const myContainer = this.commonBuildSetting.containerEl?.querySelector('.my-container');
        const contentContainer = myContainer?.querySelector('.content-container');
        if (!contentContainer) return 0;

        contentContainer?.querySelector('.table-and-overflow-container')?.remove();
        const tableAndOverflowContainer = contentContainer?.createEl('div', { cls: 'table-and-overflow-container' });

        const buildHeader = (headerRow: HTMLElement) => {
            headerRow.createEl('th');
            this.commonBuildSetting.keys.forEach(key => {
                headerRow.createEl('th', { text: key });
            });
        }

        if (this.commonBuildSetting.map.length !== 0) {
            const fileTableContainer = tableAndOverflowContainer.createEl('div', { attr: { id: 'file-table-container' } });
            const table = fileTableContainer.createEl('table');
            table.style.fontSize = `${this.pluginSetting.tableFontSize}px`;

            // 設置列數變數
            const columnCount = this.commonBuildSetting.keys.length + 2; // lineNum and button
            table.style.setProperty('--column-count', columnCount.toString());

            const thead = table.createEl('thead');
            const tbody = table.createEl('tbody');
            buildHeader(thead);

            this.commonBuildSetting.map.forEach((map, index) => {
                this.buildRow(tbody, map, index + 1);
            });
        }
        return this.commonBuildSetting.map.length;
    }
}