import createError from "http-errors";

export const roleGuard = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(createError(403, "You do not have permission to perform this action"));
  }

  next();
};
