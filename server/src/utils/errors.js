function createHttpError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
}

function assertSupabase(result, fallbackMessage = "Database request failed") {
  if (result.error) {
    throw createHttpError(500, result.error.message || fallbackMessage, result.error);
  }

  return result.data;
}

module.exports = {
  assertSupabase,
  createHttpError
};
