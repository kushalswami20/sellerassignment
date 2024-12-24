const express = require('express');
const bcrypt = require('bcrypt');
const Seller = require('../models/seller'); // Adjust the path to your Seller schema
const router = express.Router();
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const dotenv = require('dotenv');
const { verify } = require('jsonwebtoken');
dotenv.config();


// Seller Login
router.post('/login', async (req, res) => {
  try {
    const { sellerId, emailOrPhone, password } = req.body;

    // Validate required fields
    if (!sellerId || !emailOrPhone || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Seller ID, email/phone, and password are required'
      });
    }

    // Find seller by ID and email/phone
    const seller = await Seller.findOne({
      sellerId,
      $or: [
        { email: emailOrPhone },
        { phoneNumber: emailOrPhone }
      ]
    });

    if (!seller) {
      return res.status(400).json({
        error: 'Invalid credentials',
        details: 'No seller found with provided ID and email/phone'
      });
    }

    // Check if email/phone is verified
    if (!seller.emailVerified && !seller.phoneVerified) {
      return res.status(401).json({
        error: 'Account not verified',
        details: 'Please verify your email or phone number before logging in'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, seller.password);
    if (!isMatch) {
      return res.status(400).json({
        error: 'Invalid credentials',
        details: 'Incorrect password provided'
      });
    }
    // Update loggedIn status
    seller.loggedIn = 'loggedin';
    await seller.save();
    // Store sellerId in session
    req.session.sellerId = sellerId;
    res.status(200).json({
      success: true,
      message: 'Login successful',
      sellerId,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error logging in',
      details: error.message
    });
  }
});

// Seller Signup
router.post('/seller/signup', async (req, res) => {
  try {
    const { phoneNumber, emailId, password } = req.body;

    // Check if seller already exists
    const existingSeller = await Seller.findOne({ email: emailId });
    if (existingSeller) {
      return res.status(400).json({ error: 'Seller already exists' });
    }

    // Generate unique seller ID (MBSLR + 5 digits)
    let sellerId;
    let isUnique = false;
    while (!isUnique) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      sellerId = `MBSLR${randomNum}`;
      const existingId = await Seller.findOne({ sellerId });
      if (!existingId) isUnique = true;
    }

    // Create new seller with required fields from schema
    const seller = new Seller({
      name: 'Not Available',
      email: emailId,
      password: password,
      sellerId: sellerId,
      emailVerified: false,
      phoneVerified: false,
      phoneNumber: phoneNumber,
      businessName: 'Not Available',
      businessAddress: 'Not Available',
      businessType: 'Not Available'
    });

    await seller.save();

    // Store sellerId in session
    req.session.sellerId = sellerId;

    res.status(201).json({
      message: 'Seller registered successfully',
      sellerId
    });
  } catch (err) {
    res.status(500).json({
      error: 'Error registering seller',
      message: err.message
    });
  }
});

// <----------------------------------------------------------seller otp verification start----------------------------------------------------------->

//seller otp verification
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use TLS
  auth: {
    type: "login",
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  },
  tls: {
    rejectUnauthorized: false // Don't fail on invalid certs
  },
  debug: true // Enable debug logs
});

// Verify transporter configuration immediately
transporter.verify((error, success) => {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send emails');
  }
});

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP for both email and phone verification after signup
router.post('/send-otp', async (req, res) => {
  try {
    const { sellerId } = req.body;

    if (!sellerId) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Seller ID is required'
      });
    }

    const seller = await Seller.findOne({ sellerId });
    if (!seller) {
      return res.status(404).json({
        error: 'Seller not found'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    seller.otp = otp;
    await seller.save();

    console.log('Attempting to send email with following configuration:');
    console.log('Email User:', process.env.EMAIL_USER);
    console.log('Email Pass Length:', process.env.EMAIL_APP_PASSWORD ? process.env.EMAIL_APP_PASSWORD.length : 0);

    // Send email with detailed error handling
    try {
      const mailOptions = {
        from: {
          name: 'Your Company Name',
          address: process.env.EMAIL_USER
        },
        to: seller.email,
        subject: 'Account Verification OTP',
        text: `Your OTP for account verification is: ${otp}. Please use this OTP to verify both your email and phone number.`,
        html: `
          <h1>Account Verification OTP</h1>
          <p>Your OTP for account verification is: <strong>${otp}</strong></p>
          <p>Please use this OTP to verify both your email and phone number.</p>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log('Email sent successfully');

    } catch (emailError) {
      console.error('Detailed email error:', emailError);
      throw new Error(`Email sending failed: ${emailError.message}`);
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to email'
    });

  } catch (error) {
    console.error('Full error object:', error);
    res.status(500).json({
      error: 'Error sending OTP',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Verify Email
router.post('/verify-otp', async (req, res) => {
  try {
    const { sellerId, otp } = req.body;

    if (!sellerId || !otp) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Seller ID and OTP are required'
      });
    }

    const seller = await Seller.findOne({ sellerId });
    if (!seller) {
      return res.status(404).json({
        error: 'Seller not found'
      });
    }

    if (!seller.otp) {
      return res.status(400).json({
        error: 'No OTP found',
        details: 'Please request a new OTP'
      });
    }

    if (seller.otp !== otp) {
      return res.status(400).json({
        error: 'Invalid OTP'
      });
    }

    seller.emailVerified = true;
    await seller.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error verifying email',
      details: error.message
    });
  }
});

// Verify Phone
router.post('/verify-phone', async (req, res) => {
  try {
    const { sellerId, otp } = req.body;

    if (!sellerId || !otp) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Seller ID and OTP are required'
      });
    }

    const seller = await Seller.findOne({ sellerId });
    if (!seller) {
      return res.status(404).json({
        error: 'Seller not found'
      });
    }

    if (!seller.otp) {
      return res.status(400).json({
        error: 'No OTP found',
        details: 'Please request a new OTP'
      });
    }

    if (seller.otp !== otp) {
      return res.status(400).json({
        error: 'Invalid OTP'
      });
    }

    seller.phoneVerified = true;
    await seller.save();

    // Clear OTP after both email and phone are verified
    if (seller.emailVerified && seller.phoneVerified) {
      seller.otp = undefined;
      await seller.save();
    }

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error verifying phone number',
      details: error.message
    });
  }
});

// <----------------------------------------------------------------seller otp verification end-------------------------------------------->





router.post('/verify-seller', async (req, res) => {
  try {
    const { sellerId } = req.body;

    if (!sellerId) {
      return res.status(400).json({
        success: false,
        message: 'Seller ID is required'
      });
    }

    // Find seller by sellerId
    const seller = await Seller.findOne({ sellerId });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: 'Invalid seller ID'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Valid seller ID',
      emailVerified: seller.emailVerified,
      phoneVerified: seller.phoneVerified,
      loggedIn: seller.loggedIn
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying seller ID',
      error: error.message
    });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { sellerId } = req.body;

    if (!sellerId) {
      return res.status(400).json({
        error: 'Seller ID is required'
      });
    }

    const seller = await Seller.findOne({ sellerId });
    
    if (!seller) {
      return res.status(404).json({
        error: 'Seller not found'
      });
    }

    seller.loggedIn = 'loggedout';
    await seller.save();

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Error logging out' });
      }
      res.clearCookie('connect.sid');
      res.json({ 
        success: true,
        message: 'Seller logged out successfully',
        loggedIn: 'loggedout'
      });
    });

  } catch (error) {
    res.status(500).json({
      error: 'Error logging out',
      details: error.message
    });
  }
});

module.exports = router;
