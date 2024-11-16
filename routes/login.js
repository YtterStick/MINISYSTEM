const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

router.post('/', (req, res) => {
    const db = req.app.get('db');
    const { username, password } = req.body;

    // Check if user exists
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], (err, results) => {
        if (err) throw err;

        if (results.length === 0) {
            return res.status(404).send('User not found');
        }

        const user = results[0];

        // Compare hashed password
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) throw err;

            if (isMatch) {
                req.session.user = user;
                res.redirect(user.role === 'Admin' ? '/public/admin.html' : '/public/staff.html');
            } else {
                res.status(401).send('Incorrect password');
            }
        });
    });
});

module.exports = router;
