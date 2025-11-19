import { LoginSchema, SignUpSchema } from '../zod/auth.schema';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../schemas/user.schema';
import BlacklistedToken from '../schemas/blacklist.schema';

export async function handleUserSignup(req: Request, res: Response) {
  const result = SignUpSchema.safeParse(req.body);

  if (!result.success) {
    const error = JSON.stringify(result.error);
    return res.status(400).json({ message: `zod error: ${JSON.stringify(error)}`});
  }

  const { email, password, username } = result.data;
  
  //check the username is available or not
  try {
    const isUsernameAvailable = await User.findOne({username});
    if(isUsernameAvailable){
      return res.status(400).json({message: 'Username is already taken'})
    }
  } catch (error) {
    console.log('failed to check if username is available or not', error);
    return res.status(500).json({ message: 'Mongoose error' });
  }

  let userExists;

  try {
    userExists = await User.findOne({
      email,
    });
  } catch (error) {
    console.log('failed to check if user exists or not', error);
    return res.status(500).json({ message: 'Mongoose error' });
  }

  if (userExists) {
    return res
      .status(400)
      .json({ message: 'User with this email already exists' });
  }

  let user;
  // check if the username is available or not ( Try to use Bloom Filters )
  // hash the password

  try {
    user = await User.create({
      email,
      password,
      username,
    });
  } catch (error) {
    console.log('failed to create new user', error);
    return res.status(500).json({ message: 'Mongoose error' });
  }

  return res
    .status(201)
    .json({ message: 'New user created successfully', user });
}

export async function handleUserLogin(req: Request, res: Response) {
  const result = LoginSchema.safeParse(req.body);

  if (!result.success) {
    const error = JSON.stringify(result.error);
    return res.status(400).json({ message: `zod error: ${JSON.parse(error)}` });
  }

  const { email, password } = result.data;

  let userExists;

  try {
    userExists = await User.findOne({
      email,
    }).select('+password');
  } catch (error) {
    console.log('failed to check if user exists or not', error);
    return res.status(500).json({ message: 'Mongoose error' });
  }

  if (!userExists) {
    return res
      .status(400)
      .json({ message: 'user with this email does not exists' });
  }

  const isPasswordValid = userExists.password === password;

  if (!isPasswordValid) {
    return res.status(400).json({ message: 'Incorrect Password' });
  }

  const payload = {
    _id: userExists._id,
    email,
    username: userExists.username,
  };

  const token = jwt.sign(payload, process.env.TOKEN_SECRET!, {
    expiresIn: '1d',
  });

  return res
    .status(200)
    .cookie('token', token, {
      httpOnly: true,
      sameSite: "none", // since our backend is on 8001 and FE on 3000
      secure: false
    })
    .json({ message: 'Login successfull', token, user: {email, username: userExists.username} });
}

export async function handleUserLogout(req: Request, res: Response) {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token) {
      return res.status(400).json({ message: 'No token found' });
    }

    const decodedToken = jwt.decode(token) as jwt.JwtPayload;
    console.log(decodedToken);

    if (!decodedToken || !decodedToken.exp) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    await BlacklistedToken.create({
      token,
      expiresAt: new Date(decodedToken.exp * 1000),
    });

    res.clearCookie('token');

    res.status(200).json({
      message: 'Logged out successfully. Please clear token from localStorage.',
      clearLocalStorage: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Logout failed' });
  }
}
