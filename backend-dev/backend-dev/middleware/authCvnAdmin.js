const jwt = require('jsonwebtoken');

const authCvnAdmin = async (req, res, next) => {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];

	if (token) {
		jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
			if (err) {
				console.log('cvn admin', err);
				return res.status(403).json({ msg: 'Session expired.' });
			}

			if (!user.cvnAdminId)
				return res
					.status(401)
					.json({ msg: 'Action can only be performed by a CVN Admin.' });
			req.cvnAdmin = user;
			next();
		});
	} else return res.status(401).json({ msg: 'User unauthorized.' });
};

module.exports = authCvnAdmin;
