export function attachResponseHelpers(_req, res, next) {
  res.success = (data = {}, message = 'OK', statusCode = 200) => {
    const payload =
      data && typeof data === 'object' && !Array.isArray(data) ? data : { value: data };
    return res.status(statusCode).json({
      success: true,
      message,
      data: payload,
      ...payload,
    });
  };

  next();
}
