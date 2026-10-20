const errorHandler = (err, req, res, next) => {
  console.error('API Error Intercepted:', err);

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: messages.join(', ')
    });
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(', ') || 'field';
    return res.status(400).json({
      success: false,
      error: `Duplicate value entered for ${field}. Please use another value.`
    });
  }

  // Cast Error (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Invalid formatted value for ${err.path}`
    });
  }

  // General Error fallback
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    error: message
  });
};

export default errorHandler;
