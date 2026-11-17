# GitHub Pages 静态站点（最小示例）

纯 HTML + 内联 CSS，零依赖、零构建，推上去即可访问。

## 文件说明

| 文件 | 作用 |
| --- | --- |
| `index.html` | 站点首页，所有内容都在这里 |
| `.nojekyll` | 关闭 Jekyll 处理，避免下划线开头的文件被忽略 |
| `README.md` | 本说明 |

## 部署方式一：网页上传（最省事，适合第一次）

1. 打开 https://github.com/new ，仓库名填 `my-site`（或任意名），可见性选 **Public**，点 Create repository。
2. 在仓库页点 **uploading an existing file**，把 `index.html` 和 `.nojekyll` 拖进去，Commit。  
   > `.nojekyll` 是隐藏文件，Windows 资源管理器需要先开启「显示隐藏的项目」。
3. 进入 **Settings → Pages**，Source 选 `Deploy from a branch`，分支选 `main`、目录选 `/ (root)`，Save。
4. 等 30 秒左右刷新，页面顶部会显示访问地址。

## 部署方式二：本地 git 推送（后续更新用这个）

```bash
# 在项目目录下，替换 <用户名> 和 <仓库名>
git remote add origin https://github.com/<用户名>/<仓库名>.git
git branch -M main
git push -u origin main
```

首次推送会弹出浏览器登录 GitHub 授权，授权一次后 Windows 凭据管理器会记住。

之后每次改完页面：

```bash
git add -A
git commit -m "update page"
git push
```

Pages 会自动重新构建，一般 30 秒内生效。

## 访问地址规则

| 仓库类型 | 地址 |
| --- | --- |
| 名为 `<用户名>.github.io` | `https://<用户名>.github.io/` |
| 普通仓库 `my-site` | `https://<用户名>.github.io/my-site/` |

**注意**：普通仓库会带子路径。如果以后页面里用到绝对路径（如 `/images/a.png`），要改成相对路径 `images/a.png`，否则会 404。

## 常见问题

- **404 页面没出来**：确认分支是 `main`、目录是 `/ (root)`，且仓库是 Public。
- **样式没生效但 HTML 生效**：检查是否用了绝对路径引用资源。
- **推送被拒（rejected）**：远程有初始文件，先 `git pull --rebase origin main` 再推。
- **改了没更新**：等 1 分钟；或到 **Actions** 标签看 `pages build and deployment` 是否失败。

## 本地预览

```bash
python -m http.server 8000
# 访问 http://localhost:8000
```
