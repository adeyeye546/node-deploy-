const passport = require('passport');
const crypto = require('crypto')
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');
exports.login = passport.authenticate('local',  {
    failureRedirect: '/login',
    failureFlash: 'Failed Login!',
    successRedirect: '/',
    successFlash: 'You are now logged in!'
});

exports.logout = (req, res) => {
    req.logout();
    req.flash('success', 'You are now logged out! bye');
    res.redirect('/');
}

exports.isLoggedIn = (req, res, next) => {
    //first check if the user is authenticated
    if (req.isAuthenticated()) {
        next(); 
        return;
    }
    req.flash('error', 'Oops! you must be logged in');
    res.redirect('/login');
};

exports.forgot = async (req, res) => {
    //1. see if a user with that email exists
    const user = await User.findOne({ email: req.body.email});
    if (!user) {
        req.flash('error', 'No Account with that email exists');
        return res.redirect('/login');
    }
    //2. set reset token and expiry on their account
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + 3600000; //1 hr from now
    await user.save();
    //3. send them email with the token
    const resetUrl = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
    await mail.send({
        user,
        subject:'Password Reset',
        resetUrl
    });
    req.flash('success', `You have been emailed a password reset link.`);
    //4. redirect to login page
    res.redirect('/login');
};

exports.reset = async (req,res) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now()}
    });
    if (!user) {
        req.flash('error', 'Password reset is invalid or expired');
        return res.redirect('/login');
    }
    //if there is a user,show the reset password form
    
    res.render('reset', { title: 'Reset your Password'});
};

exports.confirmPasswords = (req, res, next) => {
    if (req.body.password === req.body[confirm-password]) {
        next();
        return;
    }
    req.flash('error', 'Passwords do not match!');
    res.redirect('back');
};

exports.update = async (req, res) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now()}
    });
    if (!user) {
        req.flash('error', 'Password reset is invalid or expired');
        return res.redirect('/login');
    }
    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    const updatedUser = await user.save();
    await req.login(updatedUser);
    res.flash('success', 'Your password has been reset!, You are now logged in');
    res.redirect('/');
};