export class MySetting {
    // common
    readonly defaultValue: string = "";
    searchValue: string = this.defaultValue;
    ascending: boolean = true;
    sortKey: string = this.defaultValue;
    editMode: boolean = false;
    readonly defaultUndefinedValue: string = this.defaultValue;//'$|undefined'

    // homepage
    readonly defaultFrontmatter: string = this.defaultValue;
    readonly noTagText: string = '#no-tags';
    readonly noTagValue: string = '#$|no-tags';
    readonly rootFolderText: string = 'root';
    readonly rootFolderValue: string = '/';

    tabSelected: string = 'folder'; // tag or folder
    tabs: string[] = ['folder', 'tag', 'custom'];
    showSubFolder: boolean = false;

    // table
    readonly defaultSortKey: string = this.defaultValue;
}