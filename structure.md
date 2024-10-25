# main.ts

## Homepage
### Variables
- settings

### Functions
- getHomepageView
- onload
- loadSettings
- saveSettings
- activateView

## HomepageView
### Variables
- autoUpdateInterval
- value
- sortFrontmatter
- sortAsc
- tabMode
- noTagValue
- settings

### Functions
- constructor
- getViewType
- getDisplayText
- getIcon
- onOpen
- onClose
- doAutoUpdate
- getTags
- getFolders
- getFilesByTag
- getFilesByFolder
- update
- build
- buildTabs
- buildButton
- buildTagTable
- buildNoTagTable
- fileSort
- buildTableFromFiles
- buildSearchBar
- updateFileCount


# src/setting.ts

## MyPluginSettings
### Variables
- autoUpdateOnChange
- enableAutoUpdate
- timeUpdate
- enableDarkMode
- tableFontSize
- tagButtonFontSize
- myFrontmatter
- myFrontmatterKey

## MyPluginSettingTab
### Variables
- plugin

### Functions
- constructor
- display