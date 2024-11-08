import { App, TFile, CachedMetadata } from 'obsidian';
import { HomepageSetting } from '../HomepageSetting';

export class FileService {
    constructor(private app: App, private homepageSetting: HomepageSetting) { }

    getFilesByValue(value: string): TFile[] {
        function isTag(value: string) {
            return value[0] === '#';
        }

        if (value === this.homepageSetting.noTagValue) {
            return this.getFilesByNoTag();
        }

        if (isTag(value)) {
            return this.getFilesByTag(value.slice(1));
        }

        if (!this.homepageSetting.showSubFolder) {
            return this.getFilesByFolder(value);
        } else {
            return this.getFilesByFolderAndSubFolder(value);
        }
    }

    getFilesByNoTag(): TFile[] {
        return this.app.vault.getMarkdownFiles().filter(file => {
            return !this.app.metadataCache.getFileCache(file)?.frontmatter?.tags;
        });
    }

    getFilesByTag(tag: string): TFile[] {
        const files = this.app.vault.getMarkdownFiles();
        return files.filter(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            return cache?.frontmatter?.tags?.includes(tag.slice(1));
        });
    }

    getFilesByFolder(folderPath: string): TFile[] {
        return this.app.vault.getMarkdownFiles().filter(file =>
            file.parent?.path === folderPath
        );
    }

    getFilesByFolderAndSubFolder(folderPath: string): TFile[] {
        const files = this.app.vault.getMarkdownFiles();
        if (folderPath === this.homepageSetting.rootFolderValue) {
            return files;
        }
        return files.filter(file =>
            file.parent?.path.startsWith(folderPath)
        );
    }

    // 其他檔案相關方法...
}