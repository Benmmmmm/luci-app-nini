# NINI - LuCI 透明代理管理插件

版本：1.0.0

## 简介

NINI 是一个基于 mihomo 的透明代理管理插件，专为 ImmortalWrt 25.12.0 设计。

目标设备：
- 设备：Cudy TR3000 v1
- SoC：MT7981
- 架构：aarch64_cortex-a53
- 平台：mediatek / filogic

## 功能特性

1. **mihomo 核心管理** - 启动/停止/重启/配置生成/API 检查/节点切换/AUTO 自动选择/延迟测试
2. **透明代理** - 基于 nftables/firewall4，支持 IPv4/IPv6 TProxy，fwmark 策略路由
3. **分流模式** - 国内外分流（推荐）/ 全局代理
4. **规则源** - Johnshall 国内外分流源，运行时下载缓存，不依赖 GeoIP
5. **DNS 接管** - 劫持 LAN DNS，可选 AAAA 返回控制
6. **IPv6 支持** - 路由器 IPv6 出口检测，mihomo IPv6，IPv6 TProxy
7. **节点订阅** - 支持多个订阅源，关键词过滤
8. **统一等待器** - 所有操作带进度提示，避免误报失败

## 项目结构

```
luci-app-nini/
├── Makefile                          # OpenWrt 包构建定义
├── README.md                         # 本文件
├── BUILD.md                          # 构建指南
└── files/
    ├── etc/
    │   ├── config/nini               # UCI 默认配置
    │   └── init.d/nini               # procd 服务脚本
    ├── usr/
    │   ├── bin/ninictl               # 核心命令工具
    │   ├── lib/lua/
    │   │   ├── luci/controller/nini.lua   # LuCI 控制器
    │   │   └── nini/util.lua         # Lua 工具模块
    │   ├── libexec/rpcd/nini         # RPCD 插件
    │   └── share/
    │       ├── nini/                 # 数据目录
    │       └── rpcd/acl.d/
    │           └── luci-app-nini.json # ACL 权限文件
    └── www/luci-static/resources/view/nini/
        └── main.js                   # LuCI JavaScript 前端
```

## 安装

```bash
apk add --allow-untrusted ./luci-app-nini_1.0.0_aarch64_cortex-a53.apk
```

## 启动

```bash
/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart
/etc/init.d/nini enable
rm -f /tmp/nini/stopping /tmp/nini/start.lock
/etc/init.d/nini start
```

## 验证

```bash
apk list -I | grep -i nini
/etc/init.d/nini status
ss -lntup | grep -E ':7890|:7892|:7893|:9090'
ubus call nini dashboard_status
nft list table inet nini
```

## 端口说明

- 7890 - Mixed 代理端口
- 7892 - TCP 透明代理端口
- 7893 - UDP TProxy 端口
- 9090 - 控制 API 端口

## LuCI 页面

访问：http://路由器IP/cgi-bin/luci/admin/services/nini

包含 5 个标签页：
1. 运行状态 - 服务状态、节点列表、操作按钮
2. 基础设置 - 分流规则、DNS、IPv6
3. 订阅与分享 - 订阅管理、节点拉取
4. 高级设置 - 端口、接口、调试选项
5. 日志 - 运行日志（中文化）

## 依赖

- lua / lua5.1
- curl
- ca-bundle / ca-certificates
- luci-base / rpcd / uhttpd
- firewall4 / nftables
- kmod-nft-tproxy / kmod-nf-tproxy / kmod-nft-socket
- ip-full

## 回滚

```bash
/etc/init.d/nini stop
/etc/init.d/nini disable
apk del luci-app-nini
nft delete table inet nini 2>/dev/null || true
```

## 许可证

MIT License
