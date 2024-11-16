const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

router.post("/", (req, res) => {
  const db = req.app.get("db");
  const { username, password } = req.body;

  const sql = "SELECT * FROM users WHERE username = ?";
  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Server error");
    }

    if (results.length === 0) {
      return res.status(404).send("User not found");
    }

    const user = results[0];

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Error validating password");
      }

      if (isMatch) {
        // Set session data
        req.session.user = {
          id: user.id,
          username: user.username,
          role: user.role,
          branch: user.branch,
        };

        if (user.role === "Admin") {
          res.status(200).send("/main/index.html");
        } else if (user.role === "Branch") {
          res.status(200).send("/main/staff.html"); 
        }
      } else {
        res.status(401).send("Invalid password");
      }
    });
  });
});

module.exports = router;
