import { App, TFile, CachedMetadata } from 'obsidian';

export class FileService {
    constructor(private app: App) {}

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

    // 其他檔案相關方法...
} 