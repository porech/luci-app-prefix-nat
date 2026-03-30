include $(TOPDIR)/rules.mk

PKG_VERSION:=1.0.0
PKG_RELEASE:=1

LUCI_TITLE:=LuCI support for 1:1 Prefix NAT
LUCI_DESCRIPTION:=Provides a LuCI interface to configure nftables 1:1 prefix NAT rules (subnet-to-subnet translation). Rules are generated as nftables includes compatible with firewall4.
LUCI_DEPENDS:=+luci-base +nftables

PKG_LICENSE:=MIT
PKG_MAINTAINER:=Alessandro Rinaldi

include $(TOPDIR)/feeds/luci/luci.mk

$(eval $(call BuildPackage,luci-app-prefix-nat))
