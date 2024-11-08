import { ItemView, WorkspaceLeaf } from 'obsidian';
import { FileService } from './services/FileService';
import { ViewService } from './services/ViewService';
import { HomepageSetting } from './HomepageSetting';
import { HomepagePluginInterface } from './types';
import { VIEW_TYPE_HOMEPAGE } from './types';

export class HomepageView extends ItemView {
    fileService: FileService;
    viewService: ViewService;
    homepageSetting: HomepageSetting;
    plugin: HomepagePluginInterface;

    constructor(leaf: WorkspaceLeaf, plugin: HomepagePluginInterface) {
        super(leaf);
        this.plugin = plugin;
        this.viewService = new ViewService(this);
        this.homepageSetting = new HomepageSetting();
        this.homepageSetting.showSubFolder = this.plugin.settings.showSubFolder;
        this.fileService = new FileService(this);

        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf) => {
                if (leaf && leaf.view instanceof ItemView && leaf.view === this) {
                    this.onViewActivate();
                }
            })
        );
    }

    getViewType(): string {
        return VIEW_TYPE_HOMEPAGE;
    }

    getDisplayText(): string {
        return "首頁";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        this.viewService.build();
    }

    private async onViewActivate() {
        await this.viewService.build();
    }
}