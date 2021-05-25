const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendMail } = require('../mailHelper');
const { isEmail } = require('validator');

// Error Handling Helper funtion
const handleErrors = (err) => {
    let errors = {};

    // handling login errors
    if (err.message == "Invalid Email") {
        errors.email = err.message;
    }
    if (err.message == "Invalid Password") {
        errors.password = err.message;
    }
    if (err.message == "Account not yet Approved by Administrator") {
        errors.account = err.message;
    }
    if (err.message == "Another user Session is active") {
        errors.account = err.message;
    }
    
    // handling signup errors
    // handling duplicate email error
    if (err.code === 11000) {
        errors.email = 'Email already registered';
        return errors;
    }
    // handling mongoose validation errors
    if (err.message.includes('user validation failed')) {
        Object.values(err.errors).forEach( ( {properties} ) => {
            errors[properties.path] = properties.message;
        });
    }

    return errors;
}

// generate token id
const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: parseInt(process.env.MAX_AGE) * 3
    });
}
// generate token id by using unique secret of every user for reset password
const createUserWiseToken = (id, email, uniqueUserSecret, expiresIn) => {
    return jwt.sign({ id, email }, uniqueUserSecret, { expiresIn });
}

// User Authentication GET Request Handler Functions
module.exports.register_get = (req, res) => {
    res.render('user/register', {layout: 'user', title: 'Register'});
}
module.exports.login_get = (req, res) => {
    res.render('user/login', {layout: 'user', title: 'Login'});
}
module.exports.forgotPassword_get = (req, res) => {
    res.render('user/forgot-pass', {layout: 'user', title: 'Forgot Password'});
}
module.exports.resetPassword_get = async (req, res) => {
    const { id, token } = req.query;
    
    // check for valid token and user then only render page
    try {
        const user = await User.findOne({_id: id});
        if (user) {
            // use callback function instead of direct way
            const decodedToken = jwt.verify(token, process.env.JWT_SECRET+user.password);
            if (decodedToken.id == id) {
                res.cookie('resetId', id, { httpOnly: true, maxAge: parseInt(process.env.MAX_AGE_RESET_PASS) * 1000 });
                res.cookie('resetToken', token, { httpOnly: true, maxAge: parseInt(process.env.MAX_AGE_RESET_PASS) * 1000 });
                
                res.render(`user/reset-pass`, { layout: 'user', title: 'Reset Password' });
            }
            else {
                throw "Bad Request";
            }
        }
        else {
            throw "Bad Request";
        }
    }
    catch (err) {
        let type = "Bad Request";
        res.redirect('/error?type='+type);
    }
}
module.exports.logout_get = (req, res) => {
    const token = req.cookies.jwt;
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
            if (!err) {
                await User.updateOne({ _id: decodedToken.id  }, { isLoggedIn: false });    
            }
        });
        res.cookie('jwt', '', { httpOnly: true, maxAge: 1 });
    }
    res.redirect('/');
}


// User Authentication POST Request Handler Functions
module.exports.register_post = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const user = await User.create({ name, email, password });
        res.status(201).json({ success: { message: "Account created successfully.<br>Wait till it is approved by an administrator" }});
    }
    catch (err) {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
    }
}
module.exports.login_post = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.login(email, password);
        const token = createToken(user._id);
        res.cookie('jwt', token, { httpOnly: true, maxAge: parseInt(process.env.MAX_AGE) * 3 * 1000 });
        res.status(201).json({ success: { message: "Login successful" } });
    }
    catch (err) {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
    }
}
module.exports.forgotPassword_post = async (req, res) => {
    const { email } = req.body;

    if (isEmail(email)) {
        const user = await User.findOne({ email });
        // user exist so create one-time link with some validity
        if (user) {
            const token = createUserWiseToken(user._id, user.email, process.env.JWT_SECRET+user.password, '30m');
            const resetLink = `http://${process.env.APP_HOST}:${process.env.APP_PORT}/user/reset-password?id=${user._id}&token=${token}`;
            console.log(`Link is: ${resetLink}`);
            // send email here
            res.render('mailer/reset-pass-mail', { layout: 'mailer', resetLink, name: user.name }, (err, compiledHTML) => {
                sendMail( undefined, user.email, 'Important | Reset Password - GodsEye', compiledHTML, (err, data) => {
                    if (err) {
                        // Error in sending email
                        console.log(err);
                        res.status(500).json({ errors: { server: 'Err! Email could not be not sent.<br>Try again later' } });
                    }
                    else {
                        res.status(201).json({ success: { message: 'If entered email is registered with us, the url to reset your password has been sent to it.' } });
                    }
                });
            });
        }
        else {
            res.status(201).json({ success: { message: 'If entered email is registered with us, the url to reset your password has been sent to it.' } });
        }
    } else {
        res.status(400).json({ errors: { email: 'Invalid Email' } });
    }
}
module.exports.resetPassword_post = async (req, res) => {
    const { password } = req.body;
    const id = req.cookies.resetId;
    const token = req.cookies.resetToken;

    res.cookie('resetId', '', { httpOnly: true, maxAge: 1 });
    res.cookie('resetToken', '', { httpOnly: true, maxAge: 1 });
    
    if (password.length > 5) {
        // check for valid token and user then only update password
        try {
            const user = await User.findOne({_id: id});

            if (user) {
                // use callback function instead of direct way
                const decodedToken = jwt.verify(token, process.env.JWT_SECRET+user.password);
                if (decodedToken.id == id) {
                    // console.log(decodedToken.email);
                    await User.updateOne({ email: decodedToken.email }, { password });
                    res.status(201).json({ success: { message: "Password reset successfull" } });
                }
                else {
                    // console.log("Invalid Token");
                    throw "Invalid Reset Link! Please try again";
                }
            }
            else {
                // console.log("Invalid User");
                throw "Invalid Reset Link! Please try again";
            }
        }
        catch (err) {
            res.status(400).json({ errors: { server: err.message } });
        }
    } else {
        res.status(400).json({ errors: { password: "Must be atleast 6 characters long" } });
    }
}