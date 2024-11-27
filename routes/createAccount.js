const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

router.post("/", (req, res) => {
    const { username, role, branch, password } = req.body;
    
    if (role !== "Admin" && role !== "Staff") {
        return res.status(400).send("Invalid role provided");
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error hashing password");
        }

        const sql = 'INSERT INTO users (username, role, branch_id, password) VALUES (?, ?, ?, ?)';
        
        const branchId = branch;  
        const db = req.app.get("db");
        db.query(sql, [username, role, branchId, hash], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error creating account");
            }
            console.log(branchId);
            res.status(200).send("Account created successfully");
        });
    });
});

module.exports = router;
