const permissionManager = (permissions) => {
	return (req, res, next) => {
		const requestedUserPermission = req.user.permission;
		if (permissions.includes(requestedUserPermission)) next();
		else
			res
				.status(403)
				.send('You do not have permission to perform requested action.');
	};
};

module.exports = permissionManager;
