const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/style', express.static(path.join(__dirname, 'style')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));
app.use('/main', express.static(path.join(__dirname, 'main')));

app.use(
    session({
        secret: 'secret-key',
        resave: false,
        saveUninitialized: true,
    })
);

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

app.set('db', db);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main', 'login.html'));
});
app.use("/api/accounts", require("./routes/accounts"));
app.use('/create-account', require('./routes/createAccount'));
app.use('/login', require('./routes/login'));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
