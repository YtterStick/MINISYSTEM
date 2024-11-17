const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    const db = req.app.get("db");

    const query = "SELECT id, username, role, branch FROM users";
    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching accounts:", err);
            return res.status(500).json({ error: "Failed to fetch accounts" });
        }

        res.json(results);
    });
});

module.exports = router;
