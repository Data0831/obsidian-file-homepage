import { App, Plugin, WorkspaceLeaf, ItemView, ViewStateResult, Notice, TFile, setIcon } from 'obsidian';

export const VIEW_TYPE_HOMEPAGE = "homepage-view";

export default class Homepage extends Plugin {
    async onload() {
        this.registerView(
            VIEW_TYPE_HOMEPAGE,
            (leaf) => new HomepageView(leaf)
        );

        this.addCommand({
            id: 'open-homepage',
            name: 'Open Homepage',
            callback: () => {
                this.activateView();
            }
        });
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
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
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

        // 原有的代碼
        this.buildTagsButton();
        this.buildSearchBar();
    }

    getAllTags(): string[] {
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
        return Array.from(tags).sort();
    }

    // 檔案中包含特定標籤的表格
    buildTableFileContainTag(tag: string) {
        const container = this.containerEl.children[1];

        // 移除舊的表格和相關元素
        const oldTable = container.querySelector('table');
        if (oldTable) oldTable.remove();
        const oldHeader = container.querySelector('#title');
        if (oldHeader) oldHeader.remove();

        if (tag === '') {
            new Notice('請輸入標籤');
            return;
        }

        const Files = this.getFilesFromTag(tag);
        const header = container.createEl('div', { attr: { id: 'title' } });
        header.innerHTML = `<span class="tag-title">tags: [${tag}]</span> <span class="file-count">${Files.length} 個檔案</span>`;

        if (Files.length === 0) {
            new Notice(`沒有找到包含標籤 #${tag} 的文件。`);
        } else {
            const table = container.createEl('table');
            const thead = table.createEl('thead');
            const tbody = table.createEl('tbody');
            const myheader = ['檔案名稱', '創建時間', '描述'];

            const headerRow = thead.createEl('tr');
            myheader.forEach(header => {
                headerRow.createEl('th', { text: header });
            });

            Files.forEach(file => {
                const cache = this.app.metadataCache.getFileCache(file);
                const row = tbody.createEl('tr');
                
                // 創建一個包含檔案連結的單元格
                const linkCell = row.createEl('td');
                const link = linkCell.createEl('a', {
                    text: file.basename,
                    cls: 'internal-link my-link',
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

                row.createEl('td', { text: cache?.frontmatter?.date || '無日期' });
                row.createEl('td', { text: cache?.frontmatter?.desc || '無描述' });
            });
        }
        this.updateFileCount(Files.length);
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

    buildTagsButton() {
        const container = this.containerEl.children[1];
        const tags = this.getAllTags();
        if (tags.length > 0) {
            new Notice(`已加載 ${tags.length} 個標籤`);
            container.createEl('h1', { text: `總共有 ${tags.length} 個 tags` });
            const tagContainer = container.createEl('div', { cls: 'tag-container' });
            tags.forEach(tag => {
                const button = tagContainer.createEl('button', { text: `#${tag}`, cls: 'tag-button' });
                button.onclick = () => this.buildTableFileContainTag(tag);
            });
        } else {
            new Notice('沒有找到任何標籤');
            container.createEl('p', { text: '沒有找到任何標籤' });
        }
    }

    buildSearchBar() {
        // data
        let totalFilesCount = this.app.vault.getMarkdownFiles().length;
        let currentFilesCount = 0;
        let asc = true;

        // elements
        const container = this.containerEl.children[1];
        const floatingBar = container.createEl('div', { cls: 'floating-bar' });
        const countDiv = floatingBar.createEl('span');
        countDiv.innerHTML = `<span id="file-count">${currentFilesCount}</span> / ${totalFilesCount}`;

        const sortDiv = floatingBar.createEl('div', { cls: 'sort-container' });
        const sortSelect = sortDiv.createEl('select', { attr: { id: 'sort-select' } });
        sortSelect.createEl('option', { value: '', text: '不排序' });

        const reverseSortCheckbox = sortDiv.createEl('input', { type: 'checkbox', attr: { id: 'reverse-sort' } });
        reverseSortCheckbox.checked = !asc;
        reverseSortCheckbox.onclick = () => {
            asc = !asc;
            reverseSortCheckbox.checked = asc;
        }
        sortDiv.createEl('label', { text: '倒序', attr: { for: 'reverse-sort' } });

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
                this.buildTableFileContainTag(searchInput.value);
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
