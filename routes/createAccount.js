const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

router.post('/', (req, res) => {
    const db = req.app.get('db');
    const { username, role, branch, password } = req.body;

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            return res.status(500).send('Error hashing password');
        }

        const sql = 'INSERT INTO users (username, role, branch, password) VALUES (?, ?, ?, ?)';
        db.query(sql, [username, role, branch, hash], (err, result) => {
            if (err) {
                console.error('Error inserting into database:', err);
                return res.status(500).send('Error creating account');
            }
            res.status(200).send('Account created successfully');
        });
    });
});

module.exports = router;
