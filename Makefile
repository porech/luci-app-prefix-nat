include $(TOPDIR)/rules.mk

PKG_VERSION:=1.0.0
PKG_RELEASE:=3

LUCI_TITLE:=LuCI support for 1:1 Prefix NAT
LUCI_DESCRIPTION:=Provides a LuCI interface to configure nftables 1:1 prefix NAT rules (subnet-to-subnet translation). Rules are generated as nftables includes compatible with firewall4.
LUCI_DEPENDS:=+luci-base +nftables

PKG_LICENSE:=MIT
PKG_MAINTAINER:=Alessandro Rinaldi

include $(TOPDIR)/feeds/luci/luci.mk

define Package/luci-app-prefix-nat/install
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/i18n
	$(INSTALL_DATA) ./po/zh_Hans/prefix-nat.po $(1)/usr/lib/lua/luci/i18n/prefix-nat.zh_Hans.po
endef

$(eval $(call BuildPackage,luci-app-prefix-nat))
