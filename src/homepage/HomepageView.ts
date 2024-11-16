import { ItemView, WorkspaceLeaf } from 'obsidian';
import { FileService } from './FileService';
import { ViewService } from './ViewService';
import { MySetting } from '../common/MySetting';
import { MyPlugin, VIEW_TYPE_HOMEPAGE } from '../MyPlugin';


export class HomepageView extends ItemView {
    fileService: FileService;
    viewService: ViewService;
    homepageSetting: MySetting;
    plugin: MyPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: MyPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.viewService = new ViewService(this);
        this.homepageSetting = new MySetting();
        this.homepageSetting.showSubFolder = this.plugin.pluginSetting.showSubFolder;
        this.fileService = new FileService(this);

        this.registerEvent(
            // 切換到首頁視圖時，重新渲染
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