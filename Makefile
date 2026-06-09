include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-nini
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

PKG_MAINTAINER:=NINI Project
PKG_LICENSE:=MIT

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-nini
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=NINI - Transparent Proxy Manager for mihomo
  URL:=https://github.com/nini-project/luci-app-nini
  DEPENDS:=+lua +curl +ca-bundle +ca-certificates +luci-base +rpcd +uhttpd +firewall4 +nftables +kmod-nft-tproxy +kmod-nf-tproxy +kmod-nft-socket +ip-full
  PKGARCH:=all
endef

define Package/luci-app-nini/description
  NINI is a LuCI-based transparent proxy management plugin for mihomo.
  Features: node subscription, CN/global routing, DNS hijacking,
  IPv6 support, TProxy (IPv4/IPv6), firewall4/nftables integration.
  Target: ImmortalWrt 25.12 / Cudy TR3000 v1 / aarch64_cortex-a53.
endef

define Build/Compile
endef

define Package/luci-app-nini/conffiles
/etc/config/nini
endef

define Package/luci-app-nini/install
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_DATA) ./files/etc/config/nini $(1)/etc/config/nini

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/nini $(1)/etc/init.d/nini

	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./files/usr/bin/ninictl $(1)/usr/bin/ninictl

	$(INSTALL_DIR) $(1)/usr/lib/lua/nini
	$(INSTALL_DATA) ./files/usr/lib/lua/nini/*.lua $(1)/usr/lib/lua/nini/

	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/controller
	$(INSTALL_DATA) ./files/usr/lib/lua/luci/controller/nini.lua $(1)/usr/lib/lua/luci/controller/nini.lua

	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./files/usr/libexec/rpcd/nini $(1)/usr/libexec/rpcd/nini

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./files/usr/share/rpcd/acl.d/luci-app-nini.json $(1)/usr/share/rpcd/acl.d/luci-app-nini.json

	$(INSTALL_DIR) $(1)/usr/share/nini
	$(INSTALL_DATA) ./files/usr/share/nini/* $(1)/usr/share/nini/ 2>/dev/null || true

	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/nini
	$(INSTALL_DATA) ./files/www/luci-static/resources/view/nini/main.js $(1)/www/luci-static/resources/view/nini/main.js

	$(INSTALL_DIR) $(1)/etc/nini/cache
endef

define Package/luci-app-nini/postinst
#!/bin/sh
[ -n "$$IPKG_INSTROOT" ] && exit 0

# Clean up old residues
/etc/init.d/nini stop 2>/dev/null || true
rm -f /tmp/nini/stopping /tmp/nini/start.lock
rm -rf /tmp/nini
rm -rf /tmp/luci-* /tmp/rpcd*

# Restart services
/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart
/etc/init.d/nini enable
rm -f /tmp/nini/stopping /tmp/nini/start.lock
/etc/init.d/nini start

exit 0
endef

define Package/luci-app-nini/prerm
#!/bin/sh
/etc/init.d/nini stop 2>/dev/null || true
rm -f /tmp/nini/stopping /tmp/nini/start.lock
rm -rf /tmp/nini
endef

$(eval $(call BuildPackage,luci-app-nini))
