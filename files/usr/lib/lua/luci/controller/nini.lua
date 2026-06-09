module("luci.controller.nini", package.seeall)

function index()
	if not nixio.fs.access("/etc/config/nini") then
		return
	end

	local page = entry({"admin", "services", "nini"},
		view("nini/main"),
		_("NINI"), 60)
	page.dependent = true
	page.acl_depends = { "luci-app-nini" }
end
