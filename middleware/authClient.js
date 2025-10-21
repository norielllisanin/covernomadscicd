const jwt = require('jsonwebtoken');

//allowedClients is an array of max [USER, WHOLESELLER, ADMIN]
const authClient = (allowedClients) => {
	return (req, res, next) => {
		const authHeader = req.headers['authorization'];
		const token = authHeader && authHeader.split(' ')[1];
		if (token) {
			jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
				if (err) {
					console.log('auth client', err);
					res.status(403).json({ msg: 'Session expired.' });
				}
				//agent or user auth
				else if (user.userId && allowedClients.includes('USER')) {
					req.user = user;
					next();
				} else if (user.insurerAdminId && allowedClients.includes('INSURER')) {
					req.insurerAdmin = user;
					next();
				} else if (user.brokerAdminId && allowedClients.includes('BROKER')) {
					req.brokerAdmin = user;
					next();
				}

				//wholeseller auth
				else if (
					user.wholesellerAdminId &&
					allowedClients.includes('WHOLESELLER')
				) {
					req.wholesellerAdmin = user;
					next();
				}
				//cvn admin auth
				else if (user.cvnAdminId && allowedClients.includes('ADMIN')) {
					req.cvnAdmin = user;
					next();
				} else
					res.status(401).json({ msg: 'User not allowed to perform action.' });
			});
		} else return res.status(401).json({ msg: 'User unauthorized.' });
	};
};

module.exports = authClient;
