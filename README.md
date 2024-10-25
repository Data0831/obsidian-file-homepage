# File Homepage - an Obsidian file manager plugin

## 簡介
File Homepage 一個簡單的文件管理插件，可以透過標籤或文件夾來搜索文件。

![插件界面預覽](image.png)

## 主要功能
1. **按鈕跳轉**: 透過按鈕跳轉到指定標籤或文件夾。
2. **顯示 frontmatter**: 使用者可以在 table 中顯示 frontmatter 的欄位。
3. **排序**: 使用者可以透過 frontmatter 欄位進行排序。
4. **自定義欄位按鈕**: 使用者可以自定義跳轉按鈕，選擇使用標籤或文件夾。

## 使用方法
- 使用 `Open Homepage` 命令打開插件主頁面。
- 使用 `update-homepage` 命令手動更新數據。
- 切換標籤頁來選擇通過標籤、文件夾或自定義按鈕進行搜索。
- 右鍵點擊按鈕可以將其添加到自定義標籤頁或從中移除。

![video](2024-10-25 13-09-35.mp4)

## 設置選項
![設置界面](image-1.png)

在插件設置頁面，您可以：
- 啟用/禁用自動更新
- 設置自動更新時間間隔（最短 2 秒）
- 調整表格和按鈕的字體大小
- 自定義要顯示的 frontmatter 欄位和對應的表頭
- 透過 frontmatter 對欄位進行排序
- 自定義跳轉按鈕（標籤或文件夾）

### frontmatter 設置
- `frontmatter`：選擇要顯示的欄位，這些欄位需要在 Markdown 文件的 frontmatter 中定義。
- `frontmatterkey`：對應 frontmatter 欄位在表格中顯示的標題，第一項默認為文件名。

## 注意事項
- 確保您的 Markdown 文件在 frontmatter 中正確設置了標籤和其他自定義欄位。
- 插件目前不支持暗黑模式，預設使用亮色主題。

## 下一步
[需求頁面](require.md)
