import { LoginSchema, SignUpSchema } from '../zod/auth.schema';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../schemas/user.schema';
import BlacklistedToken from '../schemas/blacklist.schema';
import { FormatErrors } from '../utils';
import { sendErrorResponse } from '../utils/error-response';
import { sendSuccessResponse } from '../utils/sucess-response';
import { COOKIE_OPTION } from '../constants';

export async function handleUserSignup(req: Request, res: Response) {
  const result = SignUpSchema.safeParse(req.body);

  if (!result.success) {
    return sendErrorResponse({
      res,
      statusCode: 400,
      message: `zod error: ${FormatErrors(result.error)}`,
    });
  }

  const { fullname, email, password, username } = result.data;

  //check the username is available or not
  try {
    const isUsernameAvailable = await User.findOne({ username });
    if (isUsernameAvailable) {
      return sendErrorResponse({
        res,
        statusCode: 400,
        message: 'Username is already taken',
      });
    }
  } catch (error) {
    console.log('failed to check if username is available or not', error);
    return sendErrorResponse({
      res,
      statusCode: 500,
      message: 'Mongoose error',
    });
  }

  let userExists;

  try {
    userExists = await User.findOne({
      email,
    });
  } catch (error) {
    console.log('failed to check if user exists or not', error);
    return sendErrorResponse({
      res,
      statusCode: 500,
      message: 'Mongoose error',
    });
  }

  if (userExists) {
    return sendErrorResponse({
      res,
      statusCode: 400,
      message: 'User with this email already exists',
    });
  }

  // check if the username is available or not ( Try to use Bloom Filters )

  let newUser;
  try {
    newUser = await User.create({
      fullname,
      email,
      password,
      username,
    });
  } catch (error) {
    console.log('failed to create new user', error);
    return sendErrorResponse({
      res,
      statusCode: 500,
      message: 'Mongoose error',
    });
  }

  const payload = {
    _id: newUser._id,
    email,
    username: newUser.username,
  };

  const token = jwt.sign(payload, process.env.TOKEN_SECRET!, {
    expiresIn: '1d',
  });

  return sendSuccessResponse({
    res,
    statusCode: 201,
    message: 'New user created successfully',
    data: { token, payload },
    cookies: [
      {
        name: 'token',
        value: token,
        options: COOKIE_OPTION,
      },
    ],
  });
}

export async function handleUserLogin(req: Request, res: Response) {
  const result = LoginSchema.safeParse(req.body);

  if (!result.success) {
    console.log(result.error);
    return sendErrorResponse({
      res,
      statusCode: 400,
      message: `zod error: ${FormatErrors(result.error)}`,
    });
  }

  const { email, password } = result.data;

  let userExists;

  try {
    userExists = await User.findOne({
      email,
    }).select('+password');
  } catch (error) {
    console.log('failed to check if user exists or not', error);
    return sendErrorResponse({
      res,
      statusCode: 500,
      message: 'Mongoose error',
    });
  }

  if (!userExists) {
    return sendErrorResponse({
      res,
      statusCode: 400,
      message: 'User with this email does not exist',
    });
  }

  const isPasswordValid = userExists.comparePassword(password);

  if (!isPasswordValid) {
    return sendErrorResponse({
      res,
      statusCode: 400,
      message: 'Incorrect password',
    });
  }

  const payload = {
    _id: userExists._id,
    email,
    username: userExists.username,
  };

  const token = jwt.sign(payload, process.env.TOKEN_SECRET!, {
    expiresIn: '1d',
  });

  return sendSuccessResponse({
    res,
    statusCode: 200,
    message: 'Login successfull',
    data: { token, payload },
    cookies: [
      {
        name: 'token',
        value: token,
        options: COOKIE_OPTION,
      },
    ],
  });
}

export async function handleUserLogout(req: Request, res: Response) {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token) {
      return sendErrorResponse({
        res,
        statusCode: 400,
        message: 'No token found',
      });
    }

    const decodedToken = jwt.decode(token) as jwt.JwtPayload;

    if (!decodedToken || !decodedToken.exp) {
      return sendErrorResponse({
        res,
        statusCode: 400,
        message: 'Invalid token',
      });
    }

    await BlacklistedToken.create({
      token,
      expiresAt: new Date(decodedToken.exp * 1000),
    });

    res.clearCookie('token');

    return sendSuccessResponse({
      res,
      statusCode: 200,
      message: 'Logged out successfully. Please clear token from localStorage.',
      data: { clearLocalStorage: true },
    });
  } catch (err) {
    console.error(err);
    return sendErrorResponse({
      res,
      statusCode: 500,
      message: 'Logout failed',
    });
  }
}
