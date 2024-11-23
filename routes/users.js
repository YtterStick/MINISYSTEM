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
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(400).send("Invalid password.");
        }

        // Save user session
        req.session.user = { id: user.id, role: user.role };

        // Send the role to the frontend
        res.status(200).json({ userId: user.id, role: user.role });
    });
});


module.exports = router;
