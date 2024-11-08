import { App, TFile, TFolder, CachedMetadata, Notice } from 'obsidian';
import { HomepageView } from '../HomepageView';

export class FileService {
    constructor(private view: HomepageView) { }

    getFilesByValue(value: string): TFile[] {

        function isTag(value: string) {
            return value[0] === '#';
        }

        if (value === this.view.homepageSetting.noTagValue) {
            return this.getFilesByNoTag();
        }

        if (isTag(value)) {
            return this.getFilesByTag(value.slice(1));
        }

        if (!this.view.homepageSetting.showSubFolder) {
            return this.getFilesByFolder(value);
        } else {
            return this.getFilesByFolderAndSubFolder(value);
        }
    }

    getFilesByNoTag(): TFile[] {
        return this.view.app.vault.getMarkdownFiles().filter(file => {
            return !this.view.app.metadataCache.getFileCache(file)?.frontmatter?.tags;
        });
    }

    getFilesByTag(tag: string): TFile[] {
        const files = this.view.app.vault.getMarkdownFiles();
        return files.filter(file => {
            const cache = this.view.app.metadataCache.getFileCache(file);
            return cache?.frontmatter?.tags?.includes(tag);
        });
    }

    getFilesByFolder(folderPath: string): TFile[] {
        return this.view.app.vault.getMarkdownFiles().filter(file =>
            file.parent?.path === folderPath
        );
    }

    getFilesByFolderAndSubFolder(folderPath: string): TFile[] {
        const files = this.view.app.vault.getMarkdownFiles();
        if (folderPath === this.view.homepageSetting.rootFolderValue) {
            return files;
        }
        return files.filter(file =>
            file.parent?.path.startsWith(folderPath)
        );
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
                if (a.length == b.length) {
                    return a.localeCompare(b);
                }
                return a.length < b.length ? -1 : 1;
            });
        }



        if (this.view.homepageSetting.tabSelected === 'tag') {
            return getTags();
        } else if (this.view.homepageSetting.tabSelected === 'folder') {
            if (this.view.homepageSetting.showSubFolder) {
                return this.getAllFoldersPath();
            } else {
                return this.getFoldersPath();
            }
        } else if (this.view.homepageSetting.tabSelected === 'custom') {
            return this.view.plugin.settings.myCustomTabsButton;
        }
        return [];
    }


    private getFoldersPath() {
        const folders = new Set<string>();
        const files = this.view.app.vault.getMarkdownFiles();
        files.forEach(file => {
            folders.add(file.parent?.path || '');
        });

        return Array.from(folders).sort((a, b) => {
            let resultA = a.split('/').last() || '';
            let resultB = b.split('/').last() || '';

            if (resultA.length == resultB.length) {
                return resultA.localeCompare(resultB);
            }
            return resultA.length < resultB.length ? -1 : 1;
        });
    }

    private getAllFoldersPath() {
        const folders = new Set<string>();
        
        // 獲取所有文件和資料夾
        const allFiles = this.view.app.vault.getAllLoadedFiles();
        
        // 遍歷所有項目
        allFiles.forEach(item => {
            if ('path' in item) {
                // 如果是資料夾，直接添加路徑
                if (item instanceof TFolder) {
                    folders.add(item.path);
                }
                // 如果是文件，添加其父資料夾路徑
                else {
                    const parentPath = item.parent?.path || '';
                    if (parentPath) {
                        folders.add(parentPath);
                    }
                }
            }
        });

        // 添加根目錄選項（如果需要的話）
        folders.add(this.view.homepageSetting.rootFolderValue);

        return Array.from(folders).sort((a, b) => {
            let resultA = a.split('/').last() || '';
            let resultB = b.split('/').last() || '';

            if (resultA.length == resultB.length) {
                return resultA.localeCompare(resultB);
            }
            return resultA.length < resultB.length ? -1 : 1;
        });
    }
}