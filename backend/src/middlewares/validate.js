export const validatePatient = (req, res, next) => {
  const { patientName, phoneNumber } = req.body;

  if (!patientName) {
    return res.status(400).json({
      success: false,
      error: 'patientName is required'
    });
  }

  if (typeof patientName !== 'string' || patientName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'patientName must be a string with at least 2 characters'
    });
  }

  if (patientName.length > 50) {
    return res.status(400).json({
      success: false,
      error: 'patientName cannot exceed 50 characters'
    });
  }

  req.body.patientName = patientName.trim();

  if (phoneNumber !== undefined) {
    if (typeof phoneNumber !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber must be a string'
      });
    }
    req.body.phoneNumber = phoneNumber.trim();
  }

  next();
};

export const validateSettings = (req, res, next) => {
  const { averageConsultationTime } = req.body;

  if (averageConsultationTime === undefined) {
    return res.status(400).json({
      success: false,
      error: 'averageConsultationTime is required'
    });
  }

  const timeNum = Number(averageConsultationTime);

  if (!Number.isInteger(timeNum) || timeNum < 1 || timeNum > 180) {
    return res.status(400).json({
      success: false,
      error: 'averageConsultationTime must be an integer between 1 and 180 minutes'
    });
  }

  req.body.averageConsultationTime = timeNum;
  next();
};
