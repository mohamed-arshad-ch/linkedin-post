// app.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const querystring = require('querystring');

const app = express();

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;
const STATE = 'werdersAss'; // You can generate a unique random string for security.

// Step 1: Redirect the user to LinkedIn's OAuth 2.0 authorization page
app.get('/auth/linkedin', (req, res) => {
  const authorizationUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&state=${STATE}&scope=profile`;
  
  res.redirect(authorizationUrl);
});

// Step 2: Handle LinkedIn OAuth 2.0 callback
app.get('/auth/linkedin/callback', async (req, res) => {
  const { code, state,error,error_description } = req.query;

  if(error){
    return res.status(400).send(`Error on ${error_description}`)
  }
  // Validate the state parameter to prevent CSRF attacks
  if (state !== STATE) {
    return res.status(400).send('State mismatch. Potential CSRF attack.');
  }

  if (!code) {
    return res.status(400).send('Authorization code not provided.');
  }

  try {
    // Step 3: Exchange the authorization code for an access token
    const tokenResponse = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      querystring.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenResponse.data.access_token;

    // Step 4: Use the access token to fetch user profile and email
    const profileResponse = await axios.get('https://api.linkedin.com/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const emailResponse = await axios.get(
      'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const userProfile = profileResponse.data;
    const userEmail = emailResponse.data.elements[0]['handle~'].emailAddress;

    // Display the user's LinkedIn profile and email in the response
    res.status(200).json({
      profile: userProfile,
      email: userEmail,
      message: 'Successfully authenticated with LinkedIn',
    });
  } catch (error) {
    console.log(error.response);
    
    console.error('Error exchanging code for access token:', error.response?.data);
    res.status(500).send('Failed to exchange authorization code for access token.');
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
