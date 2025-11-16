import jwt from 'jsonwebtoken';

const authSeller = async (req, res, next) => {
  try {
    const { sellerToken } = req.cookies;

    if (!sellerToken) {
      return res.status(401).json({ success: false, message: 'Not Authorized (No token)' });
    }

    // 🔐 Verify token
    const tokenDecoded = jwt.verify(sellerToken, process.env.JWT_SECRET);

    // 🔎 Check if it's the seller
    if (tokenDecoded.email === process.env.SELLER_EMAIL) {
      req.sellerId = tokenDecoded.email; // ✅ optional: attach seller identity
      return next();
    } else {
      return res.status(403).json({ success: false, message: 'Not Authorized (Invalid seller)' });
    }
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

export default authSeller;
