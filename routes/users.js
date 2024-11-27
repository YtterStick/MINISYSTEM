const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

// User Login
router.post("/login", (req, res) => {
    const { username, password } = req.body;
    const db = req.app.get("db");

    const query = "SELECT * FROM users WHERE username = ?";
    db.query(query, [username], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(400).send("User not found.");
        }

        const user = results[0];

        // Compare password with hashed password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(400).send("Invalid password.");
        }

        // Save user session with user id, role, branch_id
        req.session.user = { id: user.id, role: user.role, branch_id: user.branch_id };

        res.status(200).json({
            userId: user.id,
            role: user.role,
            branch_id: user.branch_id,
        });
    });
});


module.exports = router;
