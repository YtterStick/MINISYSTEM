// Middleware to check if the user is authenticated and has a specific role
function isAuthenticated(role) {
    return function (req, res, next) {
        if (req.session && req.session.user) {
            // Ensure that the session has the correct role
            if (role && req.session.user.role !== role) {
                return res.status(403).send("Forbidden: You do not have the required role");
            }
            return next(); // User is authenticated and has the required role, proceed to the next middleware
        } else {
            res.status(401).send("User not authenticated");
        }
    };
}

module.exports = isAuthenticated;
