const checkHealth = (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      service: "SALESTORM Backend",
      status: "healthy"
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkHealth
};
