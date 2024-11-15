const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');

const PORT = 3000;
const app = express();


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'css', 'assets', and 'scripts' directories
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));

// Session setup
app.use(
    session({
        secret: 'secret-key',
        resave: false,
        saveUninitialized: true,
    })
);

// MySQL database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'starwash_db',
});

db.connect(err => {
    if (err) throw err;
    console.log('Connected to MySQL');
});

// Route to serve main pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main', 'login.html')); // Default login page
});

app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, 'main', 'index.html')); // Dashboard page
});

app.get('/staff', (req, res) => {
    res.sendFile(path.join(__dirname, 'main', 'staff.html')); // Staff page
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, results) => {
            if (err) throw err;

            if (results.length === 0) {
                return res.status(400).send('User not found');
            }

            const user = results[0];

            // Check password
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) throw err;

                if (isMatch) {
                    req.session.user = user;
                    console.log(req.session);
                    // Redirect based on user role
                    if (user.role === 'Admin') {
                        res.redirect('/index.html');
                    } else if (user.role === 'Staff') {
                        res.redirect('/staff.html   ');
                    }
                } else {
                    res.status(400).send('Incorrect password');
                }
            });
        }
    );
});

// Start server
app.listen(PORT, () => {
    console.log(`SERVER IS RUNNING on http://localhost:${PORT}`);
});
