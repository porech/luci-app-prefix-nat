'use strict';
'require view';
'require form';
'require uci';

function validateCIDR(value) {
	var m = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
	if (!m)
		return _('Must be a valid CIDR subnet (e.g. 192.168.1.0/24)');
	for (var i = 1; i <= 4; i++) {
		if (parseInt(m[i], 10) > 255)
			return _('Invalid IP address: octet %d is out of range').format(i);
	}
	if (parseInt(m[5], 10) > 32)
		return _('Invalid prefix length: must be 0-32');
	return true;
}

return view.extend({
	render: function () {
		var m, s, o;

		m = new form.Map('prefix-nat', _('1:1 Prefix NAT'),
			_('Configure nftables 1:1 prefix NAT rules for subnet-to-subnet translation. ' +
			  'Each rule maps a local subnet to a virtual subnet on a specific interface. ' +
			  'Rules are generated as nftables includes and loaded by firewall4.'));

		// Global enable
		s = m.section(form.NamedSection, 'global', 'prefix-nat', _('Global Settings'));
		s.anonymous = true;

		o = s.option(form.Flag, 'enabled', _('Enable'),
			_('Enable prefix NAT rule generation. When disabled, all rules are removed.'));
		o.rmempty = false;

		// Rules
		s = m.section(form.GridSection, 'rule', _('Translation Rules'));
		s.addremove = true;
		s.anonymous = true;
		s.sortable = true;

		o = s.option(form.Flag, 'enabled', _('Enable'));
		o.default = '1';
		o.editable = true;

		o = s.option(form.Value, 'description', _('Description'));
		o.optional = true;
		o.placeholder = 'e.g. Studio LAN via tunnel';
		o.modalonly = false;
		o.validate = function (section_id, value) {
			if (value && /[";{}\\]/.test(value))
				return _('Description must not contain quotes, semicolons, braces, or backslashes');
			return true;
		};

		o = s.option(form.Value, 'src', _('Local Subnet'));
		o.rmempty = false;
		o.placeholder = '192.168.9.0/24';
		o.datatype = 'cidr4';

		o = s.option(form.Value, 'dest', _('Virtual Subnet'));
		o.rmempty = false;
		o.placeholder = '10.0.1.0/24';
		o.validate = function (section_id, value) {
			var result = validateCIDR(value);
			if (result !== true)
				return result;

			var src = this.map.lookupOption('src', section_id);
			if (src && src[0].formvalue(section_id)) {
				var srcPrefix = src[0].formvalue(section_id).split('/')[1];
				var destPrefix = value.split('/')[1];
				if (srcPrefix !== destPrefix)
					return _('Prefix length must match the local subnet (/' + srcPrefix + ')');
			}
			return true;
		};

		o = s.option(form.Value, 'interface', _('Interface'));
		o.rmempty = false;
		o.placeholder = 'wg_camion';
		o.datatype = 'network';

		o = s.option(form.Value, 'remote', _('Remote Subnet'));
		o.optional = true;
		o.placeholder = '10.0.1.0/24';
		o.datatype = 'cidr4';

		return m.render();
	}
});
