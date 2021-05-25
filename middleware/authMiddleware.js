const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authRoutes = ['login', 'register', 'forgot-password', 'reset-password'];

// for routes that require user authentication
const requireAuth = (req, res, next) => {
    const token = req.cookies.jwt;

    // check if jwt exist and is verified
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
            if (err) {
                console.log(err);
                res.redirect('/user/login');
            }
            else {
                // console.log(decodedToken);
                next();
            }
        });
    }
    else {
        res.redirect('/user/login');
    }
}

// for routes that can only be visited after logout
const checkAuth = (req, res, next) => {
    const token = req.cookies.jwt;

    // check if jwt exist and is verified
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
            if (err) {
                console.log(err);
                res.redirect('/user/logout');
            }
            else {
                // console.log(decodedToken);
                res.redirect('/');
            }
        });
    }
    else {
        next();
    }
}

// check and get current user info
const checkUser = (req, res, next) => {
    const token = req.cookies.jwt;

    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
            if (err) {
                console.log(err);
                res.locals.user = null;
                next();
            }
            else {
                // console.log(decodedToken);
                const user = await User.findById(decodedToken.id, 'name email isAdmin').lean();
                res.locals.user = user;
                // console.log(user);
                next();
            }
        });
    }
    else {
        res.locals.user = null;
        next();
    }
}

module.exports = { requireAuth, checkAuth, checkUser };

// hide auth routes for loggedin user
// if (authRoutes.includes(req.originalUrl.split("?")[0].split("/").pop())) {
//     res.redirect('/');
// }