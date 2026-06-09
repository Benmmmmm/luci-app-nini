# NINI 验证报告

## 本地验证（Windows MSYS2 环境）

### 文件完整性

| 文件 | 路径 | 状态 |
|------|------|------|
| Makefile | /Makefile | 已创建 |
| UCI 配置 | /files/etc/config/nini | 已创建 |
| init.d 服务 | /files/etc/init.d/nini | 已创建 |
| ninictl 工具 | /files/usr/bin/ninictl | 已创建 |
| LuCI 控制器 | /files/usr/lib/lua/luci/controller/nini.lua | 已创建 |
| Lua 工具模块 | /files/usr/lib/lua/nini/util.lua | 已创建 |
| RPCD 插件 | /files/usr/libexec/rpcd/nini | 已创建 |
| ACL 文件 | /files/usr/share/rpcd/acl.d/luci-app-nini.json | 已创建 |
| LuCI 前端 | /files/www/luci-static/resources/view/nini/main.js | 已创建 |

### 语法检查

| 文件 | 检查工具 | 结果 |
|------|----------|------|
| main.js | Node.js (v22.22.2) | 通过 |
| ninictl | sh -n | 通过 |
| init.d/nini | sh -n | 通过 |
| rpcd/nini | sh -n | 通过 |
| ACL JSON | 手动检查 | 通过 |

### main.js 关键检查项

- 无 BOM（以 ASCII 单引号开头）
- 无 SyntaxError（Node.js -c 通过）
- 无 ReferenceError（require 语句完整）
- renderStatusTab、renderBasicTab、renderSubscriptionTab、renderAdvancedTab、renderLogsTab 均已定义
- 页面标题为 "NINI"
- 服务名引用为 nini
- 配置路径引用为 /etc/config/nini
- 运行目录引用为 /tmp/nini
- LuCI 路径为 /services/nini
- RPC 使用 nini
- 分流模式只保留国内外分流/全局代理
- 基础设置页使用两张卡片
- AAAA 返回只出现一次（在 DNS 与 IPv6 卡片中）
- 节点表不显示 AUTO 行（过滤逻辑存在）
- 顶部 AUTO 自动选择按钮存在
- 运行状态卡片使用 flex 横向并排
- 订阅页两个按钮存在
- 统一等待器存在（performAction + pollStatus）

### ninictl 关键检查项

- 端口定义：7890/7892/7893/9090
- LAN 接口：br-lan
- nft 表名：table inet nini
- 规则源：johnshall.github
- 规则处理：DIRECT/PROXY/REJECT 归一化
- GEOIP 跳过并统计 skipped_geoip
- 内网地址 DIRECT 兜底
- MATCH,PROXY 兜底策略
- watcher 延迟 90 秒启动
- 启动前清理 stopping/start.lock
- 支持 IPv6 TProxy
- DNS 劫持支持

### init.d 关键检查项

- START=99 / STOP=01
- USE_PROCD=1
- 清理 stale locks
- watcher 延迟启动（90秒）
- service_triggers 定义

### Makefile 关键检查项

- 包名：luci-app-nini
- 版本：1.0.0-1
- DEPENDS 包含 curl 和 tproxy kmod
- 不依赖 opkg
- 安装路径正确
- postinst 清理旧残留并启动服务
- prerm 停止服务

## SDK 构建验证

**环境限制**：当前构建环境为 Windows MSYS2，无 Linux 环境（WSL/Docker 均不可用），因此无法直接运行 ImmortalWrt SDK 进行编译。

**建议构建方式**：
1. 在 Ubuntu 22.04/24.04 x86_64 上运行
2. 使用 ImmortalWrt SDK 25.12.0 mediatek-filogic
3. 执行 `make package/luci-app-nini/compile V=s`

## TR3000 验证清单（待实际设备测试）

- [ ] apk add --allow-untrusted 安装成功
- [ ] apk list -I 能看到 luci-app-nini
- [ ] /etc/init.d/nini status = running
- [ ] 7890/7892/7893/9090 端口监听正常
- [ ] ubus call nini dashboard_status 正常返回 JSON
- [ ] firewall=true, state=transparent proxy active, tproxy_ok=true, nft_table=true
- [ ] mode=cnip, lan_ifname=br-lan
- [ ] nft list table inet nini 存在
- [ ] LuCI 页面无 SyntaxError / ReferenceError
- [ ] 运行状态卡片横向并排
- [ ] 节点表不显示 AUTO 行
- [ ] 顶部 AUTO 自动选择按钮存在
- [ ] 基础设置两卡片正常
- [ ] 订阅页正常
- [ ] 高级设置 LAN 下拉正常
- [ ] 日志中文正常
- [ ] 手机 YouTube / X / Google / TikTok 正常
- [ ] 拼多多显示人民币
