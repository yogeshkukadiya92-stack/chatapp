function notFoundHandler(req, res, next) {
  res.status(404).json({
    error: "Not found",
    path: req.originalUrl
  });
}

function errorHandler(error, req, res, next) {
  const status = error.status || 500;

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    error: error.message || "Internal server error",
    details: process.env.NODE_ENV === "development" ? error.details : undefined
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
