---
name: google-chrome-bookmarks
description: 使用此技能搜索google chrome上的bookmark
---

# 搜索google chrome上的bookmark

## 功能
- 搜索google chrome上的bookmark
- 提取bookmark的url、标题、标签等信息

## 数据来源
默认读取`Library/Application Support/Google/Chrome/Default/Bookmarks`文件，获取bookmark的列表。

## 搜索bookmark
- 读取`Library/Application Support/Google/Chrome/Default/Bookmarks`文件，获取bookmark的列表。
- 根据用户的问题，从bookmark列表中提取相关的信息。
