/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();
const auth = admin.auth();
const db = admin.firestore();
const storage = admin.storage();

// Email transport configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Helper to generate verification codes
const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// **1. User Registration**
exports.register = functions.https.onRequest(async (req, res) => {
  const { userName, email, phoneNumber, password, method } = req.body; // method: 'email' or 'sms'

  try {
    // Check for existing user details
    const existingUsers = await db
      .collection("users")
      .where("userName", "==", userName)
      .get();
    if (!existingUsers.empty) {
      return res.status(400).json({ message: "User name already exists." });
    }

    // Firebase Authentication user creation
    const userRecord = await auth.createUser({
      email,
      password,
      phoneNumber: phoneNumber || undefined,
    });

    // Generate and save verification code
    const verificationCode = generateVerificationCode();
    const userData = {
      userName,
      email,
      phoneNumber,
      verificationCode,
      verified: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection("users").doc(userRecord.uid).set(userData);

    if (method === "email") {
      // Send verification email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verify Your Email",
        html: `<p>Hello ${userName},</p>
               <p>Use this code to verify your account: <b>${verificationCode}</b></p>`,
      };
      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: "Verification email sent." });
    } else if (method === "sms") {
      // Send verification SMS
      const smsMessage = `Your verification code is: ${verificationCode}`;
      // Placeholder: Implement SMS sending logic (e.g., Twilio or Firebase Phone Auth)
      console.log(`Send SMS to ${phoneNumber}: ${smsMessage}`);
      res.status(200).json({ message: "Verification SMS sent." });
    }
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ error: "Error registering user." });
  }
});

// **2. Resend Verification Code**
exports.resendVerificationCode = functions.https.onRequest(async (req, res) => {
  const { email, method } = req.body;

  try {
    const userSnapshot = await db
      .collection("users")
      .where("email", "==", email)
      .get();

    if (userSnapshot.empty) {
      return res.status(404).json({ message: "User not found." });
    }

    const userDoc = userSnapshot.docs[0];
    const user = userDoc.data();

    if (user.verified) {
      return res.status(400).json({ message: "User is already verified." });
    }

    // Generate a new verification code
    const verificationCode = generateVerificationCode();
    await userDoc.ref.update({ verificationCode });

    if (method === "email") {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Resend Verification Code",
        html: `<p>Hello ${user.userName},</p>
               <p>Here is your new verification code: <b>${verificationCode}</b></p>`,
      };
      await transporter.sendMail(mailOptions);
      res.status(200).json({ message: "Verification email resent." });
    } else if (method === "sms") {
      const smsMessage = `Your new verification code is: ${verificationCode}`;
      // Placeholder: Implement SMS sending logic
      console.log(`Resend SMS to ${user.phoneNumber}: ${smsMessage}`);
      res.status(200).json({ message: "Verification SMS resent." });
    }
  } catch (error) {
    console.error("Error resending verification code:", error);
    res.status(500).json({ error: "Error resending verification code." });
  }
});

// **3. Update User Profile (with Image Upload)**
exports.updateUserProfile = functions.https.onRequest(async (req, res) => {
  const { uid, userName, email, phoneNumber } = req.body;
  const file = req.files?.image; // Assuming the frontend sends the image as 'image'

  try {
    // Upload image to Firebase Storage if provided
    let imageUrl;
    if (file) {
      const bucket = storage.bucket();
      const filePath = `profileImages/${uid}-${Date.now()}`;
      const fileUpload = bucket.file(filePath);

      await fileUpload.save(file.data, {
        metadata: { contentType: file.mimetype },
      });

      // Generate a signed URL for the image
      imageUrl = await fileUpload.getSignedUrl({
        action: "read",
        expires: "03-01-2500",
      });
    }

    // Update user profile in Firestore
    const userRef = db.collection("users").doc(uid);
    const updates = { userName, email, phoneNumber };
    if (imageUrl) updates.imageUrl = imageUrl;

    await userRef.update(updates);

    res.status(200).json({ message: "Profile updated successfully.", imageUrl });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Error updating user profile." });
  }
});

// **4. Forgot Password**
exports.forgotPassword = functions.https.onRequest(async (req, res) => {
  const { email } = req.body;

  try {
    await auth.generatePasswordResetLink(email);
    res.status(200).json({ message: "Password reset email sent." });
  } catch (error) {
    console.error("Error sending password reset email:", error);
    res.status(500).json({ error: "Error sending password reset email." });
  }
});

