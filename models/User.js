const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { isEmail } = require('validator');
const { isName } = require('../validationHelper');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        validate: [isName, 'Invalid Name']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        validate: [isEmail, 'Invalid Email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minLength: [6, 'Must be atleast 6 characters long']
    },
    isAdmin: {
        type: Boolean,
        default: 0
    },
    isApproved: {
        type: Boolean,
        default: 0
    },
    isLoggedIn: {
        type: Boolean,
        default: 0
    }
}, {timestamps: true});

// Hash Password before saving User to the DB
userSchema.pre('save', async function (next) {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.pre('updateOne', async function (next) {
    if (this._update.password) {
        const salt = await bcrypt.genSalt();
        this._update.password = await bcrypt.hash(this._update.password, salt);
    }
    next();
});


// static comparePasswords method
userSchema.statics.comparePasswords = async (pass1, pass2) => {
    return await bcrypt.compare(pass1, pass2);
}

// static login method
userSchema.statics.login = async (email, password) => {
    let user = await User.findOne({ email });
    
    if (user) {
        const passMatch = await User.comparePasswords(password, user.password);
        if (passMatch) {
            if (user.isApproved) {
                if (!user.isLoggedIn) {
                    user = await User.findOneAndUpdate({ email }, { isLoggedIn: true });
                    return user;
                }
                throw Error('Another user Session is active');
            }
            throw Error('Account not yet Approved by Administrator');
        }
        throw Error('Invalid Password');
    }
    throw Error('Invalid Email');
}

const User = mongoose.model('user', userSchema);

module.exports = User;