# luci-app-prefix-nat

LuCI application for managing nftables 1:1 prefix NAT rules on OpenWRT.

Prefix NAT translates entire subnets 1:1 — each host in the source subnet maps to the same host number in the destination subnet. This is useful when connecting two sites that share the same IP range.

## How it works

1. You define translation rules via LuCI (**Network → Firewall → Prefix NAT**) or UCI (`/etc/config/prefix-nat`)
2. The init script generates nftables rules using `dnat ip prefix to` / `snat ip prefix to`
3. Rules are placed in `/usr/share/nftables.d/table-post/10-prefix-nat.nft`
4. firewall4 loads them automatically on reload

## Example

SiteA and SiteB both use `192.168.1.0/24` on their LAN. A WireGuard tunnel (`wg0`) connects the two gateways. Without prefix NAT, the overlapping subnets make routing impossible. With prefix NAT, each site sees the other on a unique virtual subnet:

```
SiteA LAN                                          SiteB LAN
(192.168.1.0/24)                                   (192.168.1.0/24)
      |                                                  |
   [GW-A] --------------- wg0 tunnel --------------- [GW-B]
   192.168.1.1                                       192.168.1.1

SiteA sees SiteB as: 10.0.2.0/24          SiteB sees SiteA as: 10.0.1.0/24
e.g. SiteB's .50 → 10.0.2.50             e.g. SiteA's .50 → 10.0.1.50
```

A device at SiteA (`192.168.1.50`) wanting to reach a device at SiteB (`192.168.1.100`) connects to `10.0.2.100`. The prefix NAT on GW-A translates the source to `10.0.1.50` and sends it through the tunnel. GW-B receives it, translates the destination from `10.0.2.100` to `192.168.1.100`, and delivers it. Replies follow the reverse path.

### UCI configuration on GW-A (SiteA's gateway)

```
config prefix-nat 'global'
	option enabled '1'

config rule
	option enabled '1'
	option description 'SiteA LAN via tunnel to SiteB'
	option src '192.168.1.0/24'
	option dest '10.0.1.0/24'
	option interface 'wg0'
```

This tells GW-A:
- **Outbound** (LAN → tunnel): rewrite source `192.168.1.x` to `10.0.1.x`
- **Inbound** (tunnel → LAN): rewrite destination `10.0.1.x` to `192.168.1.x`

### UCI configuration on GW-B (SiteB's gateway)

```
config prefix-nat 'global'
	option enabled '1'

config rule
	option enabled '1'
	option description 'SiteB LAN via tunnel to SiteA'
	option src '192.168.1.0/24'
	option dest '10.0.2.0/24'
	option interface 'wg0'
```

This tells GW-B:
- **Outbound** (LAN → tunnel): rewrite source `192.168.1.x` to `10.0.2.x`
- **Inbound** (tunnel → LAN): rewrite destination `10.0.2.x` to `192.168.1.x`

### Generated nftables rules (GW-A)

```nft
chain prefix_nat_prerouting {
	type nat hook prerouting priority dstnat - 1; policy accept;
	iifname "wg0" ip daddr 10.0.1.0/24 dnat ip prefix to 192.168.1.0/24 comment "SiteA LAN via tunnel to SiteB"
}

chain prefix_nat_postrouting {
	type nat hook postrouting priority srcnat + 1; policy accept;
	oifname "wg0" ip saddr 192.168.1.0/24 snat ip prefix to 10.0.1.0/24 comment "SiteA LAN via tunnel to SiteB"
}
```

### Multiple interfaces

If a gateway has multiple tunnel interfaces (e.g., site-to-site + external VPN), add one rule per interface:

```
config rule
	option description 'LAN via site-to-site tunnel'
	option src '192.168.1.0/24'
	option dest '10.0.1.0/24'
	option interface 'wg_siteb'

config rule
	option description 'LAN via external VPN'
	option src '192.168.1.0/24'
	option dest '10.0.1.0/24'
	option interface 'wg_ext'
```

## Install

### Add the package repository

```sh
# Add the signing key
wget -qO /etc/opkg/keys/563209649ecb9283 \
  https://porech.github.io/luci-app-prefix-nat/prefix-nat-repo.pub

# Add the feed
echo "src/gz prefix-nat https://porech.github.io/luci-app-prefix-nat" \
  >> /etc/opkg/customfeeds.conf
```

### Install the package

```sh
opkg update
opkg install luci-app-prefix-nat
/etc/init.d/prefix-nat enable
```

Then open LuCI and navigate to **Network → Firewall → Prefix NAT**.

### Build from source (OpenWRT SDK)

Add the following line to `feeds.conf.default`:

```
src-git prefix-nat https://github.com/porech/luci-app-prefix-nat.git
```

Then:

```sh
./scripts/feeds update prefix-nat
./scripts/feeds install -a -p prefix-nat
make menuconfig   # enable LuCI → Applications → luci-app-prefix-nat
make package/luci-app-prefix-nat/compile
```

## UCI reference

### Global section

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `0` | Enable prefix NAT rule generation |

### Rule section

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `enabled` | boolean | no | Enable this rule (default: `1`) |
| `description` | string | no | Human-readable label (shown in nftables comments) |
| `src` | CIDR | yes | Local real subnet (e.g. `192.168.1.0/24`) |
| `dest` | CIDR | yes | Virtual translated subnet (e.g. `10.0.1.0/24`) |
| `interface` | string | yes | Network interface for translation (e.g. `wg0`) |

The `src` and `dest` subnets must have the same prefix length.

## Requirements

- OpenWRT 23.05+ (firewall4 / nftables)
- `luci-base`

## License

MIT
