const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const { compile } = require('handlebars');
const fs = require('fs');

const sendOtp = async (firstName, lastName, username, email, otp) => {
	const source = fs.readFileSync(
		`${process.cwd()}/templates/orient/OrientOTPVerification.html`,
		'utf8'
	);
	const template = compile(source);

	const replacements = {
		firstName: firstName || '',
		lastName: lastName || '',
		otp: otp,
		username: username || '',
	};

	const html = template(replacements);
	try {
		const msg = {
			to: email,
			from: 'support@covernomads.com',
			subject: `OTP for login to Covernomads portal ${username}`,
			html: html,
		};
		await sgMail.send(msg);
		return { emailSent: true, error: null };
	} catch (error) {
		return { emailSent: false, error: error };
	}
};

module.exports = sendOtp;
