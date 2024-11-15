export const VIEW_TYPE_HOMEPAGE = "homepage-view";

export interface HomepagePluginInterface {
    myPluginSettings: any;
    saveSettings(): Promise<void>;
} 