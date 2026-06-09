-- NINI utility module
local util = {}

function util.trim(s)
	return (s:gsub("^%s*(.-)%s*$", "%1"))
end

function util.split(str, sep)
	sep = sep or "%s"
	local t = {}
	for s in string.gmatch(str, "([^" .. sep .. "]+)") do
		table.insert(t, s)
	end
	return t
end

function util.file_exists(path)
	local f = io.open(path, "r")
	if f then
		f:close()
		return true
	end
	return false
end

function util.read_file(path)
	local f = io.open(path, "r")
	if not f then return nil end
	local content = f:read("*a")
	f:close()
	return content
end

function util.write_file(path, content)
	local f = io.open(path, "w")
	if not f then return false end
	f:write(content)
	f:close()
	return true
end

return util
