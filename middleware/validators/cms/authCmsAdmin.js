const jwt = require('jsonwebtoken');

const authCmsAdmin = (req, res, next) => {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];
	if (token) {
		jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
			if (err) return res.status(403).json({ msg: 'Session expired.' });

			if (!user.cmsAdminId)
				return res.status(401).json({
					userData: user,
					msg: 'Action can only be performed by a Wholeseller Admin.',
				});
			req.cmsAdmin = user;
			next();
		});
	} else return res.status(401).json({ msg: 'User unauthorized.' });
};

module.exports = authCmsAdmin;
