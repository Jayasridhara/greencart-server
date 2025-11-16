import jwt from "jsonwebtoken";

const authUser = async (req, res, next) => {
 const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Not Authorized (no token)" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.id) {
      req.userId = decoded.id;
      next();
    } else {
      return res.status(403).json({ success: false, message: "Invalid token payload" });
    }
  } catch (error) {
    return res.status(401).json({ success: false, message: "Token verification failed" });
  }
};

export default authUser;
