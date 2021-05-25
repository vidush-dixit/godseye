const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'Mailgun',
    auth: {
        user: process.env.MAILGUN_SMTP_USERNAME,
        pass: process.env.MAILGUN_SMTP_PASS
    }
});

// cb -> callback function
const sendMail = async (sender, recipient, subject, html, cb) => {
    const mailOptions = {
        from: sender ? sender : `"${process.env.MAILGUN_SMTP_SENDER_NAME}"<${process.env.MAILGUN_SMTP_SENDER}>`,
        to: recipient ? recipient : process.env.MAILGUN_SMTP_RECEIVER,
        subject,
        html
    };
    if (recipient != undefined) {
        mailOptions.attachments = [
            {
              filename: 'error_1.jpg',
              path: __dirname + '/assets/images/error_1.jpg',
              cid: 'uniq-reset-password-mail'
            }
        ]
    } else {
        mailOptions.attachments = [
            {
              filename: 'contactUs_1.jpg',
              path: __dirname + '/assets/images/contactUs_1.jpg',
              cid: 'uniq-contact-us-mail'
            }
        ]
    }
    await transporter.sendMail(mailOptions, (err, data) => {
        if (err) {
            cb(err, null);
        } else {
            cb(null, data);
        }
    });
}


module.exports = { sendMail };