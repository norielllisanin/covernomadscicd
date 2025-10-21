const jwt = require('jsonwebtoken');

const authToken = (req, res, next) => {
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];
	if (token) {
		jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
			if (err) {
				console.log('auth token', err);
				return res.status(403).json({ msg: '.' });
			}

			if (!user.userId)
				return res
					.status(401)
					.json({ msg: 'Action can only be performed by an agent.' });
			req.user = user;
			next();
		});
	} else return res.status(401).json({ msg: 'User unauthorized.' });
};

module.exports = { authToken };
