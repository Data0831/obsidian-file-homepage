export const VIEW_TYPE_HOMEPAGE = "homepage-view";

export interface HomepagePluginInterface {
    settings: any;
    saveSettings(): Promise<void>;
} 