# 十优缠论 · 站点仓库

- 仓库：https://github.com/shiyouchanlun/chan003
- 正式域名：**https://www.shiyouchanlun.com**（根路径，无子路径）
- 旧地址 `https://shiyouchanlun.github.io/chan003/` 会自动 301 到正式域名，仅作应急备用入口

## 当前状态

仓库里现在是一个**过渡期静态示例页**（纯 HTML，零构建）。正式站点按 `docs/交付方案.md` 用 Astro 重建，届时根目录会被 `dist/` 产物取代。

## 文件说明

| 文件 | 作用 |
| --- | --- |
| `CNAME` | 自定义域名绑定，内容 `www.shiyouchanlun.com`。**删了域名就掉** |
| `index.html` | 过渡期首页 |
| `.nojekyll` | 关闭 Jekyll，避免 `_astro/` 等下划线目录被忽略 |
| `design/` | 设计稿（不进构建、不对外发布） |
| `docs/交付方案.md` | 完整交付方案 |
| `README.md` | 本文件 |

## 域名接入（一次性）

### 1. DNS 记录

| 主机记录 | 类型 | 值 |
| --- | --- | --- |
| `www` | CNAME | `shiyouchanlun.github.io` |
| `@` | A | `185.199.108.153`、`185.199.109.153`、`185.199.110.153`、`185.199.111.153` |

> `www` 的值**不带 `/chan003`**。GitHub Pages 绑定自定义域名后，项目站点服务在域名根路径。

### 2. 仓库设置

**Settings → Pages → Custom domain** 填 `www.shiyouchanlun.com` → Save，等 DNS 校验通过（通常几分钟）。

### 3. HTTPS

GitHub 会自动签发 Let's Encrypt 证书，证书就绪后勾选 **Enforce HTTPS**。

**顺序很重要**：如果用了 Cloudflare，**必须先在灰云（DNS only）状态下拿到证书并开启 Enforce HTTPS，再开橙云代理**。橙云会拦截 HTTP-01 校验，导致证书永远签不下来。

### 4. 开代理后的必查项

Cloudflare 的 SSL/TLS 模式必须是 **Full**。若为 `Flexible`，GitHub 强制 HTTPS + CF 用 HTTP 回源 = 无限重定向（`ERR_TOO_MANY_REDIRECTS`）。

> 另外要清楚：**Cloudflare 免费版对中国大陆不加速**（大陆节点需企业版），国内用户走港/美节点。它的价值是能改响应头、能做 301 规则，不是速度。

## 日常发布

```bash
git add -A
git commit -m "update page"
git push
```

推送后 30 秒左右生效（Actions 标签可看 `pages build and deployment`）。

## 迁移到 Astro 时的两个硬要求

1. **`CNAME` 必须移到 `public/CNAME`**。用 GitHub Actions 部署时，产物里没有 CNAME，GitHub 可能把自定义域名清掉——表现为"站点突然回到 github.io，且没有任何报错"。
2. **Pages 的 Source 要改成 `GitHub Actions`**。若还停在 `Deploy from a branch`，Actions 部署会静默不生效。

## 常见问题

- **域名打不开 / 证书报错**：先确认 DNS 已生效（`dig www.shiyouchanlun.com`），再回 Settings → Pages 看 Custom domain 是否显示 DNS check successful
- **无限重定向**：Cloudflare SSL 模式改成 Full
- **改了没更新**：等 1 分钟；Pages CDN 缓存约 10 分钟
- **样式没生效**：检查是否用了绝对路径引资源
- **推送被拒**：`git pull --rebase origin main` 后再推

## 本地预览

```bash
python -m http.server 8000
# 访问 http://localhost:8000
```
