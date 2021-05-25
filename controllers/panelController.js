const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Dashboard GET Request Controllers
module.exports.dashboard_get = (req, res) => {
    res.render('panel/dashboard', {layout: 'user-panel', title: 'Dashboard', isDashboard: true});
}
module.exports.profile_get = (req, res) => {
    res.render('panel/profile', {layout: 'user-panel', title: 'Profile', isProfile: true});
}
module.exports.manageUsers_get = (req, res) => {
    // check if user is admin or not
    const token = req.cookies.jwt;
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
        if (!err) {
            User.findById(decodedToken.id, 'isAdmin', async (err, user) => {
                if (user.isAdmin) {
                    const users = await User.find({}, '_id name email isAdmin isApproved createdAt').lean();
                    res.render('panel/manage-users', { layout: 'user-panel', title: 'Manage Users', isManageUsers: true, users, helpers: { formatDate: function(date) { return date.toString().substr(0,24) } } });
                }
                else {
                    res.redirect('/panel/dashboard');
                }
            });
        }
    });
}
module.exports.analytics_get = (req, res) => {
    res.render('panel/analytics', {layout: 'user-panel', title: 'Analytics', isAnalytics: true});
}

// Dashboard PATCH Request Controllers

// change current user password
module.exports.changeUserPassword_patch = (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const errors = {};
    // seed errors object only if there is validation error
    ( oldPassword && oldPassword.length >= 6 ) ? '' : errors.oldPassword = 'Must be min. 6 characters';
    ( newPassword && newPassword.length >= 6 ) ? ( (newPassword != oldPassword) ? '' : errors.newPassword = 'Must not match Old Password' ) : errors.newPassword = 'Must be min. 6 characters';
    
    // move ahead if valid request data
    if (Object.keys(errors).length === 0) {
        // get jwt cookie
        const token = req.cookies.jwt;
        jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
            if (!err) {
                try {
                    // get current user
                    const user = await User.findOne({ _id: decodedToken.id  });
                    // compare old password with database
                    const passMatch = await User.comparePasswords(oldPassword.trim(), user.password);
                    // if old password match, update database with new password
                    if (passMatch) {
                        await User.updateOne({ _id:decodedToken.id }, { password: newPassword.trim() });
                        res.status(201).json({ success: { message: "Password Updated successfully" } });
                    } else {
                        errors.oldPassword = 'Incorrect Password';
                        res.status(400).json({ errors });
                    }
                } catch(err) {
                    res.status(400).json({ errors: { server: err.message } });
                }
            }
        });
    } else {
        res.status(400).json({ errors });
    }
}

// approve user
module.exports.approveUser_patch = async (req, res) => {
    // get jwt cookie
    const token = req.cookies.jwt;
    // verify jwt cookie
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
        if (!err) {
            // get current user
            User.findById(decodedToken.id, 'isAdmin', async (err, user) => {
                if (err) {
                    res.redirect('/');
                }
                // allow admin only
                if (user.isAdmin) {
                    // update here
                    const userId = req.body.usr;

                    await User.updateOne({_id: userId }, { isApproved: true }, (err, writeOpResult) => {
                        if (!err) {
                            console.log(writeOpResult);
                            res.status(201).json({ success: { message: 'User approved!!' } });
                        } else { 
                            res.status(400).json({ errors: { server: 'User Status updation failed!!' } });
                        }
                    });
                }
                else {
                    res.redirect('/panel/dashboard');
                }
            });
        }
        else {
            res.redirect('/');
        }
    });
}

// delete user
module.exports.deleteUser_patch = async (req, res) => {
    // get jwt cookie
    const token = req.cookies.jwt;
    // verify jwt cookie
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
        if (!err) {
            // get current user
            User.findById(decodedToken.id, 'isAdmin', async (err, user) => {
                if (err) {
                    res.redirect('/');
                }
                // allow admin only
                if (user.isAdmin) {
                    // delete user here
                    const userId = req.body.usr;
                    
                    await User.deleteOne({_id: userId }, (err, writeOpResult) => {
                        if (!err) {
                            console.log(writeOpResult);
                            res.status(201).json({ success: { message: 'User deleted!!' } });
                        } else { 
                            res.status(400).json({ errors: { server: 'User deletion failed!!' } });
                        }
                    });
                }
                else {
                    res.redirect('/panel/dashboard');
                }
            });
        }
        else {
            res.redirect('/');
        }
    });
}