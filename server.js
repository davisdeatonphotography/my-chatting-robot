const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const fs = require('fs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
secret: 'secret-key',
resave: false,
saveUninitialized: true
}));
app.use(express.static(path.join(__dirname, '.')));

// User credentials for authentication
let users = [];
try {
users = JSON.parse(fs.readFileSync('./users.json'));
} catch (err) {
console.error('Failed to load user data', err);
}

// Authenticate user
function authenticateUser(username, password) {
const user = users.find((user) => user.username === username);
if (user && bcrypt.compareSync(password, user.password)) {
return user;
}
return null;
}

// Middleware to check if user is authenticated
function checkAuthentication(req, res, next) {
if (req.session && req.session.authenticated) {
next();
} else {
res.redirect('/login');
}
}

app.get('/', checkAuthentication, (req, res) => {
res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/login', (req, res) => {
res.sendFile(path.join(__dirname + '/login.html'));
});

app.post('/login', (req, res) => {
const { username, password } = req.body;
const user = authenticateUser(username, password);
if (user) {
req.session.authenticated = true;
req.session.username = user.username;
res.redirect('/');
} else {
res.redirect('/login');
}
});

app.get('/register', (req, res) => {
res.sendFile(path.join(__dirname, '/register.html'));
});

app.post('/register', (req, res) => {
const { username, password } = req.body;
const hashedPassword = bcrypt.hashSync(password, 10);
users.push({ username, password: hashedPassword });
fs.writeFileSync('./users.json', JSON.stringify(users));
res.redirect('/login');
});

app.get('/logout', (req, res) => {
req.session.destroy();
res.redirect('/login');
});

// Chat history route
app.get('/chat-history', checkAuthentication, (req, res) => {
// Retrieve chat history for the authenticated user
// ...
const chatHistory = [
{ role: 'user', content: 'Hello!' },
{ role: 'bot', content: 'Hi there! How can I assist you today?' },
{ role: 'user', content: 'I need help with a programming problem.' },
{ role: 'bot', content: 'Sure! What problem are you facing?' }
];
res.json(chatHistory);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server is listening on port ${port}...`));
