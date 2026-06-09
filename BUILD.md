# NINI 构建指南

## 环境要求

- Linux x86_64 (推荐 Ubuntu 22.04/24.04)
- 至少 20GB 磁盘空间
- 稳定的网络连接

## SDK 下载

```bash
# 创建构建目录
mkdir -p ~/nini-build && cd ~/nini-build

# 下载 ImmortalWrt 25.12 SDK
wget https://downloads.immortalwrt.org/releases/25.12.0/targets/mediatek/filogic/immortalwrt-sdk-25.12.0-mediatek-filogic_gcc-14.3.0_musl.Linux-x86_64.tar.zst

# 解压
sudo apt-get install -y zstd
tar --zstd -xvf immortalwrt-sdk-25.12.0-mediatek-filogic_gcc-14.3.0_musl.Linux-x86_64.tar.zst
cd immortalwrt-sdk-25.12.0-mediatek-filogic_gcc-14.3.0_musl.Linux-x86_64
```

## 集成 NINI 包

```bash
# 将本项目的 luci-app-nini 目录复制到 SDK 的 package/ 目录
cp -r /path/to/luci-app-nini package/

# 更新 feeds
./scripts/feeds update -a
./scripts/feeds install -a

# 配置包
make menuconfig
# 导航到: LuCI -> 3. Applications -> luci-app-nini (按 M 或 *)
```

## 编译

```bash
# 仅编译 luci-app-nini
make package/luci-app-nini/compile V=s -j$(nproc)

# 输出位置
# bin/packages/aarch64_cortex-a53/luci/luci-app-nini_1.0.0-1_aarch64_cortex-a53.apk
```

## 验证构建产物

```bash
ls -la bin/packages/aarch64_cortex-a53/luci/luci-app-nini_*.apk
```

## 安装到 TR3000

```bash
# 复制到路由器
scp bin/packages/aarch64_cortex-a53/luci/luci-app-nini_*.apk root@192.168.1.1:/tmp/

# SSH 到路由器并安装
ssh root@192.168.1.1
apk add --allow-untrusted /tmp/luci-app-nini_*.apk

# 启动服务
/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart
/etc/init.d/nini enable
/etc/init.d/nini start
```

## 验证安装

```bash
apk list -I | grep -i nini
/etc/init.d/nini status
ss -lntup | grep -E ':7890|:7892|:7893|:9090'
ubus call nini dashboard_status
nft list table inet nini
```

## 清理旧残留（升级时）

```bash
/etc/init.d/nini stop 2>/dev/null || true
rm -f /tmp/nini/stopping /tmp/nini/start.lock
rm -rf /tmp/nini
rm -rf /tmp/luci-* /tmp/rpcd*
rm -rf /usr/lib/lua/nini
rm -f /usr/bin/ninictl
rm -f /etc/init.d/nini
rm -f /usr/libexec/rpcd/nini
rm -f /usr/share/rpcd/acl.d/luci-app-nini.json
rm -rf /www/luci-static/resources/view/nini
rm -rf /usr/share/nini
```

## 回滚命令

```bash
/etc/init.d/nini stop
/etc/init.d/nini disable
apk del luci-app-nini
nft delete table inet nini 2>/dev/null || true
```
