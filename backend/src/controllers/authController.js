import jwt from 'jsonwebtoken';
import { User, Company } from '../models/index.js';
import { hashPassword, comparePassword } from '../utils/encryption.js';

// Register new company and admin user
export const register = async (req, res, next) => {
  try {
    const { companyName, email, password, firstName, lastName, industry, size } = req.body;

    // Create company
    const company = await Company.create({
      name: companyName,
      email,
      industry: industry || 'technology',
      size: size || 'small',
      agentSettings: {
        enabledAgents: ['log_intelligence', 'crash_diagnostic', 'anomaly_detection', 'recommendation'],
      },
    });

    // Create admin user
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      company: company._id,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: 'admin',
      permissions: ['view_dashboard', 'manage_agents', 'execute_workflows', 'view_analytics', 'manage_company', 'manage_users'],
    });

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: user._id, email: user.email, firstName, lastName, role: user.role },
      company: { id: company._id, name: company.name },
    });
  } catch (error) {
    next(error);
  }
};

// Login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, isActive: true }).select('+password').populate('company');

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    res.json({
      token,
      user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      company: { id: user.company._id, name: user.company.name },
    });
  } catch (error) {
    next(error);
  }
};

// Get current user
export const getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate('company');
  res.json({ user });
};

// Update password
export const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};
