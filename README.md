# 每日 Daily — AI Goal & Habit Planner PWA

把长远目标拆成今天能做的事。

## 这个版本是什么 (Phase 1)

**已实现：**
- ✅ 完整 UI 原型（首页 / 创建向导 / 目标详情 / 打卡 / 日历 / 提醒设置）
- ✅ PWA 配置（manifest + Service Worker + 离线 shell 缓存）
- ✅ iOS 添加到主屏幕引导（Safari 检测 + 引导浮层）
- ✅ Web Push 推送的 SW handler 已就位（等 VAPID 密钥就能用）
- ✅ Mock 数据，所有交互可点

**Phase 2 待做：** Supabase 接入 + OpenAI 真实拆解 + 推送密钥配置

---

## 本地启动

```bash
# 1. 安装依赖
pnpm install     # 或 npm install / yarn

# 2. 启动
pnpm dev

# 3. 浏览器打开 http://localhost:3000
```

---

## 部署到 Vercel（推荐）

最快上线方案：

```bash
# 1. 把项目推到 GitHub（或者直接用 Vercel CLI）
git init
git add .
git commit -m "init"
git remote add origin git@github.com:你/daily-app.git
git push -u origin main

# 2. 到 https://vercel.com/new 导入仓库，全默认即可

# 3. 部署完成后会拿到一个 https://daily-app-xxx.vercel.app
```

**重要：PWA 推送和"添加到主屏幕"必须 HTTPS 才能用，本地 dev 不行，必须先部署。**

---

## 在 iPhone 上添加到主屏幕

1. iPhone Safari 打开你的部署地址（不是 Chrome、不是其他浏览器，**必须 Safari**）
2. 点底部中间的「分享」按钮（方框带向上箭头）
3. 滑下来找「添加到主屏幕」
4. 命名为「每日」点添加
5. **从主屏图标启动**（这一步很关键 —— 后续推送授权只能在这种"独立模式"下弹）

App 启动后看起来就是原生 App 一样，没有 Safari 工具栏。

---

## 项目结构

```
daily-app/
├── app/
│   ├── layout.tsx          # 根布局 + iOS PWA meta 标签
│   ├── page.tsx            # 入口，渲染 PlannerApp
│   └── globals.css         # Tailwind + safe-area
├── components/
│   └── PlannerApp.tsx      # 整个 App（client component）
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service Worker（缓存 + Web Push）
│   ├── icon-192.png        # PWA 图标
│   ├── icon-512.png
│   ├── icon-maskable-512.png
│   ├── apple-touch-icon.png  # iOS 主屏图标 180×180
│   └── favicon-32.png
├── lib/                    # （Phase 2 加 supabase / openai client）
├── tailwind.config.ts
├── next.config.mjs
├── tsconfig.json
└── .env.example            # 拷贝到 .env.local 填值
```

---

## 接下来做什么 (Phase 2-4)

### Phase 2: Supabase 接入
- 跑 schema migration（goals / goal_tasks / habits / habit_checkins / push_subscriptions / reminder_settings）
- 启用 RLS
- 把 mock 数据替换成真实查询

### Phase 3: OpenAI 拆解
- `/app/api/generate-plan/route.ts` 接 OpenAI
- JSON Schema 校验输出
- "AI 重新调整"按钮接同一个 API

### Phase 4: Web Push
- 生成 VAPID 密钥对放进 .env
- 「开启提醒」按钮调 `enablePush()`
- Supabase Edge Function + pg_cron 定时扫描发推送

---

## 一些值得知道的坑

**iOS PWA 限制（重要）：**
- 需要 iOS 16.4+ 才支持 Web Push
- Safari 直接打开的页面**不能**授权推送，必须从主屏图标进入
- 启动 App 后 `window.matchMedia('(display-mode: standalone)').matches` 必须返回 true 才能授权

**Service Worker：**
- 必须从根路径 `/sw.js` 注册，不能放进 Next.js 的 build 路径
- 每次更新 SW 文件后用户要关掉 App 再开才能拿到新版本（除非走 "skipWaiting" 流程）

**iOS Safari 输入框：**
- 输入框 font-size < 16px 会自动放大整页 → 已经全局加了 ≥16px 规则

---

## 改图标和品牌色

图标在 `public/icon-*.png`。要换的话替换这五个文件：
- `icon-192.png` (192×192) — 标准 PWA
- `icon-512.png` (512×512) — 标准 PWA
- `icon-maskable-512.png` (512×512) — Android maskable
- `apple-touch-icon.png` (180×180) — iOS 主屏
- `favicon-32.png` (32×32)

品牌色 `#7B61FF` 在 `tailwind.config.ts` 的 `theme.extend.colors.brand`。
全局色映射定义在 `components/PlannerApp.tsx` 顶部 `<style>` 块里的 `.kk-*` 类。

---

## 反馈和下一步

跑通后如果遇到问题或想加什么，可以告诉我具体是哪一步卡住，我接着帮你弄 Phase 2-4。
