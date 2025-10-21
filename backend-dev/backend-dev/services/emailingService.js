const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// const sendEmail = async ({ to, cc, subject, text, html, attachments }) => {
// 	try {
// 		await mailTransport.sendMail({
// 			to,
// 			from: process.env.EMAIL_USER,
// 			...(cc && { cc }),
// 			...(subject && { subject }),
// 			...(text && { text }),
// 			...(html && { html }),
// 			...(attachments && { attachments }),
// 		});
// 		return { emailSent: true, error: null };
// 	} catch (e) {
// 		console.error('NODEMAILER ERROR:\n', e);
// 		return { emailSent: false, error: e };
// 	}
// };
const sendEmail = async ({ to, cc, subject, text, html, attachments }) => {
	try {
		const msg = {
			to,
			from: 'support@covernomads.com',
			...(cc && { cc }),
			...(subject && { subject }),
			...(text && { text }),
			...(html && { html }),
			...(attachments && {
				attachments: attachments.map((attachment) => ({
					content: attachment.content.toString('base64'),
					filename: attachment.filename,
					type: attachment.contentType,
					disposition: 'attachment',
				})),
			}),
		};
		await sgMail.send(msg);
		return { emailSent: true, error: null };
	} catch (error) {
		return { emailSent: false, error: error };
	}
};
module.exports = { sendEmail };
