// LoggingMiddleware/logger.js
const logger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    console.log(`[${timestamp}] ${method} ${url}`);
    console.log(`IP: ${ip}`);
    console.log(`User-Agent: ${userAgent}`);
    
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Request Body:', JSON.stringify(req.body));
    }
    
    // Capture response
    const originalSend = res.send;
    res.send = function(data) {
        console.log(`Response Status: ${res.statusCode}`);
        console.log('Response Body:', data);
        console.log('-------------------');
        return originalSend.call(this, data);
    };
    
    next();
};

module.exports = logger;