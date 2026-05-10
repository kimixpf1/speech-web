# 项目规则（仅项目特有内容）

> **优先级**: 全局规则 `~/.claude/rules/` 和记忆文件为最高级别。本项目文件仅记录项目特有的结构、链路和约束，不重复全局编码/安全/测试/工作流规则。

## 本文件职责
- 项目特有的长期约束和业务规则
- 每轮执行边界（开始前/进行中/结束前做什么）
- 不重复全局规则已覆盖的内容

## 项目特有约束

- 管理员测试账号：admin / kimiclaw1；仅用于必要测试
- 使用 HashRouter + GitHub Pages 子路径部署，硬编码跳转必须是 `/speech-web/#/路径` 格式，禁止 `/` 作为跳转目标
- 涉及新增文章、AI 提取、摘要、解读、详情展示、删除链路时，联动检查上下游
- 涉及 Supabase 表、RLS、认证态变更时，核对前台/后台客户端身份差异、读写权限和旧数据兼容
- GitHub Pages + PWA 发布后检查：版本号、Service Worker、manifest、缓存刷新、HashRouter 路径
- 保持 article_details 不产生孤儿记录，DeepSeek/Kimi 解读格式一致

## 每轮执行边界

### 开始前
1. 读全局规则 `~/.claude/rules/` 和记忆文件 `MEMORY.md`
2. 读本项目 `.claude/rules/` 下 todolist.md、project_framework.md、project_iteration_log.md
3. 根据本轮任务更新 todolist.md

### 进行中
1. 涉及结构或链路变化时，同步更新 project_framework.md
2. 长链路改动先设检查点，分阶段验证
3. **禁止整文件重写**：用 Edit 工具局部替换，避免覆盖已有修复代码

### 结束前
1. 更新 todolist.md：已完成、下一步
2. 更新 project_iteration_log.md：目标、改动、状态、提交、遗留
3. 必要时更新 project_framework.md
4. 代码改动必须 build 通过才能推送
5. 查询并报告当前模型用量

## 规则目录双同步

- `.claude/rules/` 是主版本，`.trae/rules/` 通过复制同步
- 会话开始/结束时执行 `cp .claude/rules/*.md .trae/rules/`
- 用 Trae 改规则后，下次回到 Claude Code 时手动反向同步
