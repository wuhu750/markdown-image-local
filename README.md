# markdown-image-local

一个将 Markdown 文件中引用的网络图片下载到本地并替换为本地链接的工具。

## 功能特点

- 解析 Markdown 文件中的图片引用语法 `![alt](url)`
- 自动下载网络图片并保存到本地
- 为每个 Markdown 文件创建同名文件夹来存储对应的图片
- 按图片在文档中出现的顺序命名图片文件（0.jpg, 1.jpg, 2.png...）
- 自动将图片链接替换为相对路径
- 支持处理单个 Markdown 文件或整个目录
- 自动转换 awebp 格式的图片为 PNG 或 JPG 格式
- 可选参数统一转换所有非 JPG/PNG 图片为 JPG 格式

## 安装

```bash
npm install -g markdown-image-local
```

## 使用方法

### 基本用法

```bash
# 处理当前目录下的所有 Markdown 文件
img2local

# 处理指定的 Markdown 文件
img2local path/to/file.md

# 处理指定目录下的所有 Markdown 文件
img2local path/to/directory
```

### 高级选项

```bash
# 启用全部转 JPG 模式（将所有非 PNG/JPG 图片转换为 JPG 格式）
img2local --convert-all-to-jpg

# 或使用简写形式
img2local -c
```

## 工作原理

1. 解析命令行参数，确定要处理的目标路径
2. 遍历目标路径下的所有 Markdown 文件
3. 使用正则表达式匹配 Markdown 语法 `![alt](url)` 中的图片链接
4. 对于网络图片链接:
   - 创建以 Markdown 文件名命名的文件夹用于存储图片
   - 按顺序下载图片并命名（0.ext, 1.ext, 2.ext...）
   - 特殊处理 awebp 格式的图片，转换为 PNG 或 JPG 格式
   - 如果启用 `-c` 选项，将所有非 PNG/JPG 图片转换为 JPG 格式
   - 将 Markdown 中的图片链接替换为本地相对路径

## 使用示例

假设有以下 Markdown 文件 `example.md`:

```markdown
# 我的文档

这是一张网络图片:
![示例图片](https://example.com/image.jpg)

这是另一张图片:
![示例图片2](https://example.com/image2.png)
```

运行命令:
```bash
img2local example.md
```

执行后，将生成以下目录结构:
```
.
├── example.md
└── example/
    ├── 0.jpg
    └── 1.png
```

并且 `example.md` 内容将被更新为:
```markdown
# 我的文档

这是一张网络图片:
![示例图片](example/0.jpg)

这是另一张图片:
![示例图片2](example/1.png)
```

## 注意事项

1. 仅处理以 `http://` 或 `https://` 开头的网络图片链接
2. 本地图片链接将保持不变
3. 如果目标目录或文件不存在，程序将报错退出
4. 图片命名按照在 Markdown 文件中出现的顺序从 0 开始编号
5. 转换 awebp 图片时，如果启用 `-c` 选项则转换为 JPG，否则转换为 PNG
