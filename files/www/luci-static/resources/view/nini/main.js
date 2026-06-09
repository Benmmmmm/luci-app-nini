'use strict';
'require baseclass';
'require form';
'require rpc';
'require uci';
'require fs';
'require ui';
'require view';
'require poll';

var callNiniDashboard = rpc.declare({
	object: 'nini',
	method: 'dashboard_status',
	expect: {}
});

var callNiniProxyState = rpc.declare({
	object: 'nini',
	method: 'proxy_state',
	expect: { proxies: [] }
});

var callNiniSwitchNode = rpc.declare({
	object: 'nini',
	method: 'switch_node',
	params: ['node']
});

var callNiniAutoSelect = rpc.declare({
	object: 'nini',
	method: 'auto_select'
});

var callNiniTestDelay = rpc.declare({
	object: 'nini',
	method: 'test_delay'
});

var callNiniUpdateRules = rpc.declare({
	object: 'nini',
	method: 'update_rules'
});

var callNiniFetchSubs = rpc.declare({
	object: 'nini',
	method: 'fetch_subscriptions'
});

var callNiniIpv6Test = rpc.declare({
	object: 'nini',
	method: 'ipv6_test'
});

var callNiniGetLogs = rpc.declare({
	object: 'nini',
	method: 'get_logs',
	params: ['limit']
});

function showWaiter(title) {
	var dlg = ui.showModal(title || '正在应用配置，请稍候...', [
		E('div', { 'class': 'spinning' }, ''),
		E('p', {}, '请稍候，正在处理...')
	]);
	dlg.classList.add('spinning');
	return dlg;
}

function hideWaiter(dlg) {
	if (dlg) ui.hideModal(dlg);
}

function pollStatus(timeout, onSuccess, onFail) {
	var elapsed = 0;
	var interval = 2000;
	var maxWait = timeout || 30000;

	function check() {
		return callNiniDashboard().then(function(data) {
			elapsed += interval;
			if (data && data.service_running === true) {
				if (onSuccess) onSuccess(data);
				return true;
			}
			if (elapsed >= maxWait) {
				if (onFail) onFail();
				return true;
			}
			return false;
		}).catch(function() {
			elapsed += interval;
			if (elapsed >= maxWait) {
				if (onFail) onFail();
				return true;
			}
			return false;
		});
	}

	poll.add(check, interval);
}

function performAction(action, title, reload) {
	var dlg = showWaiter(title);
	var btn = document.activeElement;
	if (btn) btn.disabled = true;

	action().then(function(result) {
		if (reload) {
			pollStatus(30000, function() {
				hideWaiter(dlg);
				ui.addNotification(null, E('p', {}, '操作成功完成'), 'success');
				window.location.reload();
			}, function() {
				hideWaiter(dlg);
				ui.addNotification(null, E('p', {}, '操作超时，请检查服务状态'), 'error');
			});
		} else {
			hideWaiter(dlg);
			ui.addNotification(null, E('p', {}, '操作成功完成'), 'success');
		}
	}).catch(function(err) {
		hideWaiter(dlg);
		ui.addNotification(null, E('p', {}, '操作失败: ' + (err || '未知错误')), 'error');
	}).finally(function() {
		if (btn) btn.disabled = false;
	});
}

function renderStatusCards(data) {
	var statusText = data.service_running === true ? '运行中' : '已停止';
	var tproxyText = data.tproxy_ok === true ? '已接管' : '未接管';
	var fwText = data.firewall === true ? '已启用' : '未启用';
	var apiText = data.api_ok === true ? '可用' : '不可用';

	return E('div', { 'class': 'cbi-section' }, [
		E('h3', {}, '运行状态'),
		E('div', { 'class': 'table' }, [
			E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td', 'style': 'width:40%;font-weight:bold;' }, '服务状态'),
				E('div', { 'class': 'td' }, statusText)
			]),
			E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '透明代理'),
				E('div', { 'class': 'td' }, tproxyText)
			]),
			E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '防火墙'),
				E('div', { 'class': 'td' }, fwText)
			]),
			E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '分流模式'),
				E('div', { 'class': 'td' }, data.mode_text || '国内外分流（推荐）')
			]),
			E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '节点数量'),
				E('div', { 'class': 'td' }, String(data.proxy_count || 0))
			]),
			E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, 'API 状态'),
				E('div', { 'class': 'td' }, apiText)
			])
		])
	]);
}

function renderNodeCard(data) {
	var policyText = data.current_node || 'AUTO';
	if (policyText === 'AUTO') policyText = 'AUTO 自动选择';

	return E('div', { 'class': 'cbi-section' }, [
		E('h3', {}, '当前节点'),
		E('div', { 'class': 'table' }, [
			E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td', 'style': 'width:40%;font-weight:bold;' }, '策略入口'),
				E('div', { 'class': 'td' }, policyText)
			]),
			E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '当前代理'),
				E('div', { 'class': 'td' }, data.current_node || '-')
			]),
			E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, 'AUTO 节点'),
				E('div', { 'class': 'td' }, data.auto_node || '-')
			]),
			E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, 'FALLBACK 节点'),
				E('div', { 'class': 'td' }, data.fallback_node || '-')
			]),
			E('div', { 'class': 'tr' }, [
				E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '更新时间'),
				E('div', { 'class': 'td' }, data.update_time || '-')
			])
		])
	]);
}

function renderNodeTable(proxies, currentNode) {
	var rows = [];
	for (var i = 0; i < proxies.length; i++) {
		var p = proxies[i];
		if (!p || p.name === 'AUTO') continue;

		var isCurrent = (p.name === currentNode);
		var statusText = p.delay || '可用，未返回延迟';
		if (statusText === 'null' || statusText === '') statusText = '超时';

		rows.push(E('div', { 'class': 'tr' }, [
			E('div', { 'class': 'td' }, p.name || ''),
			E('div', { 'class': 'td' }, p.type || '-'),
			E('div', { 'class': 'td' }, p.server || '-'),
			E('div', { 'class': 'td' }, statusText),
			E('div', { 'class': 'td' }, isCurrent ? '当前' : ''),
			E('div', { 'class': 'td' }, [
				E('button', {
					'class': 'cbi-button cbi-button-action',
					'click': function(ev) {
						ev.preventDefault();
						performAction(function() {
							return callNiniSwitchNode(p.name);
						}, '正在切换节点...', true);
					}
				}, '切换')
			])
		]));
	}

	return E('div', { 'class': 'cbi-section' }, [
		E('h3', {}, '节点列表'),
		E('div', { 'class': 'table' }, [
			E('div', { 'class': 'tr table-titles' }, [
				E('div', { 'class': 'th' }, '节点'),
				E('div', { 'class': 'th' }, '类型'),
				E('div', { 'class': 'th' }, '服务器 / IP'),
				E('div', { 'class': 'th' }, '延迟'),
				E('div', { 'class': 'th' }, '当前状态'),
				E('div', { 'class': 'th' }, '操作')
			])
		].concat(rows))
	]);
}

function renderStatusTab(data, proxies) {
	return E('div', {}, [
		E('div', { 'class': 'cbi-section', 'style': 'display:flex;flex-wrap:wrap;gap:1rem;' }, [
			E('div', { 'style': 'flex:1;min-width:300px;' }, renderStatusCards(data)),
			E('div', { 'style': 'flex:1;min-width:300px;' }, renderNodeCard(data))
		]),
		E('div', { 'class': 'cbi-section' }, [
			E('div', { 'style': 'display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;' }, [
				E('button', {
					'class': 'cbi-button cbi-button-action',
					'click': function(ev) {
						ev.preventDefault();
						performAction(function() {
							return callNiniAutoSelect();
						}, '正在切换 AUTO...', true);
					}
				}, 'AUTO 自动选择'),
				E('button', {
					'class': 'cbi-button cbi-button-reset',
					'click': function(ev) {
						ev.preventDefault();
						performAction(function() {
							return fs.exec('/etc/init.d/nini', ['stop']);
						}, '正在停止 NINI...', true);
					}
				}, '停止 NINI'),
				E('button', {
					'class': 'cbi-button cbi-button-reload',
					'click': function(ev) {
						ev.preventDefault();
						performAction(function() {
							return fs.exec('/etc/init.d/nini', ['restart']);
						}, '正在重启 NINI...', true);
					}
				}, '重启 NINI'),
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': function(ev) {
						ev.preventDefault();
						performAction(function() {
							return callNiniTestDelay();
						}, '正在测试节点延迟...', false);
					}
				}, '测试所有节点')
			])
		]),
		renderNodeTable(proxies, data.current_node)
	]);
}

function renderBasicTab(data) {
	var modeText = data.mode_text || '国内外分流（推荐）';
	var ruleStatus = data.rule_status || '未生效';
	var ruleUpdated = data.rule_updated || '未完成';
	var tproxyText = data.tproxy_ok === true ? '正常' : '异常';
	var fwText = data.firewall === true ? '已启用' : '未启用';
	var proxyText = data.tproxy_ok === true ? '已接管' : '未接管';

	return E('div', {}, [
		E('div', { 'class': 'cbi-section' }, [
			E('h3', {}, '分流规则与透明代理'),
			E('div', { 'class': 'table' }, [
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'width:40%;font-weight:bold;' }, '当前模式'),
					E('div', { 'class': 'td' }, modeText)
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '规则状态'),
					E('div', { 'class': 'td' }, ruleStatus)
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '今日规则更新'),
					E('div', { 'class': 'td' }, ruleUpdated)
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '规则源'),
					E('div', { 'class': 'td' }, data.rule_source || '-')
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '代理规则'),
					E('div', { 'class': 'td' }, String(data.proxy_rules || 0))
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '拦截规则'),
					E('div', { 'class': 'td' }, String(data.reject_rules || 0))
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '跳过 GEOIP'),
					E('div', { 'class': 'td' }, String(data.skipped_geoip || 0))
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '兜底策略'),
					E('div', { 'class': 'td' }, data.fallback || 'MATCH,PROXY')
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '透明代理'),
					E('div', { 'class': 'td' }, proxyText)
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '防火墙'),
					E('div', { 'class': 'td' }, fwText)
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, 'UDP TProxy'),
					E('div', { 'class': 'td' }, tproxyText)
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, 'LAN 接口'),
					E('div', { 'class': 'td' }, data.lan_ifname || 'br-lan')
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '规则更新时间'),
					E('div', { 'class': 'td' }, data.rule_update_time || '-')
				])
			]),
			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'class': 'cbi-section-descr' }, [
					E('details', {}, [
						E('summary', {}, '说明与技术细节'),
						E('div', {}, [
							E('p', {}, '可转换直连规则: ' + String(data.direct_rules || 0)),
							E('p', {}, 'skipped_geoip: ' + String(data.skipped_geoip || 0)),
							E('p', {}, '其他调试字段将在 debug_log=1 时显示')
						])
					])
				])
			])
		]),
		E('div', { 'class': 'cbi-section' }, [
			E('h3', {}, 'DNS 与 IPv6'),
			E('div', { 'class': 'table' }, [
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'width:40%;font-weight:bold;' }, 'DNS 模式'),
					E('div', { 'class': 'td' }, data.dns_mode || '直接劫持 LAN DNS')
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '接管 LAN DNS'),
					E('div', { 'class': 'td' }, data.dns_hijack === true ? '是' : '否')
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '排除路由器 DNS'),
					E('div', { 'class': 'td' }, data.exclude_router_dns === true ? '是' : '否')
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, 'AAAA 返回'),
					E('div', { 'class': 'td' }, data.allow_ipv6_dns === true ? '开启' : '关闭')
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '上游 DNS'),
					E('div', { 'class': 'td' }, '223.5.5.5, 119.29.29.29 / 1.1.1.1, 8.8.8.8')
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, 'IPv6 出口'),
					E('div', { 'class': 'td' }, data.ipv6_ok === true ? '正常' : '未通过')
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '网关 IPv6 测试'),
					E('div', { 'class': 'td' }, data.ipv6_gw || '未通过')
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '公网 IPv6 测试'),
					E('div', { 'class': 'td' }, data.ipv6_pub || '未通过')
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, 'IPv6 节点'),
					E('div', { 'class': 'td' }, (data.ipv6_node_count || 0) + ' / ' + (data.ipv6_node_total || 0))
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, 'mihomo IPv6'),
					E('div', { 'class': 'td' }, data.mihomo_ipv6 === true ? '开启' : '关闭')
				])
			])
		]),
		E('div', { 'class': 'cbi-section' }, [
			E('div', { 'style': 'display:flex;gap:0.5rem;flex-wrap:wrap;' }, [
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': function(ev) {
						ev.preventDefault();
						performAction(function() {
							return callNiniUpdateRules();
						}, '正在更新分流规则...', true);
					}
				}, '更新分流规则'),
				E('button', {
					'class': 'cbi-button cbi-button-save',
					'click': function(ev) {
						ev.preventDefault();
						performAction(function() {
							return fs.exec('/etc/init.d/nini', ['restart']);
						}, '正在保存并应用...', true);
					}
				}, '保存并应用')
			])
		])
	]);
}

function renderSubscriptionTab() {
	return E('div', {}, [
		E('div', { 'class': 'cbi-section' }, [
			E('p', { 'class': 'cbi-section-descr' }, '切换订阅流程：1. 勾选要启用的订阅 2. 点击保存订阅设置 3. 点击拉取并应用节点')
		]),
		E('div', { 'class': 'cbi-section' }, [
			E('h3', {}, '订阅列表'),
			E('div', { 'id': 'nini-sub-list', 'class': 'table' }, [
				E('div', { 'class': 'tr table-titles' }, [
					E('div', { 'class': 'th' }, '启用'),
					E('div', { 'class': 'th' }, '名称'),
					E('div', { 'class': 'th' }, 'URL'),
					E('div', { 'class': 'th' }, '保留关键词'),
					E('div', { 'class': 'th' }, '排除关键词')
				])
			])
		]),
		E('div', { 'class': 'cbi-section' }, [
			E('div', { 'style': 'display:flex;gap:0.5rem;flex-wrap:wrap;' }, [
				E('button', {
					'class': 'cbi-button cbi-button-save',
					'click': function(ev) {
						ev.preventDefault();
						ui.addNotification(null, E('p', {}, '订阅设置已保存'), 'success');
					}
				}, '保存订阅设置'),
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': function(ev) {
						ev.preventDefault();
						performAction(function() {
							return callNiniFetchSubs();
						}, '正在拉取并应用节点...', true);
					}
				}, '拉取并应用节点')
			])
		])
	]);
}

function renderAdvancedTab() {
	return E('div', {}, [
		E('div', { 'class': 'cbi-section' }, [
			E('h3', {}, '高级设置'),
			E('div', { 'class': 'table' }, [
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'width:40%;font-weight:bold;' }, 'LAN 接口'),
					E('div', { 'class': 'td' }, 'br-lan')
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, 'Mixed 代理端口'),
					E('div', { 'class': 'td' }, '7890')
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, 'TCP 透明代理端口'),
					E('div', { 'class': 'td' }, '7892')
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, 'UDP 透明代理端口'),
					E('div', { 'class': 'td' }, '7893')
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '控制 API 端口'),
					E('div', { 'class': 'td' }, '9090')
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '启用 mihomo IPv6 支持'),
					E('div', { 'class': 'td' }, E('input', { 'type': 'checkbox' }))
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '允许 DNS 返回 IPv6 地址 / AAAA'),
					E('div', { 'class': 'td' }, E('input', { 'type': 'checkbox' }))
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '允许 LAN 访问控制 API'),
					E('div', { 'class': 'td' }, E('input', { 'type': 'checkbox' }))
				]),
				E('div', { 'class': 'tr' }, [
					E('div', { 'class': 'td', 'style': 'font-weight:bold;' }, '当前调试日志'),
					E('div', { 'class': 'td' }, E('input', { 'type': 'checkbox' }))
				])
			])
		]),
		E('div', { 'class': 'cbi-section' }, [
			E('div', { 'style': 'display:flex;gap:0.5rem;flex-wrap:wrap;' }, [
				E('button', {
					'class': 'cbi-button cbi-button-save',
					'click': function(ev) {
						ev.preventDefault();
						ui.addNotification(null, E('p', {}, '高级设置已保存'), 'success');
					}
				}, '保存高级设置'),
				E('button', {
					'class': 'cbi-button cbi-button-reload',
					'click': function(ev) {
						ev.preventDefault();
						performAction(function() {
							return fs.exec('/etc/init.d/nini', ['restart']);
						}, '正在保存并重启 NINI...', true);
					}
				}, '保存并重启 NINI')
			])
		])
	]);
}

function renderLogsTab(logs) {
	var lines = [];
	if (logs && logs.logs) {
		for (var i = 0; i < logs.logs.length; i++) {
			lines.push(E('div', {}, logs.logs[i]));
		}
	}
	return E('div', {}, [
		E('div', { 'class': 'cbi-section' }, [
			E('h3', {}, '运行日志'),
			E('div', {
				'style': 'font-family:monospace;font-size:12px;white-space:pre-wrap;max-height:500px;overflow-y:auto;background:#f5f5f5;padding:1rem;border:1px solid #ddd;'
			}, lines)
		])
	]);
}

return view.extend({
	load: function() {
		return Promise.all([
			callNiniDashboard(),
			callNiniProxyState(),
			callNiniGetLogs(200)
		]);
	},

	render: function(data) {
		var dashboard = data[0] || {};
		var proxies = data[1] || [];
		var logs = data[2] || { logs: [] };

		var tabs = [
			{
				title: '运行状态',
				content: renderStatusTab(dashboard, proxies)
			},
			{
				title: '基础设置',
				content: renderBasicTab(dashboard)
			},
			{
				title: '订阅与分享',
				content: renderSubscriptionTab()
			},
			{
				title: '高级设置',
				content: renderAdvancedTab()
			},
			{
				title: '日志',
				content: renderLogsTab(logs)
			}
		];

		var tabContainer = E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, 'NINI 透明代理管理')
		]);

		var tabHeaders = E('div', { 'class': 'cbi-tabmenu' });
		var tabBodies = E('div', { 'class': 'cbi-tabcontainer' });

		for (var i = 0; i < tabs.length; i++) {
			(function(idx) {
				var header = E('div', {
					'class': 'cbi-tab' + (idx === 0 ? ' cbi-tab-active' : ''),
					'click': function() {
						for (var j = 0; j < tabHeaders.childNodes.length; j++) {
							tabHeaders.childNodes[j].classList.remove('cbi-tab-active');
							tabBodies.childNodes[j].style.display = 'none';
						}
						header.classList.add('cbi-tab-active');
						tabBodies.childNodes[idx].style.display = '';
					}
				}, tabs[idx].title);
				tabHeaders.appendChild(header);

				var body = E('div', {
					'class': 'cbi-tabpane',
					'style': idx === 0 ? '' : 'display:none;'
				}, tabs[idx].content);
				tabBodies.appendChild(body);
			})(i);
		}

		tabContainer.appendChild(tabHeaders);
		tabContainer.appendChild(tabBodies);

		return tabContainer;
	}
});
