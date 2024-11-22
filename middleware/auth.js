// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    // Check if the session contains user data
    if (req.session && req.session.user) {
        return next(); // User is authenticated, proceed to the next middleware
    } else {
        // User is not authenticated, send a 401 Unauthorized response
        res.status(401).send("User not authenticated");
    }
}

module.exports = isAuthenticated;
