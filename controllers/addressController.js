import Address from "../models/Address.js";

// Add Address: /api/address/add (POST)
export const addAddress = async (req, res) => {
  try {
    const { address } = req.body;
    const userId = req.userId;  // ✅ From authUser middleware

    await Address.create({ ...address, userId });  // ✅ Save with userId

    res.json({ success: true, message: "Address added Successfully" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Get Address: /api/address/get (GET)
export const getAddress = async (req, res) => {
  try {
    const userId = req.userId;
    const addresses = await Address.find({ userId });

    res.json({ success: true, addresses });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
