export class HomepageSetting {
    // 特殊字符 $| (不要刪除)
    readonly defaultSortFrontmatter: string = "$|file";
    readonly noTagValue: string = '#$|no-tags';
    readonly rootFolderValue: string = '/';
    readonly noTagShowValue: string = '#no-tags';
    readonly rootFolderShowValue: string = 'root';

    searchValue: string = this.rootFolderValue;
    sortFrontmatter: string = this.defaultSortFrontmatter;
    sortAsc: boolean = true;
    tabSelected: string = 'folder'; // tag or folder
    tabs: string[] = ['folder', 'tag', 'custom'];
    editMode: boolean = false;
    showSubFolder: boolean = false;
}