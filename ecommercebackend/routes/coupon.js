const express = require('express');
const router = express.Router();
const Coupon = require('../models/couponmodel');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const User = require('../models/user'); // Adjust the path to your actual User model file
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,  secure: false,// Convert string to boolean
  auth: {
    type: "login",
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  },
  debug: true
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send emails');
  }
});


const sendCouponToAllUsers = async (code, discountPercentage) => {
  console.log('Starting sendCouponToAllUsers with:', { code, discountPercentage }); // Debug log
  
  try {
    // Fetch all user emails
    const users = await User.find({}, 'email');
    console.log('Found users:', users.length); // Debug log

    // Email content
    const subject = '🎉 Special Discount Coupon Just for You!';
    const message = `
      Hello valued customer!
      
      We're excited to offer you a special discount on your next purchase!
      
      Your Coupon Code: ${code}
      Discount: ${discountPercentage}% off
      
      How to use your coupon:
      1. Add items to your cart
      2. Enter the coupon code at checkout
      3. Enjoy your savings!
      
      This is our way of saying thank you for being a part of our community.
      
      Happy Shopping!
      Best regards,
      The Mera Bestie Team
    `;

    // Send emails to all users
    const emailPromises = users.map(user => 
      transporter.sendMail({
        from: {
          name: 'Your Company Name',
          address: process.env.EMAIL_USER
        },
        to: user.email,
        subject: subject,
        text: message
      }).catch(error => {
        console.error(`Failed to send email to ${user.email}:`, error);
        return { error, email: user.email };
      })
    );
    
    const results = await Promise.all(emailPromises);
    const failedEmails = results.filter(result => result && result.error);
    const successCount = users.length - failedEmails.length;

    console.log('Email sending completed:', { 
      successCount, 
      failedCount: failedEmails.length 
    }); // Debug log

    return {
      success: true,
      totalUsers: users.length,
      successfulEmails: successCount,
      failedEmails: failedEmails.length,
      failedEmailAddresses: failedEmails.map(f => f.email)
    };

  } catch (error) {
    console.error('Error in sendCouponToAllUsers:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
router.post('/save-coupon', async (req, res) => {
  try {
    const { code, discountPercentage } = req.body;
    
    console.log('Received request body:', req.body); // Debug log

    // Validate inputs
    if (!code || !discountPercentage) {
      return res.status(400).json({ 
        success: false, 
        error: 'Coupon code and discount percentage are required' 
      });
    }

    // First try to save the coupon
    try {
      const newCoupon = new Coupon({
        code,
        discountPercentage: Number(discountPercentage)
      });
      await newCoupon.save();
      console.log('Coupon saved successfully:', newCoupon); // Debug log
    } catch (saveError) {
      console.error('Error saving coupon:', saveError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save coupon',
        details: saveError.message
      });
    }

    // Then try to send emails
    try {
      const emailResult = await sendCouponToAllUsers(code, discountPercentage);
      console.log('Email result:', emailResult); // Debug log

      if (emailResult.success) {
        return res.status(200).json({
          success: true,
          ...emailResult
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to send emails',
          details: emailResult.error
        });
      }
    } catch (emailError) {
      console.error('Error sending emails:', emailError);
      return res.status(500).json({
        success: false,
        error: 'Failed to send emails',
        details: emailError.message
      });
    }

  } catch (error) {
    console.error('Error in save-coupon route:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process coupon distribution',
      details: error.message
    });
  }
});
  
  // Get all coupons route
  router.get('/get-coupon', async (req, res) => {
    try {
      const coupons = await Coupon.find();
      res.status(200).json({
        success: true,
        coupons
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching coupons',
        error: error.message
      });
    }
  });
  
  
  
  // Verify coupon route
  router.post('/verify-coupon', async (req, res) => {
    try {
      const { code } = req.body;
      
      const coupon = await Coupon.findOne({ code });
      
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Invalid coupon code'
        });
      }
  
      res.status(200).json({
        success: true,
        discountPercentage: coupon.discountPercentage
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error verifying coupon',
        error: error.message
      });
    }
  });
  
  // Delete coupon route
  router.delete('/delete-coupon', async (req, res) => {
    try {
      const { code, discountPercentage } = req.body;
      
      const deletedCoupon = await Coupon.findOneAndDelete({ 
        code,
        discountPercentage 
      });
  
      if (!deletedCoupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }
  
      // Send email to all users about expired coupon
      const subject = 'Coupon Expired';
      const message = `The coupon ${code} with ${discountPercentage}% discount has expired.`;
      await sendEmailToAllUsers(subject, message);
  
      res.status(200).json({
        success: true,
        message: 'Coupon deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting coupon',
        error: error.message
      });
    }
  });

  module.exports = router
  
