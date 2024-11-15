import { App, Modal, setIcon } from 'obsidian';
import { MyPluginSetting } from '../MyPluginSetting';
import { MySetting } from '../common/MySetting';
import { CommonBuildSetting, CommonBuildService } from '../common/CommonBuild';

export class TableEditModal extends Modal {
    private originTableMap: Map<string, string>[];
    private filterTableMap: Map<string, string>[];
    private onSubmit: (newTableText: string) => void;
    private tableEl: HTMLTableElement;
    public setting: MySetting;
    private pluginSettings: MyPluginSetting;
    public commonBuildService: CommonBuildService;
    constructor(
        app: App,
        tableMap: Map<string, string>[],
        onSubmit: (newTableText: string) => void,
        pluginSetting: MyPluginSetting
    ) {
        super(app);
        this.originTableMap = tableMap;
        this.onSubmit = onSubmit;
        this.setting = new MySetting();
        this.pluginSettings = pluginSetting;
        this.commonBuildService = new CommonBuildService(this.setting, this.pluginSettings, new CommonBuildSetting(this.contentEl), () => {
            this.build();
        });

        this.containerEl.addClass('table-edit-modal');
    }

    onOpen() {
        this.build();
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

        this.fileterTableMap();
        this.updateBuildCommonSetting();
        this.commonBuildService.buildSearchBar();
        this.buildTableTitle();
        this.commonBuildService.buildTable();
    }

    getKeys(): string[] {
        let myKey: string[] = [];
        this.originTableMap[0].forEach((value, key) => {
            myKey.push(key);
        });
        return myKey;
    }

    updateBuildCommonSetting() {
        this.commonBuildService.commonBuildSetting.keys = this.getKeys();
        this.commonBuildService.commonBuildSetting.map = this.filterTableMap;
        this.commonBuildService.commonBuildSetting.totalCount = this.originTableMap.length;
        this.commonBuildService.commonBuildSetting.currentCount = this.filterTableMap.length;
        this.commonBuildService.commonBuildSetting.lineNumberEnable = true;
    }

    resetTableMap() {
        this.filterTableMap = [...this.originTableMap];
    }

    compareTableMap(a: Map<string, string>, b: Map<string, string>) {
        let adjust = 1;
        if (this.setting.ascending === false) adjust *= -1;

        // 不排序
        if (this.setting.sortKey === this.setting.defaultSortKey) {
            return adjust;
        }
        return adjust * (a.get(this.setting.sortKey) || '').localeCompare(b.get(this.setting.sortKey) || '');
    }

    fileterTableMap() {
        // 1. reset
        this.resetTableMap();

        // 2. searchBar
        let myKey = this.getKeys();

        if (this.setting.searchValue !== this.setting.defaultValue) {
            this.filterTableMap = this.originTableMap.filter(map => {
                return myKey.some(key => map.get(key)?.includes(this.setting.searchValue));
            });
        }

        // 3. sort
        this.filterTableMap.sort((a, b) => {
            return this.compareTableMap(a, b);
        });
    }

    buildTableTitle() {
        const myContainer = this.containerEl.querySelector('.my-container');
        const contentContainer = myContainer!.querySelector('.content-container');
        if (!contentContainer) return 0;

        contentContainer?.querySelector('.table-title-line')?.remove();
        const lineContainer = contentContainer!.createEl('div', { attr: { id: 'table-title-line' } });
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
            const newRow = new Map(this.originTableMap[0]);
            newRow.forEach((value, key) => newRow.set(key, ''));
            const index = this.originTableMap.indexOf(map);
            this.originTableMap.splice(index, 0, newRow);
            this.fileterTableMap();
            menu.remove();
        };

        const insertBelow = menu.createEl('div', {
            cls: 'context-menu-item',
            text: '在下方插入'
        });
        insertBelow.onclick = () => {
            const newRow = new Map(this.originTableMap[0]);
            newRow.forEach((value, key) => newRow.set(key, ''));
            const index = this.originTableMap.indexOf(map);
            this.originTableMap.splice(index + 1, 0, newRow);
            this.commonBuildService.buildTable();
            menu.remove();
        };

        const deleteRow = menu.createEl('div', {
            cls: 'context-menu-item delete-item',
            text: '刪除此列'
        });
        deleteRow.onclick = () => {
            const index = this.originTableMap.indexOf(map);
            this.originTableMap.splice(index, 1);
            this.commonBuildService.buildTable();
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
        const rows = this.tableEl.rows;
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