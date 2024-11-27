const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/auth"); // Assuming you're using the role middleware here

// Route to get all accounts (accessible to admins only)
router.get("/", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");

    // Query to fetch users with their corresponding branch names
    const query = `
        SELECT u.id, u.username, u.role, b.name AS branch_name
        FROM users u
        LEFT JOIN branches b ON u.branch_id = b.id;
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching accounts:", err);
            return res.status(500).json({ error: "Failed to fetch accounts" });
        }

        res.json(results);
    });
});

// Route to create a new account (accessible to admins)
router.post("/", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");
    const { username, password, role, branch_id } = req.body;

    // Basic validation for required fields
    if (!username || !password || !role || !branch_id) {
        return res.status(400).json({ error: "All fields are required" });
    }

    // Insert query to create a new user
    const query = `
        INSERT INTO users (username, password, role, branch_id)
        VALUES (?, ?, ?, ?)
    `;
    
    db.query(query, [username, password, role, branch_id], (err, result) => {
        if (err) {
            console.error("Error creating account:", err);
            return res.status(500).json({ error: "Failed to create account" });
        }

        res.status(201).json({ message: "Account created successfully", userId: result.insertId });
    });
});


router.put("/:id", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");
    const { username, password, role, branch_id } = req.body;
    const userId = req.params.id;

    
    const query = `
        UPDATE users
        SET username = ?, password = ?, role = ?, branch_id = ?
        WHERE id = ?
    `;
    
    db.query(query, [username, password, role, branch_id, userId], (err, result) => {
        if (err) {
            console.error("Error updating account:", err);
            return res.status(500).json({ error: "Failed to update account" });
        }

        res.json({ message: "Account updated successfully" });
    });
});


router.delete("/:id", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");
    const userId = req.params.id;

    // Delete query for removing a user
    const query = "DELETE FROM users WHERE id = ?";

    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error("Error deleting account:", err);
            return res.status(500).json({ error: "Failed to delete account" });
        }

        res.json({ message: "Account deleted successfully" });
    });
});

module.exports = router;
